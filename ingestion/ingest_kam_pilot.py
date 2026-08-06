"""파일럿 업종의 상장사들에 대해 FY2022~FY2025 감사보고서에서 핵심감사사항(KAM) 섹션을
추출해 kam_filings / kam_raw_items 테이블에 적재한다.

전체 업종 확대 전, 파싱 품질을 사람이 육안으로 검증하기 위한 스크립트.
12월 결산법인만 다룬다(비3월 결산법인은 이번 파일럿 범위에서 제외 - 필요시 후속 확대).
"""

import sqlite3
import sys
import time
from pathlib import Path

import dart_client
from kam_parser import extract_kam_section_text

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"
FISCAL_YEARS = [2022, 2023, 2024, 2025]
SLEEP_SEC = 0.15


def ensure_tables(conn: sqlite3.Connection):
    conn.execute(
        """CREATE TABLE IF NOT EXISTS kam_filings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            corp_code TEXT NOT NULL,
            fiscal_year INTEGER NOT NULL,
            rcept_no TEXT NOT NULL UNIQUE,
            filed_date TEXT,
            source_url TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS kam_raw_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filing_id INTEGER NOT NULL REFERENCES kam_filings(id),
            seq INTEGER NOT NULL,
            title TEXT,
            raw_text TEXT NOT NULL
        )"""
    )


def find_annual_report(corp_code: str, fiscal_year: int) -> dict | None:
    res = dart_client.search_filings(
        corp_code=corp_code,
        bgn_de=f"{fiscal_year + 1}0101",
        end_de=f"{fiscal_year + 1}0630",
        pblntf_ty="A",
    )
    for item in res.get("list", []):
        report_nm = item.get("report_nm", "")
        if report_nm.startswith("사업보고서") and f"({fiscal_year}.12)" in report_nm:
            return item
    return None


def find_audit_report_text(rcept_no: str) -> str | None:
    """첨부파일들 중 연결감사보고서(우선) 또는 감사보고서를 찾아 디코딩한 텍스트를 반환."""
    zip_bytes = dart_client.get_document_zip(rcept_no)
    files = dart_client.unzip_first_xml_bytes(zip_bytes)

    def doc_name(content: bytes) -> str:
        head = content[:400].decode("utf-8", errors="ignore")
        m = __import__("re").search(r"<DOCUMENT-NAME[^>]*>([^<]+)</DOCUMENT-NAME>", head)
        return m.group(1) if m else ""

    candidates = {}
    for fname, content in files.items():
        if fname == f"{rcept_no}.xml":
            continue  # 전체 사업보고서 원문(너무 큼) - 첨부파일만 본다
        name = doc_name(content)
        candidates[name] = content

    for preferred in ("연결감사보고서", "감사보고서"):
        if preferred in candidates:
            return candidates[preferred].decode("utf-8", errors="ignore")
    return None


def run_for_companies(corp_codes: list[tuple[str, str]], fiscal_years: list[int] | None = None):
    """corp_codes: [(corp_code, corp_name), ...]"""
    years = fiscal_years or FISCAL_YEARS
    conn = sqlite3.connect(DB_PATH)
    ensure_tables(conn)
    existing_rcept = {
        row[0] for row in conn.execute("SELECT rcept_no FROM kam_filings").fetchall()
    }

    total_filings, total_with_kam = 0, 0

    for corp_code, corp_name in corp_codes:
        for fy in years:
            report = find_annual_report(corp_code, fy)
            time.sleep(SLEEP_SEC)
            if not report:
                print(f"[스킵] {corp_name} FY{fy}: 사업보고서(12월 결산) 없음")
                continue
            rcept_no = report["rcept_no"]
            if rcept_no in existing_rcept:
                print(f"[중복스킵] {corp_name} FY{fy}: 이미 적재됨")
                continue

            try:
                audit_text = find_audit_report_text(rcept_no)
            except Exception as e:
                print(f"[오류] {corp_name} FY{fy}: 원문 다운로드 실패 - {e}")
                time.sleep(SLEEP_SEC)
                continue
            time.sleep(SLEEP_SEC)

            total_filings += 1
            if not audit_text:
                print(f"[스킵] {corp_name} FY{fy}: 감사보고서 첨부 못 찾음")
                continue

            section = extract_kam_section_text(audit_text)
            viewer_url = dart_client.get_viewer_url(rcept_no)
            time.sleep(SLEEP_SEC)
            cur = conn.execute(
                """INSERT INTO kam_filings (corp_code, fiscal_year, rcept_no, filed_date, source_url)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    corp_code,
                    fy,
                    rcept_no,
                    report.get("rcept_dt"),
                    viewer_url,
                ),
            )
            filing_id = cur.lastrowid

            if section:
                conn.execute(
                    """INSERT INTO kam_raw_items (filing_id, seq, title, raw_text)
                       VALUES (?, 1, NULL, ?)""",
                    (filing_id, section),
                )
                total_with_kam += 1
                print(f"[적재] {corp_name} FY{fy}: KAM 섹션 {len(section)}자")
            else:
                print(f"[적재-KAM없음] {corp_name} FY{fy}: 핵심감사사항 섹션 못 찾음")

            conn.commit()

    conn.close()
    print(f"완료: 총 {total_filings}건 처리, KAM 섹션 확보 {total_with_kam}건")


if __name__ == "__main__":
    # 파일럿 업종 corp_code 목록은 별도로 채워서 실행한다 (companies 테이블 준비 후 결정).
    print("run_for_companies([(corp_code, corp_name), ...]) 를 호출해서 사용하세요.")
