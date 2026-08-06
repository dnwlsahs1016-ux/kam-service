import sys, re
sys.path.insert(0, ".")
sys.stdout.reconfigure(encoding="utf-8")
import dart_client
from ingest_kam_pilot import find_annual_report

corp_code = "00254045"
report = find_annual_report(corp_code, 2024)
rcept_no = report["rcept_no"]
zip_bytes = dart_client.get_document_zip(rcept_no)
files = dart_client.unzip_first_xml_bytes(zip_bytes)
content = files[f"{rcept_no}_00761.xml"].decode("utf-8", errors="ignore")
plain = re.sub(r"<[^>]+>", "", content)
plain = re.sub(r"&nbsp;|&amp;", " ", plain)

for m in re.finditer("감사의견", plain):
    i = m.start()
    print("=====", i, "=====")
    print(plain[max(0,i-80):i+200])
    print()
