// 이용가이드를 3개의 독립된 클립 대신 "하나의 이어지는 영상"으로 만든다. 이전엔 클립마다
// 다른 회사/페이지에서 시작해서 자동으로 다음 단계로 넘어갈 때 화면이 뚝 끊기는 느낌이
// 있었다 - 검색해서 들어간 삼성전자 회사 페이지에서 그대로 이어서 스크롤하고, 그 페이지의
// 기준서 칩을 눌러 이동하는 흐름 하나로 녹화하면 "1번 끝난 화면 = 2번 시작 화면"이 자연히
// 보장된다. 대신 재생 중 몇 초 지점이 몇 번째 "단계"인지 구분해야 하므로, 단계가 바뀌는
// 시점의 초(seconds)를 stepBoundaries로 함께 저장해서 GuideModal이 currentTime 기준으로
// 표시만 갈아끼우게 한다.
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";
const SIZE = { width: 1344, height: 694 }; // 모달 표시 폭(672px)의 2배 - HiDPI 기준 1:1, 일반 화면에선 완만한 다운스케일. 1860 소스는 실제 표시 폭보다 너무 커서(2.77배) 브라우저 비디오 스케일링 필터가 텍스트를 흐리게 그렸다(직접 캡처해서 확인).
const ACCENT = "#d04a02";

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
  for (const url of [base, `${base}/companies/00126380`]) {
    await warmupPage.goto(url, { waitUntil: "networkidle" });
  }
  await warmupPage.close();
}

const tmpDir = path.join(outDir, "_tmp_tour");
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

// ── 1. 검색 ──────────────────────────────────────────────
// recordVideo는 컨텍스트의 페이지가 생성되는 시점부터 찍힌다 - goto 직후 바로 움직이면
// 아직 안 끝난 리플로우/폰트 로딩/hydration이 그대로 영상 초반에 찍혀서 화면이 흔들리는
//것처럼 보인다("첫 부분이 운다"). networkidle까지 기다리고, 폰트 로딩과 약간의 정지
// 시간을 추가로 둬서 녹화 시작 시점엔 화면이 완전히 안정된 상태이게 한다.
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1000);
const input = page.locator('input[name="q"]');
await input.waitFor();
await input.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(435);

const inputBox = await input.boundingBox();
await moveMouseSmooth(page, inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2, {
  from: { x: 20, y: 20 },
  steps: 25,
});
await page.waitForTimeout(218);
await page.click('input[name="q"]');
await page.waitForTimeout(435);
await page.type('input[name="q"]', "삼성전자", { delay: 190 });
await page.waitForSelector("#company-search-listbox li:nth-child(1)");
await page.waitForTimeout(725);
const firstResult = page.locator("#company-search-listbox li").first();
const resultBox = await firstResult.boundingBox();
await moveMouseSmooth(page, resultBox.x + resultBox.width / 2, resultBox.y + resultBox.height / 2, { steps: 18 });
await page.waitForTimeout(580);
await firstResult.click();
await page.waitForSelector("h1");
await page.waitForTimeout(870);

// ── 2. 확인 (같은 회사 페이지에서 이어서 스크롤) ──────────────
const t1 = elapsed();
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
await page.waitForTimeout(580);

// ── 3. 기준서 이동 (같은 칩을 그대로 클릭) ──────────────────
const t2 = elapsed();
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
const [file] = fs.readdirSync(tmpDir);
fs.renameSync(path.join(tmpDir, file), path.join(outDir, "guide-tour.webm"));
fs.rmSync(tmpDir, { recursive: true, force: true });

fs.writeFileSync(
  path.join(outDir, "guide-tour.json"),
  JSON.stringify({ stepBoundaries: [0, t1, t2] }, null, 2)
);
console.log("stepBoundaries:", [0, t1, t2]);

await browser.close();
console.log("완료:", path.join(outDir, "guide-tour.webm"));
