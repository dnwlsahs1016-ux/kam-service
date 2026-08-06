import sys
sys.path.insert(0, ".")
sys.stdout.reconfigure(encoding="utf-8")
import dart_client
from ingest_kam_pilot import find_annual_report, find_audit_report_text

corp_code = "00254045"  # 우리은행
report = find_annual_report(corp_code, 2024)
print("report:", report.get("rcept_no") if report else None, report.get("report_nm") if report else None)
if report:
    text = find_audit_report_text(report["rcept_no"])
    print("text len:", len(text) if text else None)
    if text:
        idx = text.find("핵심감사사항")
        print("첫 occurrence idx:", idx)
        if idx == -1:
            idx = text.find("핵심 감사사항")
            print("띄어쓰기 버전 idx:", idx)
        if idx == -1:
            idx = text.find("Key Audit")
            print("영문 idx:", idx)
        if idx != -1:
            print(text[max(0,idx-200):idx+500])
        else:
            with open("_bank_sample.xml", "w", encoding="utf-8") as f:
                f.write(text)
            print("저장함: _bank_sample.xml (총", len(text), "자)")
