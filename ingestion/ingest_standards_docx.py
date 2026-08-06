"""
회계감사기준 전문 DOCX(2026 개정) -> standards 테이블 적재.

PDF 버전(ingest_standards.py)의 한계였던 "페이지 하단 각주가 본문 중간에 섞여 들어오는
문제"를 구조적으로 해결한다 - 이 워드 문서는 각주가 word/footnotes.xml에 완전히 분리되어
있어서, python-docx로 문단 텍스트(paragraph.text)만 읽으면 각주가 아예 섞이지 않는다.

문단번호는 리터럴 텍스트가 아니라 워드의 자동 번호 매기기(리스트) 스타일로 되어 있다:
- "문단" 스타일(서론/요구사항) = 순수 숫자 "1.", "2." ...
- "문단A" 스타일(적용 및 기타 설명자료) = "A1.", "A2." ...
각 기준서 시작 지점마다 번호가 1로 리셋되는데, 리셋되는 첫 문단에만 문단 자신의 pPr에
번호 override(numId)가 붙어있고 그 값이 numbering.xml의 startOverride를 가리킨다. override가
없으면 직전 번호에서 그대로 이어진다. 이 스크립트는 그 override 유무로 번호를 복원한다.
"""

import re
import sqlite3
import sys
import zipfile
from pathlib import Path

import docx
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding="utf-8")

DOCX_PATH = r"C:\Users\dnwls\OneDrive\바탕 화면\0. 회계감사기준 전문(2026 개정).docx"
DB_PATH = Path(__file__).resolve().parent.parent / "local.db"

HEADING_RE = re.compile(r"^감사기준서\s+(\d{3,4})\s*(.*)$", re.S)

# 문단 본문에 이어붙일 스타일(하위 불릿/정의목록). 구조적 라벨(제목류)은 여기 없으면 스킵된다.
CONTINUATION_STYLES = {"불릿목록A", "불릿목록B", "목록A", "목록B", "목록C", "List Paragraph"}
NUMBERED_STYLES = {"문단": "main", "문단A": "application"}


def load_num_starts(path: str) -> dict[str, int]:
    """numId -> 그 numId가 나타내는 시작번호(startOverride, 없으면 1)."""
    z = zipfile.ZipFile(path)
    numbering = z.read("word/numbering.xml").decode("utf-8")
    starts = {}
    for num_id, body in re.findall(r'<w:num w:numId="(\d+)"[^>]*>(.*?)</w:num>', numbering, re.S):
        m = re.search(r'<w:lvlOverride w:ilvl="0">.*?w:startOverride w:val="(\d+)"', body, re.S)
        starts[num_id] = int(m.group(1)) if m else 1
    return starts


def para_num_override(p) -> str | None:
    """이 문단 자신의 pPr에 번호 override(numId)가 있으면 그 numId를, 없으면 None을 반환한다."""
    pPr = p._p.find(qn("w:pPr"))
    if pPr is None:
        return None
    numPr = pPr.find(qn("w:numPr"))
    if numPr is None:
        return None
    numId_el = numPr.find(qn("w:numId"))
    if numId_el is None:
        return None
    return numId_el.get(qn("w:val"))


def main():
    doc = docx.Document(DOCX_PATH)
    num_starts = load_num_starts(DOCX_PATH)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM standards")

    code = None
    title = None
    counters = {"main": None, "application": None}
    in_application = False  # 한 번 적용자료(A-번호)로 넘어가면, 스타일이 다시 "문단"으로
    # 흔들려도(원문 편집 흔적) 계속 application으로 취급한다 - 요구사항이 적용자료 뒤에
    # 다시 나오는 경우는 없기 때문에 안전하다.
    current_type = None
    current_no = None
    buf: list[str] = []
    page_no = 0  # docx엔 페이지 개념이 없어 0으로 채운다(스키마 호환용, UI에서 노출 안 함)
    total = 0
    per_standard_count = 0

    def flush():
        nonlocal total, per_standard_count
        if code is None or current_no is None or not buf:
            return
        text = " ".join(s.strip() for s in buf if s.strip())
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            return
        para_no = current_no if current_type == "main" else f"A{current_no}"
        conn.execute(
            """INSERT INTO standards (ksa_code, ksa_title, para_no, para_type, page_no, content)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(ksa_code, para_no) DO UPDATE SET content=excluded.content""",
            (code, title, para_no, current_type, page_no, text),
        )
        total += 1
        per_standard_count += 1

    for p in doc.paragraphs:
        style = p.style.name
        text = p.text.strip()

        if style == "Heading 1":
            m = HEADING_RE.match(text.replace("\n", " ").strip()) if text else None
            if m:
                flush()
                if code:
                    print(f"감사기준서 {code}: {per_standard_count}개 문단 적재")
                code = m.group(1)
                title = m.group(2).strip()
                counters = {"main": None, "application": None}
                in_application = False
                current_type = None
                current_no = None
                buf = []
                per_standard_count = 0
            continue

        if code is None or not text:
            continue

        if style in NUMBERED_STYLES:
            if style == "문단A":
                in_application = True
            para_type = "application" if in_application else "main"
            if counters[para_type] is None:
                # 이 기준서에서 이 타입(main/application)의 첫 문단 - 번호 override를 신뢰한다.
                override_numid = para_num_override(p)
                counters[para_type] = num_starts.get(override_numid, 1) if override_numid else 1
            else:
                # 큰 기준서(예: 315)는 중간에도 override가 또 붙는 경우가 있는데, 실제로는
                # 리셋이 아니라 워드 편집 이력의 부작용이다(각주 override와 달리 진짜
                # "1로 리셋"이 아님) - 기준서 경계 밖에서는 override를 무시하고 이어서 증가시킨다.
                counters[para_type] += 1

            flush()
            current_type = para_type
            current_no = counters[para_type]
            buf = [text]
            continue

        if style in CONTINUATION_STYLES and current_no is not None:
            buf.append(text)
            continue

        # 그 외(Normal 소제목, Heading2-6 소제목, 보론 제목 등)는 구조 라벨이라 본문에 안 넣는다.

    flush()
    if code:
        print(f"감사기준서 {code}: {per_standard_count}개 문단 적재")

    conn.commit()
    conn.close()
    print(f"총 {total}개 문단 적재 완료")


if __name__ == "__main__":
    main()
