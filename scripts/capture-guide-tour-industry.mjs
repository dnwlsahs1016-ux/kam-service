// "업종에서 찾기" 가이드: 업종 타일 클릭 -> 카테고리 선택 -> 기준서 칩 클릭까지 하나의
// 이어지는 영상으로 녹화한다(capture-guide-tour.mjs의 "기업으로 찾기" 버전과 같은 방식).
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";
const SIZE = { width: 1860, height: 960 };
const ACCENT = "#d04a02";
const INDUSTRY_HREF = "/industries/2612,264"; // 반도체

const browser = await chromium.launch();

const CURSOR_INIT_SCRIPT = () => {
  const el = document.createElement("div");
  el.id = "__fake_cursor__";
  Object.assign(el.style, {
    position: "fixed",
    width: "18px",
    height: "18px",
    marginLeft: "-2px",
    marginTop: "-2px",
    borderRadius: "50% 50% 50% 0",
    background: "#2563eb",
    border: "2px solid white",
    boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
    zIndex: 2147483647,
    pointerEvents: "none",
    left: "-50px",
    top: "-50px",
    transform: "rotate(-45deg)",
  });
  const attach = () => document.body && document.body.appendChild(el);
  if (document.body) attach();
  else document.addEventListener("DOMContentLoaded", attach);
  document.addEventListener("mousemove", (e) => {
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
  });
};

async function moveMouseSmooth(page, toX, toY, { steps = 20, stepDelay = 16, from } = {}) {
  const start = from ?? (await page.evaluate(() => window.__lastMouse__ ?? { x: 0, y: 0 }));
  for (let i = 1; i <= steps; i++) {
    const x = start.x + ((toX - start.x) * i) / steps;
    const y = start.y + ((toY - start.y) * i) / steps;
    await page.mouse.move(x, y);
    await page.waitForTimeout(stepDelay);
  }
  await page.evaluate(({ x, y }) => (window.__lastMouse__ = { x, y }), { x: toX, y: toY });
}

async function ringHighlight(page, box, color = ACCENT) {
  await page.evaluate(
    ({ b, color }) => {
      document.getElementById("__ring_highlight__")?.remove();
      const el = document.createElement("div");
      el.id = "__ring_highlight__";
      Object.assign(el.style, {
        position: "fixed",
        left: `${b.x - 8}px`,
        top: `${b.y - 8}px`,
        width: `${b.width + 16}px`,
        height: `${b.height + 16}px`,
        border: `3px solid ${color}`,
        borderRadius: "999px",
        boxShadow: `0 0 0 4px ${color}40`,
        pointerEvents: "none",
        zIndex: 2147483646,
      });
      document.body.appendChild(el);
    },
    { b: box, color }
  );
}

{
  const warmupPage = await browser.newPage();
  for (const url of [
    base,
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

// ── 1. 업종 선택 ──────────────────────────────────────────
await page.goto(base);
const industryLink = page.locator(`a[href="${INDUSTRY_HREF}"]`).first();
await industryLink.waitFor();
await industryLink.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(300);
const industryBox = await industryLink.boundingBox();
await moveMouseSmooth(page, industryBox.x + industryBox.width / 2, industryBox.y + industryBox.height / 2, {
  from: { x: 20, y: 20 },
  steps: 22,
});
await page.waitForTimeout(500);
await industryLink.click();
await page.waitForSelector("main ul li a");
await page.waitForTimeout(600);

// ── 2. 카테고리 선택 (건수 1위 카테고리) ──────────────────────
const t1 = elapsed();
const categoryLink = page.locator("main ul li a").first();
const categoryBox = await categoryLink.boundingBox();
await moveMouseSmooth(page, categoryBox.x + categoryBox.width / 2, categoryBox.y + categoryBox.height / 2, {
  steps: 18,
});
await page.waitForTimeout(500);
await categoryLink.click();
await page.waitForSelector("article");
await page.waitForTimeout(600);

// ── 3. 기준서 이동 (스크롤 후 첫 기준서 칩 클릭) ────────────────
const t2 = elapsed();
const chip = page.locator('a[href^="/standards/"]').first();
await chip.waitFor();
const chipBoxBeforeScroll = await chip.boundingBox();
const targetY = SIZE.height - chipBoxBeforeScroll.height - 40;
const scrollPx = Math.max(0, Math.round(chipBoxBeforeScroll.y - targetY));
const ticks = 16;
for (let i = 0; i < ticks; i++) {
  await page.mouse.wheel(0, scrollPx / ticks);
  await page.waitForTimeout(140);
}
await page.waitForTimeout(300);

const chipBox = await chip.boundingBox();
const cx = chipBox.x + chipBox.width / 2;
const cy = chipBox.y + chipBox.height / 2;
await moveMouseSmooth(page, cx, cy, { steps: 14 });
await ringHighlight(page, chipBox);
await page.waitForTimeout(700);

await chip.click();
await page.waitForSelector("main");
await page.evaluate(() => document.getElementById("__ring_highlight__")?.remove());
await page.waitForTimeout(400);
for (let i = 0; i < 5; i++) {
  await page.mouse.wheel(0, 50);
  await page.waitForTimeout(180);
}
await page.waitForTimeout(800);

await context.close();
const [file] = fs.readdirSync(tmpDir);
fs.renameSync(path.join(tmpDir, file), path.join(outDir, "guide-tour-industry.webm"));
fs.rmSync(tmpDir, { recursive: true, force: true });

fs.writeFileSync(
  path.join(outDir, "guide-tour-industry.json"),
  JSON.stringify({ stepBoundaries: [0, t1, t2] }, null, 2)
);
console.log("stepBoundaries:", [0, t1, t2]);

await browser.close();
console.log("완료:", path.join(outDir, "guide-tour-industry.webm"));
