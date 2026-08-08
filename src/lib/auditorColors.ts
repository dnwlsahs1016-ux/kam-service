import type { AuditorCategory } from "@/db/queries";

// 회계법인별 고정 순서·고정 색. dataviz 스킬의 검증된 기본 팔레트 슬롯 1~4(블루/오렌지/
// 아쿠아/옐로우)를 각 법인의 실제 글로벌 브랜드 컬러에 맞춰 배정한다 - 삼일=PwC(오렌지),
// 삼정=KPMG(블루), 안진=Deloitte(그린 계열), 한영=EY(옐로우). 기타는 브랜드가 없으니 중립
// 회색. /auditors 하위 페이지 전체(목록 막대, 대분류 헤더, hover, 링크)가 이 값을 함께
// 쓴다 - 법인 페이지를 들어가면 그 법인 색으로 화면 톤이 바뀌도록.
// AuditorCategory 타입은 db/queries.ts의 AUDITOR_ORDER가 원본이다(여기서 다시 선언하면
// 카테고리 5개 값이 두 파일에 따로 존재하게 된다).

type AuditorColorSet = {
  fill: string; // 아주 옅은 배경 채우기 (막대, 헤더 배경)
  border: string;
  text: string; // 강조 텍스트/링크
  hoverBg: string;
};

export const AUDITOR_COLORS: Record<AuditorCategory, AuditorColorSet> = {
  삼일: {
    fill: "bg-[#eb6834]/10 dark:bg-[#d95926]/15",
    border: "border-[#eb6834]/30 dark:border-[#d95926]/30",
    text: "text-[#c8551f] dark:text-[#eb8752]",
    hoverBg: "hover:bg-[#eb6834]/10 dark:hover:bg-[#d95926]/15",
  },
  삼정: {
    fill: "bg-[#2a78d6]/10 dark:bg-[#3987e5]/15",
    border: "border-[#2a78d6]/30 dark:border-[#3987e5]/30",
    text: "text-[#2a78d6] dark:text-[#6ba5ea]",
    hoverBg: "hover:bg-[#2a78d6]/10 dark:hover:bg-[#3987e5]/15",
  },
  안진: {
    fill: "bg-[#1baf7a]/10 dark:bg-[#199e70]/15",
    border: "border-[#1baf7a]/30 dark:border-[#199e70]/30",
    text: "text-[#178f64] dark:text-[#3ec996]",
    hoverBg: "hover:bg-[#1baf7a]/10 dark:hover:bg-[#199e70]/15",
  },
  한영: {
    fill: "bg-[#eda100]/12 dark:bg-[#c98500]/18",
    border: "border-[#eda100]/35 dark:border-[#c98500]/35",
    text: "text-[#a97200] dark:text-[#f0b52f]",
    hoverBg: "hover:bg-[#eda100]/12 dark:hover:bg-[#c98500]/18",
  },
  기타: {
    fill: "bg-zinc-200/70 dark:bg-zinc-700/50",
    border: "border-zinc-300 dark:border-zinc-700",
    text: "text-zinc-600 dark:text-zinc-300",
    hoverBg: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
  },
};
