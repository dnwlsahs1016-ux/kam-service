import sys
sys.path.insert(0, ".")
sys.stdout.reconfigure(encoding="utf-8")

from ingest_kam_pilot import run_for_companies

NEW_PHARMA = [
    ("00413046", "셀트리온"),
    ("00877059", "삼성바이오로직스"),
    ("00878696", "에스케이바이오팜"),
    ("00828497", "한미약품"),
    ("00888347", "휴젤"),
    ("00989619", "알테오젠"),
    ("00580199", "메디톡스"),
    ("00842619", "리가켐바이오"),
    ("01319899", "SK바이오사이언스"),
    ("00161426", "한미사이언스"),
]

if __name__ == "__main__":
    run_for_companies(NEW_PHARMA, fiscal_years=[2024, 2025])
