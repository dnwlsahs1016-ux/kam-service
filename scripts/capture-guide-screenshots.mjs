// 홈 화면 "이용 가이드"에 넣을 실제 화면 캡처 3장을 만든다. 세 장 모두 620x320으로
// 크기를 통일해서 캡션 줄 높이가 카드마다 어긋나지 않도록 한다.
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";
const W = 620;
const H = 320;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });

// 클릭 대상 요소 주변에 강조 테두리를 그려 넣는다(실제 페이지엔 영향 없음, 캡처 전용).
async function highlight(locator) {
  const box = await locator.boundingBox();
  await page.evaluate((b) => {
    const el = document.createElement("div");
    el.id = "__guide_highlight__";
    Object.assign(el.style, {
      position: "fixed",
      left: `${b.x - 10}px`,
      top: `${b.y - 10}px`,
      width: `${b.width + 20}px`,
      height: `${b.height + 20}px`,
      border: "4px solid #2563eb",
      borderRadius: "999px",
      boxShadow: "0 0 0 4px rgba(37,99,235,0.25), 0 0 12px rgba(37,99,235,0.5)",
      pointerEvents: "none",
      zIndex: 9999,
    });
    document.body.appendChild(el);
  }, box);
  return box;
}

// 1. 검색하는 화면
await page.goto(base);
await page.click('input[name="q"]');
await page.type('input[name="q"]', "삼성", { delay: 60 });
await page.waitForSelector("#company-search-listbox li:nth-child(5)");
await page.waitForTimeout(200);
const inputBounds = await page.locator('input[name="q"]').boundingBox();
await page.screenshot({
  path: path.join(outDir, "1-search.png"),
  clip: { x: inputBounds.x - 10, y: inputBounds.y - 10, width: W, height: H },
});

// 2. 확인하는 화면: 감사절차 체크리스트
await page.goto(`${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`);
await page.waitForSelector("article");
const articleBounds = await page.locator("article").first().boundingBox();
await page.screenshot({
  path: path.join(outDir, "2-checklist.png"),
  clip: { x: articleBounds.x - 10, y: articleBounds.y - 10, width: W, height: H },
});

// 3. 기준서로 이동하는 화면: 클릭할 "관련 감사기준서" 칩을 강조 표시
const chip = page.locator('a[href^="/standards/"]').first();
await chip.waitFor();
await chip.scrollIntoViewIfNeeded();
await page.waitForTimeout(100);
const chipBox = await highlight(chip);
await page.screenshot({
  path: path.join(outDir, "3-standard.png"),
  clip: {
    x: Math.max(0, chipBox.x - 40),
    y: Math.max(0, chipBox.y - H / 2 + chipBox.height / 2),
    width: W,
    height: H,
  },
});

await browser.close();
console.log("완료:", outDir);
