// 홈 화면 "이용 가이드"에 넣을 실제 화면 캡처 3장을 만든다.
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });

// 1. 검색하는 화면: 홈에서 회사명을 입력해 자동완성이 뜬 상태
await page.goto(base);
await page.click('input[name="q"]');
await page.type('input[name="q"]', "삼성", { delay: 60 });
await page.waitForSelector("#company-search-listbox li:nth-child(5)");
await page.waitForTimeout(200);
const inputBounds = await page.locator('input[name="q"]').boundingBox();
await page.screenshot({
  path: path.join(outDir, "1-search.png"),
  clip: { x: inputBounds.x - 10, y: inputBounds.y - 10, width: 620, height: 320 },
});

// 2. 확인하는 화면: 카테고리 페이지에서 KAM 사례 + 감사절차 체크리스트
await page.goto(`${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`);
await page.waitForSelector("article");
await page.screenshot({ path: path.join(outDir, "2-checklist.png"), clip: { x: 0, y: 0, width: 900, height: 520 } });

// 3. 기준서로 이동하는 화면: 감사기준서 원문 페이지 (문단 1까지만 - 깨끗한 구간)
await page.goto(`${base}/standards/315`);
await page.waitForSelector("main");
await page.screenshot({ path: path.join(outDir, "3-standard.png"), clip: { x: 0, y: 0, width: 900, height: 260 } });

await browser.close();
console.log("완료:", outDir);
