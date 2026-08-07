// "회계법인으로 찾기" 가이드: 회계법인 선택 -> 업종 선택 -> 회사 확인까지 하나의 이어지는
// 영상으로 녹화한다(capture-guide-tour.mjs/-industry.mjs와 같은 방식).
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";
const SIZE = { width: 1860, height: 960 };
const ACCENT = "#d04a02";
const AUDITOR_CATEGORY = "삼일"; // PwC
const AUDITOR_MINOR = "은행";

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

async function moveMouseSmooth(page, toX, toY, { steps = 20, stepDelay = 24, from } = {}) {
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

// 워밍업 (컴파일 대기가 녹화 중 흰 화면으로 찍히지 않도록)
{
  const warmupPage = await browser.newPage();
  for (const url of [
    base,
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
await page.goto(base);
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
const t2 = elapsed();
const companyLink = page.locator('a[href^="/companies/"]').first();
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
