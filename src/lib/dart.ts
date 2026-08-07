// kam_filings.source_url은 감사보고서 첨부파일이 바로 선택된 DART 뷰어 URL이다
// (예: https://dart.fss.or.kr/dsaf001/main.do?rcpNo=...&dcmNo=...). "&dcmNo=..."를
// 떼어내면 사업보고서 전체 목록이 열리는 기본 뷰어 URL이 된다 - 별도 컬럼 없이도
// 사업보고서/감사보고서 링크를 각각 만들 수 있다.
export function dartMainReportUrl(sourceUrl: string): string {
  return sourceUrl.split("&dcmNo=")[0];
}
