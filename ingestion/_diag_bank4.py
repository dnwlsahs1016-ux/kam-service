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
content = files[f"{rcept_no}_00761.xml"].decode("utf-8", errors="ignore")  # 연결감사보고서

print("길이:", len(content))
print("'핵심' 등장:", len(re.findall("핵심", content)))
print("'감사사항' 등장:", len(re.findall("감사사항", content)))
print("'감사의견' 등장:", len(re.findall("감사의견", content)))
print("'책임' 등장:", len(re.findall("경영진과.{0,5}지배기구의.{0,5}책임", content)))

# 태그 제거한 순수 텍스트로 다시 검색
plain = re.sub(r"<[^>]+>", "", content)
idx = plain.find("핵심감사사항")
print("태그제거 후 idx:", idx)
if idx != -1:
    print(plain[max(0,idx-100):idx+600])
else:
    idx2 = plain.find("핵심")
    print("'핵심'만 idx:", idx2, plain[max(0,idx2-50):idx2+100] if idx2!=-1 else None)
