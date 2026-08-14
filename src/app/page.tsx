import { EntryOptions } from "@/components/EntryOptions";
import { ScrollReveal } from "@/components/ScrollReveal";

export const revalidate = 3600; // ingestion만 데이터를 바꾼다 - 매 요청 Turso 왕복 대신 1시간 캐시

// 모든 블록에서 겹치는 카드 2장의 높이를 고정해, 블록마다 이미지 비율이 달라도
// 겹쳐지는 모양(뒤 카드/앞 카드 크기 비)이 항상 똑같아 보이게 한다.
// 모바일은 두 카드가 안 겹치고 세로로 쌓이므로 높이를 고정하지 않고 원본 비율 그대로
// 보여준다(고정 높이+cover였다면 좁은 폭 때문에 과하게 확대되어 잘렸다). 데스크톱만
// 겹치는 카드 비율(뒤 카드/앞 카드)을 맞추기 위해 높이를 고정한다.
const BACK_H = "h-auto sm:h-64";
const FRONT_H = "h-auto sm:h-52";

function ChipFrame({ label, height, children }: { label: string; height: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="ml-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">{label}</span>
      </div>
      <div className={`overflow-hidden ${height}`}>{children}</div>
    </div>
  );
}

function ImageChip({
  src,
  alt,
  label,
  height,
  fit = "cover",
  hasDark = true,
}: {
  src: string;
  alt: string;
  label: string;
  height: string;
  // 표·리스트처럼 테두리가 있는 캡처는 "contain"으로 잘리는 부분 없이 통째로 보여주고,
  // 페이지를 훑어보는 캡처는 "cover"로 박스를 꽉 채운다(데스크톱에서만 - 모바일은 항상 원본 비율).
  fit?: "cover" | "contain";
  // 외부 사이트 캡처는 다크모드 버전이 없다 - 그 사이트 자체가 라이트 전용이라서.
  hasDark?: boolean;
}) {
  // PC와 모바일은 화면 폭이 달라 같은 이미지를 억지로 늘리면 잘리거나 과하게 확대돼 보인다 -
  // scripts/capture-home-preview.mjs가 폭별로 따로 캡처해둔 "-mobile" 버전을 쓴다.
  const mobileSrc = src.replace(/\.png$/, "-mobile.png");
  const desktopFit = `sm:h-full sm:object-${fit} sm:object-top`;
  const variants = hasDark
    ? [
        { src: mobileSrc, className: `block w-full h-auto dark:hidden sm:hidden` },
        { src: mobileSrc.replace(/\.png$/, "-dark.png"), className: `hidden w-full h-auto dark:block sm:hidden` },
        { src, className: `hidden w-full sm:block sm:dark:hidden ${desktopFit}` },
        { src: src.replace(/\.png$/, "-dark.png"), className: `hidden w-full sm:dark:block ${desktopFit}` },
      ]
    : [
        { src: mobileSrc, className: "block w-full h-auto sm:hidden" },
        { src, className: `hidden w-full sm:block ${desktopFit}` },
      ];
  return (
    <ChipFrame label={label} height={height}>
      {variants.map((v) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={v.src} src={v.src} alt={alt} className={v.className} />
      ))}
    </ChipFrame>
  );
}

function PreviewCollage({ back, front }: { back: React.ReactNode; front: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:relative sm:block sm:gap-0 sm:pb-10 sm:pr-6">
      <div className="sm:w-[88%]">{back}</div>
      <div className="sm:absolute sm:-bottom-2 sm:right-0 sm:w-[62%]">{front}</div>
    </div>
  );
}

const STORY = [
  {
    title: "기업별로 하나씩 찾던 감사보고서, 검색 한 번으로",
    body: "여러 기업의 핵심감사사항을 살펴보려면 DART에서 회사마다 사업보고서와 감사보고서를 직접 열어봐야 했습니다. 회사 이름만 검색하면, 실제 감사보고서에 실린 핵심감사사항과 감사절차 체크리스트를 바로 확인할 수 있습니다.",
    back: <ImageChip src="/preview-search.png" alt="삼성전자를 검색하는 화면" label="기업 검색" height={BACK_H} />,
    front: (
      <ImageChip
        src="/preview-company.png"
        alt="선정된 핵심감사사항과 감사절차 체크리스트를 보여주는 예시 화면"
        label="삼성전자 · 기업 상세"
        height={FRONT_H}
      />
    ),
  },
  {
    title: "업종마다 반복되는 이슈, 비중까지 한눈에",
    body: "업종별로 어떤 이슈가 주로 핵심감사사항으로 선정되는지 파악하기는 쉽지 않았습니다. 업종을 선택하면 실제 사례를 기준으로 어떤 카테고리가 얼마나 자주 KAM으로 선정되었는지 비중과 함께 보여줍니다.",
    back: (
      <ImageChip
        src="/preview-industries-grid.png"
        alt="업종을 선택하는 화면"
        label="업종 선택"
        height={BACK_H}
      />
    ),
    front: (
      <ImageChip
        src="/preview-industry.png"
        alt="반도체 업종에서 핵심감사사항 카테고리별 비중을 보여주는 예시 화면"
        label="반도체 · 카테고리 비중"
        height={FRONT_H}
      />
    ),
  },
  {
    title: "따로 찾아야 했던 기준서, 사례 안에서 바로",
    body: "핵심감사사항과 관련된 회계·감사기준서도 별도로 찾아 확인해야 했습니다. 각 사례는 관련 감사기준서·회계기준서 원문으로 바로 연결되어 있어, 근거 기준까지 한 번에 확인할 수 있습니다.",
    back: <ImageChip src="/preview-standard.png" alt="감사기준서 701 원문을 보여주는 예시 화면" label="감사기준서 701 원문" height={BACK_H} />,
    front: (
      <ImageChip
        src="/preview-samili.png"
        alt="삼일아이닷컴의 K-IFRS 1036 자산손상 기준서 원문 화면"
        label="회계기준서 원문 · SAMILi.com"
        height={FRONT_H}
        fit="contain"
        hasDark={false}
      />
    ),
  },
  {
    title: "원문이 궁금할 땐, DART로 바로",
    body: "핵심감사사항의 근거가 된 실제 사업보고서·감사보고서 원문이 궁금할 때도 있습니다. 각 사례에서 버튼 하나만 누르면 그 회사가 DART에 제출한 사업보고서·감사보고서 원문으로 바로 이동합니다.",
    back: <ImageChip src="/preview-dart-buttons.png" alt="DART 원문 보기 버튼을 보여주는 예시 화면" label="DART 원문 보기 버튼" height={BACK_H} />,
    front: (
      <ImageChip
        src="/preview-dart.png"
        alt="DART 사업보고서 원문 화면"
        label="사업보고서 원문 · DART"
        height={FRONT_H}
        fit="contain"
        hasDark={false}
      />
    ),
  },
];

export default async function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-10 pb-16">
        <h1 className="sr-only">KAM사절차</h1>
        <div className="sm:grid sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
          <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            <span className="text-accent">KAM사절차</span>
            <br />
            서비스란?
          </h2>
          <p className="mt-2 text-lg leading-[25px] text-zinc-600 dark:text-zinc-400 sm:mt-0">
            실제 상장사 감사보고서에 실린{" "}
            <strong className="font-semibold text-accent">핵심감사사항(KAM)</strong> 사례를
            업종·카테고리별로 모아, 감사 실무와 회계법인 면접 준비에 도움이 되도록 만든 학습
            자료입니다.
          </p>
        </div>

        <div className="mt-16 flex flex-col gap-16">
          {STORY.map((s, i) => (
            <div key={s.title}>
              <ScrollReveal>
                <div className="flex items-baseline gap-0 sm:gap-4">
                  <span className="-mr-3 text-7xl font-bold leading-none tracking-tight text-accent/30 sm:mr-0 sm:text-5xl sm:text-accent/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="relative z-10 text-xl font-semibold tracking-tight text-foreground sm:z-auto sm:text-2xl">
                    {s.title}
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {s.body}
                </p>
              </ScrollReveal>
              <ScrollReveal delayMs={150}>
                <div className="mt-6">
                  <PreviewCollage back={s.back} front={s.front} />
                </div>
              </ScrollReveal>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <EntryOptions />
        </div>
      </main>
    </div>
  );
}
