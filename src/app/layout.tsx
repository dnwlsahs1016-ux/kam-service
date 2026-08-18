import type { Metadata } from "next";
import localFont from "next/font/local";
import { GuideModal } from "@/components/GuideModal";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import "./globals.css";

// Noto Sans KR도 여전히 딱딱하다는 피드백이 있었다 - 한국 제품 UI에서 각지고 딱딱한
// 인상을 줄이려고 가장 널리 쓰는 가변 폰트인 Pretendard로 바꾼다.
const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-sans-kr",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KAM사절차",
  description: "업종별 핵심감사사항(KAM)으로 배우는 감사 절차 가이드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} h-full antialiased`}
    >
      <head>
        {/* 기본은 라이트모드 - localStorage에 저장된 다크모드 선택이 있을 때만 하이드레이션 전에 반영해 깜빡임을 막는다. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        {children}
        <ScrollToTop />
        <GuideModal />
      </body>
    </html>
  );
}
