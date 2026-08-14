// "회계법인으로 찾기" 가이드: 회계법인 선택 -> 업종 선택 -> 회사 확인까지 하나의 이어지는
// 영상으로 녹화한다(capture-guide-tour.mjs/-industry.mjs와 같은 방식).
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CURSOR_INIT_SCRIPT, moveMouseSmooth, ringHighlight } from "./capture-guide-helpers.mjs";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";
const SIZE = { width: 1344, height: 694 }; // 모달 표시 폭(672px)의 2배 - HiDPI 기준 1:1, 일반 화면에선 완만한 다운스케일. 1860 소스는 실제 표시 폭보다 너무 커서(2.77배) 브라우저 비디오 스케일링 필터가 텍스트를 흐리게 그렸다(직접 캡처해서 확인).
const AUDITOR_CATEGORY = "삼일"; // PwC
const AUDITOR_MINOR = "은행";

const browser = await chromium.launch();

// 워밍업 (컴파일 대기가 녹화 중 흰 화면으로 찍히지 않도록)
{
  const warmupPage = await browser.newPage();
  for (const url of [
    `${base}/start`,
    `${base}/auditors`,
    `${base}/auditors/${encodeURIComponent(AUDITOR_CATEGORY)}`,
    `${base}/auditors/${encodeURIComponent(AUDITOR_CATEGORY)}/${encodeURIComponent(AUDITOR_MINOR)}`,
  ]) {
    await warmupPage.goto(url, { waitUntil: "networkidle" });
  }
  await warmupPage.close();
}

const tmpDir = path.join(outDir, "_tmp_tour_auditors");
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

// ── 1. 회계법인 선택 (홈 -> "회계법인으로 찾기" 버튼 -> /auditors -> 삼정) ──────────
// recordVideo는 페이지 생성 시점부터 찍힌다 - goto 직후 바로 움직이면 아직 안 끝난
// 리플로우/폰트 로딩/hydration이 영상 초반에 그대로 찍혀 화면이 흔들리는 것처럼 보인다.
// networkidle과 폰트 로딩을 기다리고 1초 정지 시간을 둬서 녹화 시작 시점을 완전히
// 안정된 상태로 만든다(guide-tour.mjs와 동일한 수정, 실제로 확인해서 검증됨).
await page.goto(`${base}/start`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1800);
const auditorsEntryLink = page.locator('a[href="/auditors"]').first();
await auditorsEntryLink.waitFor();
await auditorsEntryLink.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(435);
const entryBox = await auditorsEntryLink.boundingBox();
await moveMouseSmooth(page, entryBox.x + entryBox.width / 2, entryBox.y + entryBox.height / 2, {
  from: { x: 20, y: 20 },
  steps: 20,
});
await page.waitForTimeout(580);
await auditorsEntryLink.click();
await page.waitForSelector("main a");
await page.waitForTimeout(725);

const firmLink = page.locator("main a", { hasText: AUDITOR_CATEGORY }).first();
await firmLink.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(435);
const firmBox = await firmLink.boundingBox();
await moveMouseSmooth(page, firmBox.x + firmBox.width / 2, firmBox.y + firmBox.height / 2, { steps: 18 });
await page.waitForTimeout(725);
await firmLink.click();
await page.waitForSelector("main a");
await page.waitForTimeout(870);

// ── 2. 업종 선택 ──────────────────────────────────────────
const t1 = elapsed();
const minorLink = page.locator("main a", { hasText: AUDITOR_MINOR }).first();
await minorLink.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(435);
const minorBox = await minorLink.boundingBox();
await moveMouseSmooth(page, minorBox.x + minorBox.width / 2, minorBox.y + minorBox.height / 2, { steps: 18 });
await page.waitForTimeout(725);
await minorLink.click();
await page.waitForSelector('a[href^="/companies/"]');
await page.waitForTimeout(870);

// ── 3. 회사 확인 (KAM 상세 페이지로 이동) ──────────────────────
// 제주은행: 삼정 -> 삼일로 감사인이 바뀐 회사라 "감사인변경" 배지가 실제로 보인다.
const t2 = elapsed();
const companyLink = page.locator('a[href^="/companies/"]', { hasText: "제주은행" }).first();
await companyLink.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(435);
const companyBox = await companyLink.boundingBox();
await moveMouseSmooth(page, companyBox.x + companyBox.width / 2, companyBox.y + companyBox.height / 2, {
  steps: 14,
});
await ringHighlight(page, companyBox);
await page.waitForTimeout(1015);

await companyLink.click();
await page.waitForSelector("h1");
await page.evaluate(() => document.getElementById("__ring_highlight__")?.remove());
await page.waitForTimeout(580);
for (let i = 0; i < 5; i++) {
  await page.mouse.wheel(0, 50);
  await page.waitForTimeout(261);
}
await page.waitForTimeout(1160);

await context.close();
const files = fs.readdirSync(tmpDir).map((f) => ({
  name: f,
  size: fs.statSync(path.join(tmpDir, f)).size,
}));
const file = files.sort((a, b) => b.size - a.size)[0].name;
fs.renameSync(path.join(tmpDir, file), path.join(outDir, "guide-tour-auditors.webm"));
fs.rmSync(tmpDir, { recursive: true, force: true });

fs.writeFileSync(
  path.join(outDir, "guide-tour-auditors.json"),
  JSON.stringify({ stepBoundaries: [0, t1, t2] }, null, 2)
);
console.log("stepBoundaries:", [0, t1, t2]);

await browser.close();
console.log("완료:", path.join(outDir, "guide-tour-auditors.webm"));
