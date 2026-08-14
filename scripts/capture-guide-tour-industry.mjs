// "업종에서 찾기" 가이드: 업종 타일 클릭 -> 카테고리 선택 -> 기준서 칩 클릭까지 하나의
// 이어지는 영상으로 녹화한다(capture-guide-tour.mjs의 "기업으로 찾기" 버전과 같은 방식).
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CURSOR_INIT_SCRIPT, moveMouseSmooth, ringHighlight } from "./capture-guide-helpers.mjs";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";
const SIZE = { width: 1344, height: 694 }; // 모달 표시 폭(672px)의 2배 - HiDPI 기준 1:1, 일반 화면에선 완만한 다운스케일. 1860 소스는 실제 표시 폭보다 너무 커서(2.77배) 브라우저 비디오 스케일링 필터가 텍스트를 흐리게 그렸다(직접 캡처해서 확인).
const INDUSTRY_HREF = "/industries/2612,264"; // 반도체

const browser = await chromium.launch();

{
  const warmupPage = await browser.newPage();
  for (const url of [
    `${base}/start`,
    `${base}/industries`,
    `${base}${INDUSTRY_HREF}`,
    `${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`,
  ]) {
    await warmupPage.goto(url, { waitUntil: "networkidle" });
  }
  await warmupPage.close();
}

const tmpDir = path.join(outDir, "_tmp_tour_industry");
fs.mkdirSync(tmpDir, { recursive: true });
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: tmpDir, size: SIZE } });
await context.addInitScript(CURSOR_INIT_SCRIPT);
await context.addInitScript(() => {
  const style = document.createElement("style");
  style.textContent = "nextjs-portal { display: none !important; }";
  document.head?.appendChild(style) ?? document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
});
const page = await context.newPage();
const t0 = Date.now();
const elapsed = () => (Date.now() - t0) / 1000;

// ── 1. 업종 선택 (홈 -> "업종별로 확인하러 가기" 버튼 -> /industries -> 반도체 타일) ──
// 업종 그리드가 홈 화면에서 /industries 페이지로 옮겨져서(2026-08-08 홈 개편), 먼저 홈의
// 진입 버튼을 눌러 들어가는 장면부터 이어서 녹화한다.
// recordVideo는 페이지 생성 시점부터 찍힌다 - goto 직후 바로 움직이면 아직 안 끝난
// 리플로우/폰트 로딩/hydration이 영상 초반에 그대로 찍혀 화면이 흔들리는 것처럼 보인다.
// networkidle과 폰트 로딩을 기다리고 1초 정지 시간을 둬서 녹화 시작 시점을 완전히
// 안정된 상태로 만든다(guide-tour.mjs와 동일한 수정, 실제로 확인해서 검증됨).
await page.goto(`${base}/start`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1800);
const industriesEntryLink = page.locator('a[href="/industries"]').first();
await industriesEntryLink.waitFor();
await industriesEntryLink.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(435);
const entryBox = await industriesEntryLink.boundingBox();
await moveMouseSmooth(page, entryBox.x + entryBox.width / 2, entryBox.y + entryBox.height / 2, {
  from: { x: 20, y: 20 },
  steps: 20,
});
await page.waitForTimeout(580);
await industriesEntryLink.click();
await page.waitForSelector(`a[href="${INDUSTRY_HREF}"]`);
await page.waitForTimeout(725);

const industryLink = page.locator(`a[href="${INDUSTRY_HREF}"]`).first();
await industryLink.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(435);
const industryBox = await industryLink.boundingBox();
await moveMouseSmooth(page, industryBox.x + industryBox.width / 2, industryBox.y + industryBox.height / 2, {
  steps: 18,
});
await page.waitForTimeout(580);
await industryLink.click();
await page.waitForSelector("main ul li a");
await page.waitForTimeout(870);

// ── 2. 카테고리 선택 (건수 1위 카테고리) ──────────────────────
const t1 = elapsed();
const categoryLink = page.locator("main ul li a").first();
const categoryBox = await categoryLink.boundingBox();
await moveMouseSmooth(page, categoryBox.x + categoryBox.width / 2, categoryBox.y + categoryBox.height / 2, {
  steps: 18,
});
await page.waitForTimeout(725);
await categoryLink.click();
await page.waitForSelector("article");
await page.waitForTimeout(870);

// ── 3. 기준서 이동 (감사기준서 칩 클릭 - 회계기준서(K-IFRS)는 외부 사이트로 새 탭이 열려서
// "이동 후 화면"을 자연스럽게 이어붙일 수 없다. 내부 페이지로 이동하는 걸 보여주는 완성도가
// 다양성보다 중요해서, 기업으로 찾기 가이드와 같은 방식으로 되돌린다) ────────────────
const t2 = elapsed();
const chip = page.locator('a[href^="/standards/"]').first();
await chip.waitFor();
const chipBoxBeforeScroll = await chip.boundingBox();
const targetY = SIZE.height - chipBoxBeforeScroll.height - 40;
const scrollPx = Math.max(0, Math.round(chipBoxBeforeScroll.y - targetY));
const ticks = 16;
for (let i = 0; i < ticks; i++) {
  await page.mouse.wheel(0, scrollPx / ticks);
  await page.waitForTimeout(203);
}
await page.waitForTimeout(435);

const chipBox = await chip.boundingBox();
const cx = chipBox.x + chipBox.width / 2;
const cy = chipBox.y + chipBox.height / 2;
await moveMouseSmooth(page, cx, cy, { steps: 14 });
await ringHighlight(page, chipBox);
await page.waitForTimeout(1015);

await chip.click();
await page.waitForSelector("main");
await page.evaluate(() => document.getElementById("__ring_highlight__")?.remove());
await page.waitForTimeout(580);
for (let i = 0; i < 5; i++) {
  await page.mouse.wheel(0, 50);
  await page.waitForTimeout(261);
}
await page.waitForTimeout(1160);

await context.close();
// recordVideo는 컨텍스트 안에서 열린 모든 페이지를 각각 녹화한다 - 회계기준서 링크가 새 탭
// (팝업)으로 열리면서 짧은 팝업용 영상 파일도 함께 생겼다. 메인 녹화(가장 긴/큰 파일)만
// 골라 쓴다.
const files = fs.readdirSync(tmpDir).map((f) => ({
  name: f,
  size: fs.statSync(path.join(tmpDir, f)).size,
}));
const file = files.sort((a, b) => b.size - a.size)[0].name;
fs.renameSync(path.join(tmpDir, file), path.join(outDir, "guide-tour-industry.webm"));
fs.rmSync(tmpDir, { recursive: true, force: true });

fs.writeFileSync(
  path.join(outDir, "guide-tour-industry.json"),
  JSON.stringify({ stepBoundaries: [0, t1, t2] }, null, 2)
);
console.log("stepBoundaries:", [0, t1, t2]);

await browser.close();
console.log("완료:", path.join(outDir, "guide-tour-industry.webm"));
