"""DART 고유번호(전체 기업) 목록에서 상장사만 추려 업종코드와 함께 companies 테이블에 적재."""

import sqlite3
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import dart_client

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"
CACHE_DIR = Path(__file__).resolve().parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)
CORP_CODE_XML_CACHE = CACHE_DIR / "corpCode.xml"

SLEEP_SEC = 0.1


def load_listed_companies() -> list[dict]:
    if not CORP_CODE_XML_CACHE.exists():
        print("corpCode.xml 다운로드 중...")
        zip_bytes = dart_client.get_corp_code_zip()
        files = dart_client.unzip_first_xml_bytes(zip_bytes)
        xml_bytes = files["CORPCODE.xml"]
        CORP_CODE_XML_CACHE.write_bytes(xml_bytes)
    else:
        print("캐시된 corpCode.xml 사용")

    root = ET.fromstring(CORP_CODE_XML_CACHE.read_bytes())
    companies = []
    for node in root.findall("list"):
        stock_code = (node.findtext("stock_code") or "").strip()
        if not stock_code:
            continue  # 비상장사 제외
        companies.append(
            {
                "corp_code": node.findtext("corp_code").strip(),
                "corp_name": node.findtext("corp_name").strip(),
                "stock_code": stock_code,
            }
        )
    return companies


def main():
    companies = load_listed_companies()
    print(f"상장사 {len(companies)}개 발견, 업종코드 조회 시작")

    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS companies (
            corp_code TEXT PRIMARY KEY,
            corp_name TEXT NOT NULL,
            stock_code TEXT,
            industry_code TEXT,
            industry_name TEXT
        )"""
    )

    existing = {row[0] for row in conn.execute("SELECT corp_code FROM companies").fetchall()}
    done, failed = 0, 0

    for i, c in enumerate(companies, 1):
        if c["corp_code"] in existing:
            done += 1
            continue
        try:
            info = dart_client.get_company(c["corp_code"])
            industry_code = info.get("induty_code") or None
            conn.execute(
                """INSERT INTO companies (corp_code, corp_name, stock_code, industry_code, industry_name)
                   VALUES (?, ?, ?, ?, NULL)
                   ON CONFLICT(corp_code) DO UPDATE SET
                     corp_name=excluded.corp_name, stock_code=excluded.stock_code, industry_code=excluded.industry_code""",
                (c["corp_code"], c["corp_name"], c["stock_code"], industry_code),
            )
            done += 1
        except Exception as e:
            failed += 1
            print(f"  [실패] {c['corp_name']} ({c['corp_code']}): {e}")
        if i % 100 == 0:
            conn.commit()
            print(f"진행: {i}/{len(companies)} (성공 {done}, 실패 {failed})")
        time.sleep(SLEEP_SEC)

    conn.commit()
    conn.close()
    print(f"완료: 총 {len(companies)}개 중 {done}개 적재, {failed}개 실패")


if __name__ == "__main__":
    main()
