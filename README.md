# KAM사절차

실제 감사보고서에 실린 핵심감사사항(KAM, Key Audit Matters) 사례를 업종·카테고리·회계법인별로 정리한 학습 자료입니다. 실무 참고와 회계법인 면접 준비를 목표로 만들었습니다.

[kam-service.vercel.app](https://kam-service.vercel.app)

## 무엇을 할 수 있나요

- **기업으로 찾기**: 회사 이름을 검색하면 그 회사의 감사보고서에 실린 핵심감사사항과 감사절차 체크리스트를 확인합니다.
- **업종으로 찾기**: 업종을 선택하면 그 업종에서 실제로 어떤 카테고리가 얼마나 자주 KAM으로 선정됐는지 비중과 함께 봅니다.
- **회계법인으로 찾기**: 회계법인을 선택하면 2026년 1분기보고서 기준 현재 그 법인이 감사인인 회사를 업종별로 봅니다.
- 각 사례는 관련 감사기준서·회계기준서 원문, DART에 공시된 사업보고서·감사보고서 원문으로 바로 연결됩니다.

## 데이터는 어떻게 만들어졌나요

수집·정제 파이프라인(`ingestion/`, Python)과 서비스 앱(`src/`, Next.js)이 분리되어 있습니다. 파이프라인은 로컬 SQLite(`local.db`)에 적재하고, 완성된 데이터만 Turso(프로덕션 DB)로 옮겨 앱이 읽습니다.

1. **원문 수집**: DART(전자공시시스템) OpenAPI를 Python(`requests`)으로 호출해 상장사 목록·업종코드(KSIC)·감사인 공시·감사보고서 공시 목록을 가져옵니다(`ingestion/dart_client.py`).
2. **KAM 섹션 추출**: 감사보고서 원문(HTML)에서 핵심감사사항 섹션 텍스트를 그대로 파싱해 로컬 DB에 적재합니다(`ingestion/kam_parser.py`, `ingest_kam_pilot.py`). 12월 결산법인만 우선 다룹니다.
3. **정제·분류**: 추출된 원문을 Claude API(Anthropic SDK, `claude-sonnet-5`)로 정제해 카테고리, 요약, 감사절차, 관련 감사기준서·회계기준서 인용을 만듭니다(`ingestion/classify_kam.py` → `kam_items` 테이블). 각 항목에는 confidence 값을 함께 저장합니다.
4. **감사절차 보강**: 카테고리별 핵심 실증절차는 한국공인회계사회(한공회) 표준조서 "4000 계정별 실증절차"의 절차 항목명만 요약 인용합니다(`src/lib/auditProcedureReferences.ts`, 전체 조서 문단을 그대로 옮기지 않습니다).
5. **감사인 갱신**: 사업보고서에 적힌 감사인은 제출 시점 기준이라 지금과 다를 수 있어, DART 분기보고서 공시를 다시 조회해 2026년 1분기보고서 기준 현재 감사인으로 별도 정리합니다(`company_auditors`).
6. **배포**: `scripts/migrate-to-turso.mjs`(Node)로 로컬 SQLite 내용을 Turso로 옮기면, Vercel에 배포된 Next.js 앱이 Drizzle ORM으로 그 데이터를 읽습니다.

## 알아두면 좋은 한계

- 모든 상장사를 커버하지 않습니다. 수집된 KAM 사례가 있는 회사만 대상이고, 12월 결산법인 위주입니다.
- 업종 구분은 DART가 제공하는 업종코드(KSIC) 기준이며, 실제 업종에 대한 인식과 다를 수 있습니다.
- 카테고리·요약·감사절차는 LLM으로 정제한 결과이며, 원문 대조 없이 수치·문구를 그대로 신뢰하기보다는 실제 감사보고서 원문(연결된 DART 링크)으로 확인하는 것을 권장합니다.
- 회계법인은 4대 법인(삼일·삼정·안진·한영) 외에는 모두 '기타'로 묶어서 보여줍니다.
- KAM 사례는 2022~2025년 감사보고서 기준이고, 감사인 정보는 2026년 1분기보고서 기준이라 시점이 다릅니다.

## 기술 스택

- **앱**: Next.js(App Router) · TypeScript · Tailwind CSS v4 · Drizzle ORM · Turso(libSQL) · Vercel
- **수집·정제 파이프라인**: Python · DART OpenAPI(`requests`) · Anthropic SDK(Claude) · SQLite

## 로컬 개발

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다. DB 스키마 변경은 `npm run db:push`, `npm run db:studio`로 확인합니다.
