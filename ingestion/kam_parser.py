"""DART 감사보고서/연결감사보고서 원문(XML)에서 핵심감사사항(KAM) 섹션 전체를 추출한다.

관찰 결과, KAM 섹션 내부 개별 항목의 마크업은 회계법인/보고서마다 다르다.
- 삼성전자 사례: 개별 항목 제목이 <SPAN USERMARK="U">, 하위 라벨("핵심감사사항으로 결정한
  이유" 등)이 <SPAN USERMARK="B"> 또는 <P USERMARK="B">로 스타일링됨
- SK하이닉스 사례: 스타일링 전혀 없이 "(1)", "1)" 같은 평문 번호로만 항목이 구분됨

이런 형식 차이 때문에 개별 항목 단위로 정규식 파싱을 시도하는 것은 회계법인마다 깨지기
쉽다. 대신 이 모듈은 KAM 섹션의 시작~끝 경계만 잡아 태그를 제거한 평문 블록 하나로
반환하고, 개별 항목으로 분리·분류하는 작업은 Claude API(classify_kam.py)에 맡긴다.

경계:
- 시작: "핵심감사사항" 굵은 라벨(SPAN 또는 P 태그) 직후
- 끝: 감사기준서 700 표준문안상 항상 뒤따르는 "...경영진과 지배기구의 책임" 문구, 없으면
  "기타사항" 라벨, 그것도 없으면 최대 길이로 자름(드문 형식일 가능성 - 로그로 표시)
"""

import re

#  USERMARK 값은 " B" 처럼 단순한 경우도 있고 "F-BT12 B" 처럼 폰트/스타일 코드가
#  앞에 붙는 경우도 있어(같은 회계법인 안에서도 문서마다 다름), B/U는 공백구분 토큰 중
#  하나로 나타난다고 보고 단어경계로 매칭한다. 닫는 태그도 바로 뒤에 온다고 가정하지
#  않는다 - 일부 문서는 <SPAN B>핵심감사사항<SPAN !B>...본문...</SPAN></SPAN>처럼
#  라벨 span이 닫히기 전에 본문 span이 중첩되어 있어서, 닫는 태그를 요구하면 매칭이
#  실패한다(예: 키움증권 FY2024). 라벨 텍스트만 찾고 그 직후를 경계로 쓴다.
SECTION_HEADER_RE = re.compile(r'<(?:SPAN|P)\s+USERMARK="[^"]*\bB\b[^"]*">\s*핵심감사사항')
OTHER_MATTER_LABEL_RE = re.compile(r'<(?:SPAN|P)\s+USERMARK="[^"]*\bB\b[^"]*">\s*기타사항')
RESPONSIBILITY_PHRASE_RE = re.compile(r"경영진과\s*지배기구의\s*책임")
TAG_RE = re.compile(r"<[^>]+>")

MAX_SECTION_LEN = 8000  # 경계를 못 찾았을 때의 안전장치


def _flatten(xml_fragment: str) -> str:
    text = re.sub(r"<PGBRK\s*/?>", "\n", xml_fragment)
    text = re.sub(r"</?P[^>]*>", "\n", text)
    text = TAG_RE.sub(" ", text)
    lines = [re.sub(r"\s+", " ", l).strip() for l in text.split("\n")]
    return "\n".join(l for l in lines if l)


def extract_kam_section_text(xml_text: str) -> str | None:
    m = SECTION_HEADER_RE.search(xml_text)
    if not m:
        return None
    start = m.end()

    end_candidates = []
    om = OTHER_MATTER_LABEL_RE.search(xml_text, start)
    if om:
        end_candidates.append(om.start())
    rm = RESPONSIBILITY_PHRASE_RE.search(xml_text, start)
    if rm:
        end_candidates.append(rm.start())

    if end_candidates:
        end = min(end_candidates)
    else:
        end = start + MAX_SECTION_LEN

    section = _flatten(xml_text[start:end])
    return section if section.strip() else None
