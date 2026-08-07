"""DART Open API 얇은 래퍼. DART_API_KEY는 .env.local에서만 읽는다."""

import io
import os
import re
import zipfile
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

BASE_URL = "https://opendart.fss.or.kr/api"


def _api_key() -> str:
    key = os.environ.get("DART_API_KEY")
    if not key:
        raise RuntimeError("DART_API_KEY가 .env.local에 없습니다")
    return key


def get_corp_code_zip() -> bytes:
    """전체 고유번호(corp_code) 목록 zip 원본 바이트를 반환한다."""
    resp = requests.get(
        f"{BASE_URL}/corpCode.xml",
        params={"crtfc_key": _api_key()},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.content


def get_company(corp_code: str) -> dict:
    """기업개황 조회 (업종코드 induty_code 포함)."""
    resp = requests.get(
        f"{BASE_URL}/company.json",
        params={"crtfc_key": _api_key(), "corp_code": corp_code},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def get_auditor_opinion(corp_code: str, bsns_year: str, reprt_code: str) -> dict:
    """정기보고서 주요정보 - 회계감사인의 명칭 및 감사(검토)의견.

    reprt_code: 사업보고서 11011 / 반기보고서 11012 / 1분기 11013 / 3분기 11014.
    """
    resp = requests.get(
        f"{BASE_URL}/accnutAdtorNmNdAdtOpinion.json",
        params={
            "crtfc_key": _api_key(),
            "corp_code": corp_code,
            "bsns_year": bsns_year,
            "reprt_code": reprt_code,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def search_filings(
    corp_code: str | None = None,
    bgn_de: str | None = None,
    end_de: str | None = None,
    pblntf_ty: str | None = None,
    pblntf_detail_ty: str | None = None,
    page_no: int = 1,
    page_count: int = 100,
) -> dict:
    """공시검색 (list.json)."""
    params = {"crtfc_key": _api_key(), "page_no": page_no, "page_count": page_count}
    if corp_code:
        params["corp_code"] = corp_code
    if bgn_de:
        params["bgn_de"] = bgn_de
    if end_de:
        params["end_de"] = end_de
    if pblntf_ty:
        params["pblntf_ty"] = pblntf_ty
    if pblntf_detail_ty:
        params["pblntf_detail_ty"] = pblntf_detail_ty
    resp = requests.get(f"{BASE_URL}/list.json", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def get_document_zip(rcept_no: str) -> bytes:
    """공시서류원본파일 (document.xml) - 공시 원문 zip 바이트를 반환한다."""
    resp = requests.get(
        f"{BASE_URL}/document.xml",
        params={"crtfc_key": _api_key(), "rcept_no": rcept_no},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.content


def unzip_first_xml_bytes(zip_bytes: bytes) -> dict[str, bytes]:
    """zip 안의 모든 파일을 {파일명: bytes}로 반환한다."""
    out = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for name in zf.namelist():
            out[name] = zf.read(name)
    return out


_DCM_OPTION_RE = re.compile(
    r'<option value="rcpNo=\d+&amp;dcmNo=(\d+)"[^>]*>\s*[\d.]+&nbsp;\s*(.*?)\s*</option>',
    re.S,
)


def get_viewer_url(rcept_no: str) -> str:
    """DART 뷰어에서 감사보고서(우선 연결감사보고서)가 자동 선택된 상태로 열리는 URL을 반환한다.

    dsaf001/main.do?rcpNo=... 페이지는 서버에서 완전히 렌더링돼서 나오기 때문에,
    브라우저 없이 requests만으로 첨부문서 선택 콤보박스(dcmNo)를 긁을 수 있다.
    dcmNo를 못 찾으면(비상장 소규모 회사 등 페이지 구조가 다른 경우) rcpNo만 있는
    기본 URL로 안전하게 폴백한다.
    """
    base_url = f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"
    try:
        resp = requests.get(
            base_url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=15,
        )
        resp.raise_for_status()
        candidates = {label.strip(): dcm for dcm, label in _DCM_OPTION_RE.findall(resp.text)}
        for preferred in ("연결감사보고서", "감사보고서"):
            if preferred in candidates:
                return f"{base_url}&dcmNo={candidates[preferred]}"
    except requests.RequestException:
        pass
    return base_url
