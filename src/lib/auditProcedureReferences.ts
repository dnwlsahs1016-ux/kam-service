// 한국공인회계사회(한공회) 표준조서 "4000 계정별 실증절차(K-IFRS용)"에서, KAM 카테고리별로
// 실무상 핵심이 되는 실증절차만 추려서 안내한다. 전체 조서는 회사명·작성자 등을 채워 넣는
// 표준 서식이라 여기서는 절차 항목명만 요약 인용한다(세부 문단 전체를 옮기지 않음).

export type ProcedureRef = {
  sheetCode: string; // 조서 인덱스 (예: "E")
  accountName: string; // 계정과목명
  procedures: string[]; // 핵심 실증절차 항목(요약)
};

const CATEGORY_TO_PROCEDURES: Record<string, ProcedureRef[]> = {
  재고자산평가: [
    {
      sheetCode: "E",
      accountName: "재고자산",
      procedures: [
        "재고자산수불부 검증(계산검증 및 관련 계정과의 연결)",
        "재고자산 실사입회 추가절차(집계표와 수불부 수량 연결)",
        "재고자산의 단가 검토(구입증빙 대사, 전기 대비 변동 조사)",
        "재고자산의 평가(저가법 등 평가 적정성)",
      ],
    },
  ],
  수익인식: [
    {
      sheetCode: "P",
      accountName: "매출 및 기타수익",
      procedures: [
        "거래형태별 수익인식기준의 타당성 검토",
        "결산일 전후 거래의 기간귀속(cutoff) 검토",
        "수익인식기준의 유형별 검토",
      ],
    },
  ],
  "총계약원가 추정": [
    {
      sheetCode: "P",
      accountName: "매출 및 기타수익",
      procedures: [
        "거래형태별 수익인식기준(투입법 등)의 타당성 검토",
        "총계약원가 추정치의 근거(가정·방법) 및 데이터 신뢰성 검토",
        "전기 추정치와 당기 실제 발생원가의 비교(소급적 검토)",
      ],
    },
  ],
  "매출채권 회수가능성": [
    {
      sheetCode: "C",
      accountName: "매출채권",
      procedures: [
        "외상매출금 외부 조회",
        "매출채권의 회수가능성 및 대손충당금의 적정성 검토",
        "보고기간종료일 전후 인도·용역제공의 기간귀속 검토",
      ],
    },
  ],
  "영업권 손상": [
    {
      sheetCode: "J",
      accountName: "자산손상",
      procedures: [
        "손상징후 검토",
        "현금창출단위 식별 및 영업권의 현금창출단위 배분 적정성 검토",
        "회수가능액 측정의 적정성 검토",
      ],
    },
    {
      sheetCode: "H",
      accountName: "무형자산",
      procedures: ["영업권과 염가매수차익의 회계처리 적정성 검토(K-IFRS 1103 참조)"],
    },
  ],
  "유형·무형자산 손상": [
    {
      sheetCode: "J",
      accountName: "자산손상",
      procedures: ["손상징후 검토", "회수가능액 측정의 적정성 검토"],
    },
    {
      sheetCode: "G",
      accountName: "유형자산",
      procedures: ["건설중인자산 회계처리 적정성 검토", "감가상각비 계상의 적정성 검토"],
    },
    {
      sheetCode: "H",
      accountName: "무형자산",
      procedures: ["무형자산상각비의 적정성 검토"],
    },
  ],
  "충당부채·우발부채": [
    {
      sheetCode: "FF",
      accountName: "제충당부채",
      procedures: [
        "충당부채 산정근거(가정·방법)의 이해 및 데이터 신뢰성·산식 적절성 검토",
        "충당부채 변경내역 검토",
      ],
    },
    {
      sheetCode: "CL",
      accountName: "우발부채 및 약정사항",
      procedures: ["우발부채 및 약정사항의 완전성 검토", "소송과 배상청구 검토"],
    },
  ],
  "금융상품 공정가치평가": [
    {
      sheetCode: "B",
      accountName: "금융자산",
      procedures: ["금융자산의 후속측정 검토", "금융자산의 손상검토"],
    },
    {
      sheetCode: "DER",
      accountName: "파생상품",
      procedures: ["파생상품의 후속측정 검토", "위험회피회계 적용에 대한 절차"],
    },
    {
      sheetCode: "EST",
      accountName: "공정가치 등 회계추정치",
      procedures: ["유의적 위험을 초래하는 회계추정치에 대한 평가"],
    },
  ],
  "관계기업·종속기업 지분가치평가": [
    {
      sheetCode: "SAJ",
      accountName: "종속기업·관계기업·공동기업",
      procedures: [
        "종속기업·관계기업·공동기업에 대한 측정의 적정성 검토",
        "손상차손 등 검토",
        "실재성 확인 및 중요한 증감의 검토",
      ],
    },
  ],
};

export function getProcedureRefsForCategory(category: string): ProcedureRef[] {
  return CATEGORY_TO_PROCEDURES[category] ?? [];
}
