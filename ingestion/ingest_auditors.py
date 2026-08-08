"""KAM 데이터가 있는 회사(kam_filings 기준)를 대상으로, 2026년 1분기보고서(reprt_code
11013)에 공시된 현재 감사인을 DART에서 조회해 company_auditors에 적재한다.

1분기보고서를 쓰는 이유: 2026년 반기보고서(11012)는 제출기한(결산일+45일)이 아직 지나지
않아 데이터가 없는 회사가 많다 - 1분기보고서는 이미 다 제출된, 가장 최신의 확정 정보다.

실행: python ingestion/ingest_auditors.py
"""

import re
import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dart_client as dc

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"
BSNS_YEAR = "2026"
REPRT_CODE = "11013"

BIG4_KEYWORDS = ["삼일", "삼정", "안진", "한영"]


def categorize(adtor_name: str) -> str:
    for key in BIG4_KEYWORDS:
        if key in adtor_name:
            return key
    return "기타"


_TR_RE = re.compile(r"<TR[^>]*>(.*?)</TR>", re.S)
# 표 데이터 셀 태그가 문서 종류마다 다르다 - <TD>뿐 아니라 <TE>(수정가능 텍스트),
# <TU>(단위값)도 쓰인다(예: 연차 감사보고서의 "회계감사인의 명칭" 표는 감사인 칸에 <TE>를
# 쓴다 - <TD>만 잡으면 그 칸이 통째로 빠져서 옆 칸과 인덱스가 밀린다).
_TD_RE = re.compile(r"<T[DEU][^>]*>(.*?)</T[DEU]>", re.S)
_TAG_RE = re.compile(r"<[^>]+>")
_CURRENT_PERIOD_RE = re.compile(r"\((당기|당분기|당반기)\)")


def extract_auditor_from_document(xml_text: str) -> str | None:
    """구조화 API(accnutAdtorNmNdAdtOpinion)가 adtor='-'를 반환하는 회사가 있다 - 실제
    원문(사업/분기보고서 본문 XML)에는 "가. 회계감사인의 명칭 및 감사의견" 표에 값이 채워져
    있는데, DART가 그 표를 구조화 데이터로 뽑아내는 과정에서 값을 놓친 케이스로 보인다
    (사용자가 DART 뷰어 화면에서 LX세미콘 사례로 직접 확인). 원문 표를 직접 파싱해서
    "(당기)"/"(당분기)" 행의 "감사보고서"/"연결감사보고서" 구분 셀 바로 다음 칸(감사인
    칸)을 읽는 방식으로 보정한다. 표 자체가 비어있는 회사(진짜 데이터 공백)는 이 방식으로도
    복구되지 않는다 - 그 경우는 None을 반환해 정상적으로 걸러지게 둔다.
    """
    idx = xml_text.find("회계감사인의 명칭")
    if idx == -1:
        return None
    window = xml_text[idx : idx + 10000]
    tbody_idx = window.find("<TBODY")
    body = window[tbody_idx:] if tbody_idx != -1 else window

    current_block = False
    for row_html in _TR_RE.findall(body):
        tds = [_TAG_RE.sub("", t).strip() for t in _TD_RE.findall(row_html)]
        if not tds:
            continue
        if any(_CURRENT_PERIOD_RE.search(t) for t in tds):
            current_block = True
        elif tds[0] not in ("감사보고서", "연결감사보고서"):
            current_block = False
        if not current_block:
            continue
        for i, t in enumerate(tds):
            if t in ("감사보고서", "연결감사보고서") and i + 1 < len(tds):
                candidate = tds[i + 1]
                if candidate and candidate != "-":
                    return candidate
    return None


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS company_auditors (
            corp_code TEXT PRIMARY KEY REFERENCES companies(corp_code),
            bsns_year TEXT NOT NULL,
            reprt_code TEXT NOT NULL,
            adtor_name TEXT NOT NULL,
            category TEXT NOT NULL
        )"""
    )
    conn.commit()

    # kam_filings만으로는 부족하다 - 회사 상세 페이지(/companies/[corpCode])는
    # kam_items(Claude 분류까지 끝난 사례)가 하나도 없으면 notFound()를 띄운다. 그래서
    # 감사인 목록에 노출은 되는데 클릭하면 404가 뜨는 회사가 생기지 않도록, 화면에서
    # 실제로 쓰는 것과 같은 join 기준(listCasesForCompany와 동일)으로 대상을 좁힌다.
    corp_codes = [
        row[0]
        for row in conn.execute(
            """SELECT DISTINCT kf.corp_code
               FROM kam_filings kf
               JOIN kam_raw_items kri ON kri.filing_id = kf.id
               JOIN kam_items ki ON ki.raw_item_id = kri.id"""
        ).fetchall()
    ]
    print(f"대상 {len(corp_codes)}개 회사")

    ok, no_data, errors, recovered_count = 0, 0, 0, 0
    for i, corp_code in enumerate(corp_codes, 1):
        try:
            data = dc.get_auditor_opinion(corp_code, BSNS_YEAR, REPRT_CODE)
        except Exception as e:
            print(f"[{i}/{len(corp_codes)}] {corp_code}: ERROR {e}")
            errors += 1
            time.sleep(0.2)
            continue

        if data.get("status") != "000":
            no_data += 1
            time.sleep(0.15)
            continue

        item = data["list"][0]
        adtor = (item.get("adtor") or "").strip()
        recovered = False
        if not adtor or adtor == "-":
            rcept_no = item.get("rcept_no")
            fallback = None
            if rcept_no:
                try:
                    zip_bytes = dc.get_document_zip(rcept_no)
                    files = dc.unzip_first_xml_bytes(zip_bytes)
                    xml_text = list(files.values())[0].decode("utf-8", errors="replace")
                    fallback = extract_auditor_from_document(xml_text)
                except Exception:
                    fallback = None
            if not fallback:
                no_data += 1
                time.sleep(0.15)
                continue
            adtor = fallback
            recovered = True

        category = categorize(adtor)
        conn.execute(
            """INSERT INTO company_auditors (corp_code, bsns_year, reprt_code, adtor_name, category)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(corp_code) DO UPDATE SET
                 bsns_year=excluded.bsns_year, reprt_code=excluded.reprt_code,
                 adtor_name=excluded.adtor_name, category=excluded.category""",
            (corp_code, BSNS_YEAR, REPRT_CODE, adtor, category),
        )
        ok += 1
        if recovered:
            recovered_count += 1
            print(f"  [원문 보정] {corp_code}: {adtor}")
        if i % 50 == 0:
            conn.commit()
            print(f"[{i}/{len(corp_codes)}] 진행 중... (성공 {ok}, 데이터없음 {no_data}, 에러 {errors})")
        time.sleep(0.15)

    conn.commit()
    print(f"완료: 성공 {ok}(원문 보정 {recovered_count}건 포함), 데이터없음 {no_data}, 에러 {errors}")

    print("\n분류별 집계:")
    for row in conn.execute(
        "SELECT category, COUNT(*) FROM company_auditors GROUP BY category ORDER BY CASE category WHEN '삼일' THEN 1 WHEN '삼정' THEN 2 WHEN '안진' THEN 3 WHEN '한영' THEN 4 ELSE 5 END"
    ):
        print(f"  {row[0]}: {row[1]}개사")

    conn.close()


if __name__ == "__main__":
    main()
