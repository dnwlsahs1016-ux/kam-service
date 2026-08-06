// 원문은 문단 전체가 공백으로 이어붙은 한 줄 문자열이라 (a)(b)(c) 같은 하위목록이
// 눈에 안 띄고, "~하여야 한다" 같은 실제 요구사항 문장도 다른 서술문과 구분이 안 된다.
// 렌더링 시점에만 하위목록 앞에 줄바꿈을 넣고, 요구사항 문장을 굵게 표시한다.

const SUB_ITEM_BREAK_RE = /\s(?=\([a-z]\)|\((?:i{1,3}|iv|vi{0,3}|ix|x)\)(?=\s))/g;
const REQUIREMENT_HINTS = ["하여야 한다", "해야 한다", "요구된다", "요구하고 있다", "하여서는 아니 된다", "안 된다"];

function splitSentences(line: string): string[] {
  // "다. " 뒤에서 문장을 끊는다 (한국어 종결어미 기준의 근사치).
  return line.split(/(?<=다\.)\s+/);
}

export function StandardParagraphText({ content }: { content: string }) {
  const lines = content.split(SUB_ITEM_BREAK_RE);

  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className={i > 0 ? "mt-1 block pl-4" : "block"}>
          {splitSentences(line).map((sentence, j) => {
            const isRequirement = REQUIREMENT_HINTS.some((h) => sentence.includes(h));
            return isRequirement ? (
              <strong key={j} className="font-semibold text-foreground">
                {sentence + " "}
              </strong>
            ) : (
              <span key={j}>{sentence + " "}</span>
            );
          })}
        </span>
      ))}
    </>
  );
}
