"""
회계감사기준 전문 PDF -> standards 테이블 적재.

PDF 구조(사용자 제공 "0. 회계감사기준 전문(2025 개정).pdf" 기준):
- 페이지 1(index1)~2(index2): 전체 목차. "감사기준서 <코드>  <제목> ..... <시작페이지>" 형식
- 각 기준서는 시작 페이지에 자체 목차(문단번호 범위)를 갖고, 그 뒤 본문이 이어짐
- 본문 문단은 "1." "2." ... 처럼 숫자+마침표만 있는 줄로 시작하고, 적용 및 기타 설명자료는
  "A1" "A2" ... 형식으로 시작함 (해당 줄에는 번호만 존재)
- 각 본문 페이지 상단에는 "감사기준서 <코드> '<제목>'" 러닝헤더와 "<페이지> / 974" 페이지카운터가 반복됨

파싱 전략: 기준서 시작 페이지 범위 안에서, 첫 번째 문단번호-단독 줄을 만나기 전까지는
표지/자체목차 노이즈로 보고 버리고, 그 이후부터 문단번호 단독 줄을 경계로 문단을 분리한다.
러닝헤더/페이지카운터 줄은 어디서 만나든 제거한다.
"""

import re
import sqlite3
import sys
from pathlib import Path

import fitz

sys.stdout.reconfigure(encoding="utf-8")

PDF_PATH = r"C:\Users\dnwls\Downloads\0. 회계감사기준 전문(2025 개정).pdf"
DB_PATH = Path(__file__).resolve().parent.parent / "local.db"

TOC_LINE_RE = re.compile(r"^감사기준서\s+(\d{3,4})\s+(.+?)\s*\.{2,}\s*(\d+)\s*$")
PAGE_COUNTER_RE = re.compile(r"^\d+\s*/\s*974\s*$")
RUNNING_HEADER_RE = re.compile(r"^감사기준서\s+\d{3,4}\s*[‘'].*[’']\s*$")
# 문단번호는 항상 마침표를 동반한다("1." "A14."). 표준형은 번호만 있는 줄 뒤에 본문이 이어지지만,
# 일부는 같은 줄에 바로 본문이 붙어 나온다("A10. 감사를 수행하는...") - 둘 다 허용.
# 각주는 "9 품질관리기준서1 ..." 처럼 마침표 없이 번호+공백+텍스트 형태라 이 패턴에 걸리지 않는다.
PARA_MARKER_RE = re.compile(r"^(\d{1,3}|A\d{1,3})\.\s*(.*)$")
# 페이지 하단 각주가 본문 문단 중간에 그대로 섞여 들어오는 문제(예: "8 문단 18 참조",
# "(*2) 우리나라의 회계감사기준에 따라...")를 걸러낸다. 각주 특유의 표현(다른 기준서/문단
# 참조, 법규 인용, "예를 들어" 등)을 포함하는 경우만 제거 대상으로 삼아, 마침표 없는 숫자로
# 시작하는 실제 본문 줄(드묾)까지 지워버리는 오탐을 피한다.
FOOTNOTE_LINE_RE = re.compile(
    r"^\(?\*?\d{1,3}\)?\s+.*(감사기준서|품질관리기준서|문단\s*\d|참조|기준서\d|"
    r"외부감사법|IESBA|각주|예를\s*들어|말한다\s*$|해당된다\s*$|것이다\s*$)"
)


def parse_toc(doc: fitz.Document) -> list[dict]:
    toc_text = ""
    for i in range(0, 5):
        toc_text += doc[i].get_text()
    entries = []
    for raw_line in toc_text.split("\n"):
        line = raw_line.strip()
        m = TOC_LINE_RE.match(line)
        if m:
            entries.append(
                {
                    "code": m.group(1),
                    "title": m.group(2).strip(),
                    "start_page": int(m.group(3)),
                }
            )
    entries.sort(key=lambda e: e["start_page"])
    for idx, e in enumerate(entries):
        if idx + 1 < len(entries):
            e["end_page"] = entries[idx + 1]["start_page"] - 1
        else:
            e["end_page"] = doc.page_count
    return entries


def build_glued_footnote_re(known_codes: list[str]) -> re.Pattern:
    # "감사기준서 22010" / "감사기준서 200 1" 처럼, 다른 기준서를 인용하는 자리에 각주번호가
    # 공백 없이(또는 공백 하나만 두고) 그대로 붙어버리는 경우를 걸러낸다. 알고 있는 실제
    # 기준서 번호 뒤에 오는 잉여 숫자만 지우므로, 임의의 숫자를 잘못 지울 위험이 없다.
    # 뒤에 오는 문자가 한글이면(예: "22010에") 파이썬 정규식의 \b는 숫자<->한글 사이를
    # 경계로 보지 않아 매칭에 실패한다. 그래서 \b 대신 "숫자가 더 이어지지 않음"만 확인한다.
    codes_alt = "|".join(sorted(known_codes, key=len, reverse=True))
    return re.compile(rf"((?:감사기준서|품질관리기준서)\s*(?:{codes_alt}))\s?\d{{1,2}}(?!\d)")


def extract_paragraphs(
    doc: fitz.Document,
    code: str,
    title: str,
    start_page: int,
    end_page: int,
    glued_footnote_re: re.Pattern,
):
    paragraphs = []
    current_no = None
    current_type = None
    current_page = None
    buf: list[str] = []
    started = False
    # 문단번호는 기준서 안에서 단조증가해야 한다(1,2,3...). 방대한 기준서(예: 315, 112페이지)의
    # 부록 예시 안에는 "1." "2." 같은 지역 번호목록이 따로 있어서, 이 조건이 없으면 그게 진짜
    # 문단으로 오인되어 실제 1번 문단을 덮어써버린다(마지막 값이 upsert로 이기므로).
    last_main_num = -1
    last_app_num = -1

    def flush():
        if current_no is not None and buf:
            text = " ".join(s.strip() for s in buf if s.strip())
            text = glued_footnote_re.sub(r"\1", text)
            text = re.sub(r"\s+", " ", text).strip()
            if text:
                paragraphs.append(
                    {
                        "ksa_code": code,
                        "ksa_title": title,
                        "para_no": current_no,
                        "para_type": current_type,
                        "page_no": current_page,
                        "content": text,
                    }
                )

    # 기준서 시작 페이지(index start_page-1)는 표지+자체 목차(문단번호 dot-leader 목록)라서
    # 건너뛴다 - 목차의 단독 숫자(범위가 1개 문단일 때)가 문단 마커로 오탐되는 것을 방지.
    for page_idx in range(start_page, end_page):
        page_no_1based = page_idx + 1
        page_text = doc[page_idx].get_text()
        for raw_line in page_text.split("\n"):
            line = raw_line.strip()
            if not line:
                continue
            if PAGE_COUNTER_RE.match(line) or RUNNING_HEADER_RE.match(line):
                continue
            if FOOTNOTE_LINE_RE.match(line):
                continue
            marker = PARA_MARKER_RE.match(line)
            if marker:
                candidate_no = marker.group(1)
                is_application = candidate_no.startswith("A")
                num = int(candidate_no[1:] if is_application else candidate_no)
                last_num = last_app_num if is_application else last_main_num
                if num <= last_num:
                    # 단조증가하지 않음 -> 부록 예시 등 지역 번호목록. 새 문단이 아니라 본문으로 취급.
                    if started:
                        buf.append(line)
                    continue

                flush()
                buf = []
                current_no = candidate_no
                current_type = "application" if is_application else "main"
                current_page = page_no_1based
                started = True
                if is_application:
                    last_app_num = num
                else:
                    last_main_num = num
                rest = marker.group(2).strip()
                if rest:
                    buf.append(rest)
                continue
            if started:
                buf.append(line)
    flush()
    return paragraphs


def main():
    doc = fitz.open(PDF_PATH)
    toc = parse_toc(doc)
    print(f"파싱된 기준서 수: {len(toc)}")
    for e in toc:
        print(f"  {e['code']:>5}  p{e['start_page']:>4}-{e['end_page']:<4}  {e['title']}")

    glued_footnote_re = build_glued_footnote_re([e["code"] for e in toc])

    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM standards")
    total = 0
    for e in toc:
        paras = extract_paragraphs(
            doc, e["code"], e["title"], e["start_page"], e["end_page"], glued_footnote_re
        )
        for p in paras:
            conn.execute(
                """INSERT INTO standards (ksa_code, ksa_title, para_no, para_type, page_no, content)
                   VALUES (:ksa_code, :ksa_title, :para_no, :para_type, :page_no, :content)
                   ON CONFLICT(ksa_code, para_no) DO UPDATE SET content=excluded.content""",
                p,
            )
        print(f"감사기준서 {e['code']}: {len(paras)}개 문단 적재")
        total += len(paras)
    conn.commit()
    conn.close()
    print(f"총 {total}개 문단 적재 완료")


if __name__ == "__main__":
    main()
