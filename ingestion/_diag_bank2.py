import sys, re
sys.path.insert(0, ".")
sys.stdout.reconfigure(encoding="utf-8")
import dart_client

corp_code = "00254045"
from ingest_kam_pilot import find_annual_report
report = find_annual_report(corp_code, 2024)
rcept_no = report["rcept_no"]
zip_bytes = dart_client.get_document_zip(rcept_no)
files = dart_client.unzip_first_xml_bytes(zip_bytes)

def doc_name(content):
    head = content[:400].decode("utf-8", errors="ignore")
    m = re.search(r"<DOCUMENT-NAME[^>]*>([^<]+)</DOCUMENT-NAME>", head)
    return m.group(1) if m else "(이름없음)"

for fname, content in files.items():
    name = doc_name(content)
    has_kam = "핵심감사사항" in content.decode("utf-8", errors="ignore")
    print(fname, "|", name, "| len:", len(content), "| KAM포함:", has_kam)
