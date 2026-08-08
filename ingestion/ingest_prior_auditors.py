"""company_auditors에 이미 있는 각 회사의 "가장 최근 KAM 사례 연도" 감사인을
priorAdtorName으로 채운다 - adtor_name(2026년 현재 감사인)과 다르면 그 사이 감사인이
바뀐 것이라, 화면에서 "감사인 변경" 배지로 보여줄 수 있다.

조회 방식은 ingest_auditors.py와 동일한 2단계: 구조화 API(accnutAdtorNmNdAdtOpinion,
그 연도 사업보고서 reprt_code=11011) 먼저 시도하고, adtor가 비어있으면 이미 갖고 있는
kam_filings.rcept_no 문서를 직접 파싱해서 보정한다(extract_auditor_from_document 재사용).
10개사 표본 검증: API만 40%, 하이브리드 90% 성공.

실행: python ingestion/ingest_prior_auditors.py
"""

import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dart_client as dc
from ingest_auditors import extract_auditor_from_document

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"


def main():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        """SELECT ca.corp_code, MAX(kf.fiscal_year), kf.rcept_no
           FROM company_auditors ca
           JOIN kam_filings kf ON kf.corp_code = ca.corp_code
           GROUP BY ca.corp_code"""
    ).fetchall()
    # 같은 corp_code에 여러 rcept_no가 있을 수 있으니(MAX(fiscal_year) 자체는 GROUP BY로
    # 구해지지만 rcept_no는 임의의 한 행) 최신 연도에 해당하는 rcept_no를 별도로 다시 뽑는다.
    targets = []
    for corp_code, fiscal_year, _ in rows:
        rcept_no = conn.execute(
            "SELECT rcept_no FROM kam_filings WHERE corp_code = ? AND fiscal_year = ? LIMIT 1",
            (corp_code, fiscal_year),
        ).fetchone()[0]
        targets.append((corp_code, fiscal_year, rcept_no))

    print(f"대상 {len(targets)}개 회사")
    ok, via_api, via_doc, fail = 0, 0, 0, 0
    for i, (corp_code, fiscal_year, rcept_no) in enumerate(targets, 1):
        adtor = None
        try:
            data = dc.get_auditor_opinion(corp_code, str(fiscal_year), "11011")
            if data.get("status") == "000":
                candidate = (data["list"][0].get("adtor") or "").strip()
                if candidate and candidate != "-":
                    adtor = candidate
                    via_api += 1
        except Exception:
            pass

        if not adtor:
            try:
                zip_bytes = dc.get_document_zip(rcept_no)
                files = dc.unzip_first_xml_bytes(zip_bytes)
                xml_text = list(files.values())[0].decode("utf-8", errors="replace")
                adtor = extract_auditor_from_document(xml_text)
                if adtor:
                    via_doc += 1
            except Exception:
                pass

        if adtor:
            conn.execute(
                "UPDATE company_auditors SET prior_adtor_name = ? WHERE corp_code = ?",
                (adtor, corp_code),
            )
            ok += 1
        else:
            fail += 1

        if i % 50 == 0:
            conn.commit()
            print(f"[{i}/{len(targets)}] 진행 중... (성공 {ok}, 실패 {fail})")
        time.sleep(0.15)

    conn.commit()
    print(f"완료: 성공 {ok}(API {via_api}, 문서파싱 {via_doc}), 실패 {fail}")

    changed = conn.execute(
        "SELECT COUNT(*) FROM company_auditors WHERE prior_adtor_name IS NOT NULL AND prior_adtor_name != adtor_name"
    ).fetchone()[0]
    print(f"감사인 변경된 회사: {changed}개")
    conn.close()


if __name__ == "__main__":
    main()
