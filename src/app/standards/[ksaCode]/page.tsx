import { notFound } from "next/navigation";
import { getAllStandardCodes, getStandard } from "@/db/queries";
import { StandardParagraphText } from "@/components/StandardParagraph";

export default async function StandardPage({
  params,
}: {
  params: Promise<{ ksaCode: string }>;
}) {
  const { ksaCode } = await params;
  const [paragraphs, validCodes] = await Promise.all([getStandard(ksaCode), getAllStandardCodes()]);

  if (paragraphs.length === 0) notFound();

  const main = paragraphs.filter((p) => p.paraType === "main");
  const application = paragraphs.filter((p) => p.paraType === "application");

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          감사기준서 {ksaCode} — {paragraphs[0].ksaTitle}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          굵게 표시된 문장은 &ldquo;~하여야 한다&rdquo;류의 실제 요구사항입니다.
        </p>

        <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-accent">
          서론·목적·요구사항
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {main.map((p) => (
            <div key={p.paraNo} id={`para-${p.paraNo}`} className="flex gap-3">
              <span className="w-12 shrink-0 text-sm text-zinc-400">{p.paraNo}.</span>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                <StandardParagraphText content={p.content} validCodes={validCodes} />
              </p>
            </div>
          ))}
        </div>

        {application.length > 0 && (
          <details className="mt-10">
            <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-zinc-500 hover:text-accent dark:text-zinc-400">
              적용 및 기타 설명자료 ({application.length}개 문단) — 펼쳐서 보기
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              {application.map((p) => (
                <div key={p.paraNo} id={`para-${p.paraNo}`} className="flex gap-3">
                  <span className="w-12 shrink-0 text-sm text-zinc-400">{p.paraNo}.</span>
                  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    <StandardParagraphText content={p.content} validCodes={validCodes} />
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}
