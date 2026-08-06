import sys
sys.path.insert(0, ".")
sys.stdout.reconfigure(encoding="utf-8")

from ingest_kam_pilot import run_for_companies

HOLDCOS = [
    ("00688996", "KB금융"),
    ("00382199", "신한지주"),
    ("00547583", "하나금융지주"),
    ("01350869", "우리금융지주"),
    ("00858364", "BNK금융지주"),
    ("00980122", "JB금융지주"),
    ("00878915", "iM금융지주"),
    ("00860332", "메리츠금융지주"),
    ("00432102", "한국금융지주"),
]

if __name__ == "__main__":
    run_for_companies(HOLDCOS, fiscal_years=[2022, 2023, 2024, 2025])
