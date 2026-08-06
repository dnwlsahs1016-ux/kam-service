// 홈 화면 "이용 가이드"에 넣을 짧은 화면 녹화 3개(webm)를 만든다. 마우스 커서를 화면에
// 그려 넣어서 어디를 클릭하는지 보이게 하고, 실제 클릭 동작까지 녹화한다.
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";
const SIZE = { width: 620, height: 320 };

const browser = await chromium.launch();

// 커서를 화면에 그려주는 스크립트 - 매 페이지 로드마다 자동으로 다시 주입된다.
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

// 실제 시간 흐름이 녹화에 남도록, 여러 개의 작은 이동으로 나눠서 마우스를 옮긴다.
async function moveMouseSmooth(page, toX, toY, { steps = 20, stepDelay = 20, from } = {}) {
  const start = from ?? (await page.evaluate(() => window.__lastMouse__ ?? { x: 0, y: 0 }));
  for (let i = 1; i <= steps; i++) {
    const x = start.x + ((toX - start.x) * i) / steps;
    const y = start.y + ((toY - start.y) * i) / steps;
    await page.mouse.move(x, y);
    await page.waitForTimeout(stepDelay);
  }
  await page.evaluate(({ x, y }) => (window.__lastMouse__ = { x, y }), { x: toX, y: toY });
}

async function recordClip(name, fn) {
  const tmpDir = path.join(outDir, `_tmp_${name}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: tmpDir, size: SIZE },
  });
  await context.addInitScript(CURSOR_INIT_SCRIPT);
  const page = await context.newPage();
  await fn(page);
  await context.close();
  const [file] = fs.readdirSync(tmpDir);
  fs.renameSync(path.join(tmpDir, file), path.join(outDir, `${name}.webm`));
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`완료: ${name}.webm`);
}

// 1. 검색: 입력창으로 커서 이동 -> 클릭 -> 타이핑 -> 자동완성 결과로 커서 이동 -> 클릭
await recordClip("1-search", async (page) => {
  await page.goto(base);
  const input = page.locator('input[name="q"]');
  await input.scrollIntoViewIfNeeded();
  const inputBox = await input.boundingBox();
  await moveMouseSmooth(page, inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2, {
    from: { x: 20, y: 20 },
  });
  await page.click('input[name="q"]');
  await page.waitForTimeout(200);
  await page.type('input[name="q"]', "삼성", { delay: 140 });
  await page.waitForSelector("#company-search-listbox li:nth-child(1)");
  await page.waitForTimeout(400);
  const firstResult = page.locator("#company-search-listbox li").first();
  const resultBox = await firstResult.boundingBox();
  await moveMouseSmooth(page, resultBox.x + resultBox.width / 2, resultBox.y + resultBox.height / 2, {
    steps: 15,
  });
  await page.waitForTimeout(300);
  await firstResult.click();
  await page.waitForTimeout(1200);
});

// 2. 확인: 카테고리 페이지로 이동해서 체크리스트를 천천히 스크롤
await recordClip("2-checklist", async (page) => {
  await page.goto(`${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`);
  const article = page.locator("article").first();
  await article.waitFor();
  await article.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 25);
    await page.waitForTimeout(160);
  }
  await page.waitForTimeout(1000);
});

// 3. 기준서 이동: 커서가 칩으로 이동 -> 클릭 -> 기준서 페이지로 전환되는 것까지
await recordClip("3-standard", async (page) => {
  await page.goto(`${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`);
  const chip = page.locator('a[href^="/standards/"]').first();
  await chip.waitFor();
  await chip.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const chipBox = await chip.boundingBox();
  await moveMouseSmooth(page, chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2, {
    from: { x: 20, y: 20 },
    steps: 25,
  });
  await chip.hover();
  await page.waitForTimeout(500);
  await chip.click();
  await page.waitForSelector("main");
  await page.waitForTimeout(1200);
});

await browser.close();
console.log("전체 완료:", outDir);
