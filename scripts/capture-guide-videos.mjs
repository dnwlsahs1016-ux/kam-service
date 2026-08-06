// 홈 화면 "이용 가이드"에 넣을 짧은 화면 녹화 3개(webm)를 만든다. ffmpeg 없이
// Playwright 자체 recordVideo 기능만 사용 - HTML5 <video autoplay loop muted>로 재생한다.
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";
const SIZE = { width: 620, height: 320 };

const browser = await chromium.launch();

async function recordClip(name, fn) {
  const tmpDir = path.join(outDir, `_tmp_${name}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: tmpDir, size: SIZE },
  });
  const page = await context.newPage();
  await fn(page);
  await context.close();
  const [file] = fs.readdirSync(tmpDir);
  fs.renameSync(path.join(tmpDir, file), path.join(outDir, `${name}.webm`));
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`완료: ${name}.webm`);
}

// 1. 검색: 입력 -> 자동완성 등장까지
await recordClip("1-search", async (page) => {
  await page.goto(base);
  await page.locator('input[name="q"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.click('input[name="q"]');
  await page.type('input[name="q"]', "삼성", { delay: 120 });
  await page.waitForSelector("#company-search-listbox li:nth-child(5)");
  await page.waitForTimeout(1200);
});

// 2. 확인: 카테고리 페이지로 이동해서 체크리스트를 살짝 스크롤
await recordClip("2-checklist", async (page) => {
  await page.goto(`${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`);
  const article = page.locator("article").first();
  await article.waitFor();
  await article.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.mouse.wheel(0, 220);
  await page.waitForTimeout(1500);
});

// 3. 기준서 이동: 칩에 마우스 올렸다가 클릭 -> 기준서 페이지로 전환되는 것까지
await recordClip("3-standard", async (page) => {
  await page.goto(`${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`);
  const chip = page.locator('a[href^="/standards/"]').first();
  await chip.waitFor();
  await chip.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await chip.hover();
  await page.waitForTimeout(600);
  await chip.click();
  await page.waitForSelector("main");
  await page.waitForTimeout(1200);
});

await browser.close();
console.log("전체 완료:", outDir);
