// 원문은 문단 전체가 공백으로 이어붙은 한 줄 문자열이라 (a)(b)(c) 같은 하위목록이
// 눈에 안 띄고, "~하여야 한다" 같은 실제 요구사항 문장도 다른 서술문과 구분이 안 된다.
// 렌더링 시점에만 하위목록 앞에 줄바꿈을 넣고, 요구사항 문장을 굵게 표시한다. 또한 문장
// 안에서 다른 기준서("감사기준서 200")를 언급하는 부분은 실제 존재하는 코드에 한해
// 그 기준서 페이지로 가는 링크로 바꾼다.

import Link from "next/link";
import type { ReactNode } from "react";

const SUB_ITEM_BREAK_RE = /\s(?=\([a-z]\)|\((?:i{1,3}|iv|vi{0,3}|ix|x)\)(?=\s))/g;
const REQUIREMENT_HINTS = ["하여야 한다", "해야 한다", "요구된다", "요구하고 있다", "하여서는 아니 된다", "안 된다"];
const STANDARD_REF_RE = /감사기준서\s*(\d{3,4})/g;

function splitSentences(line: string): string[] {
  // "다. " 뒤에서 문장을 끊는다 (한국어 종결어미 기준의 근사치).
  return line.split(/(?<=다\.)\s+/);
}

function linkifyStandardRefs(text: string, validCodes: Set<string>, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  STANDARD_REF_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = STANDARD_REF_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const code = match[1];
    if (validCodes.has(code)) {
      parts.push(
        <Link
          key={`${keyPrefix}-${i++}`}
          href={`/standards/${code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
        >
          {match[0]}
        </Link>
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function StandardParagraphText({
  content,
  validCodes = new Set(),
}: {
  content: string;
  validCodes?: Set<string>;
}) {
  const lines = content.split(SUB_ITEM_BREAK_RE);

  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className={i > 0 ? "mt-1 block pl-4" : "block"}>
          {splitSentences(line).map((sentence, j) => {
            const isRequirement = REQUIREMENT_HINTS.some((h) => sentence.includes(h));
            const rendered = linkifyStandardRefs(sentence + " ", validCodes, `${i}-${j}`);
            return isRequirement ? (
              <strong key={j} className="font-semibold text-foreground">
                {rendered}
              </strong>
            ) : (
              <span key={j}>{rendered}</span>
            );
          })}
        </span>
      ))}
    </>
  );
}
