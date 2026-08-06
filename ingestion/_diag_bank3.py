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
content = files[f"{rcept_no}.xml"].decode("utf-8", errors="ignore")

idxs = [m.start() for m in re.finditer("핵심감사사항", content)]
print("등장 횟수:", len(idxs))
print("첫 위치:", idxs[0] if idxs else None)
if idxs:
    print(content[max(0, idxs[0]-300):idxs[0]+800])
