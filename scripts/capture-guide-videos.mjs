// 홈 화면 "이용 가이드"에 넣을 짧은 화면 녹화 3개(webm)와, 각 녹화의 실제 첫 프레임과
// 완전히 동일한 poster 이미지를 함께 만든다(같은 페이지 로드 상태에서 그대로 캡처하므로
// poster와 GIF 첫 화면이 어긋나지 않는다). 마우스 커서도 화면에 그려 넣어서 어디를
// 클릭하는지 보이게 한다.
// 실행 전 로컬 dev 서버(localhost:3000)가 떠 있어야 한다.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "guide");
const base = "http://localhost:3000";
// 31:16 비율 유지하면서 Tailwind sm(640px) 브레이크포인트를 넘겨야 한다 - 그보다 좁으면
// 홈 화면의 이용가이드/업종 그리드가 모바일용 1~2열로 쌓여서 화면이 완전히 달라 보인다.
const SIZE = { width: 744, height: 384 };
const ACCENT = "#d04a02"; // 사이트 accent 주황색과 맞춤

const browser = await chromium.launch();

// 2번(확인) 클립이 끝나는 스크롤 위치를 실제 페이지에서 매번 다시 계산한다(하드코딩된
// 픽셀 값은 페이지 레이아웃이 바뀔 때마다 깨진다 - 예: 회사 바로가기 바가 추가되면서
// 칩 위치가 1633px에서 2486px로 밀렸던 적이 있었다). 관련 기준서 칩이 화면 하단 근처에
// 오도록 필요한 스크롤량을 구한다. 3번(기준서 이동)이 이 위치에서 그대로 이어서 시작한다.
async function computeChecklistScrollPx(url) {
  const probe = await browser.newPage({ viewport: SIZE });
  await probe.goto(url, { waitUntil: "networkidle" });
  const chip = probe.locator('a[href^="/standards/"]').first();
  await chip.waitFor();
  const box = await chip.boundingBox();
  await probe.close();
  const targetY = SIZE.height - box.height - 40; // 화면 하단에서 40px 여유
  return Math.max(0, Math.round(box.y - targetY));
}

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

// 클릭 직전에 대상 요소 주변에 강조 테두리를 그려 넣는다(실제 페이지엔 영향 없음).
async function ringHighlight(page, box, color = ACCENT) {
  await page.evaluate(
    ({ b, color }) => {
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

async function recordClip(name, fn) {
  const tmpDir = path.join(outDir, `_tmp_${name}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: tmpDir, size: SIZE },
  });
  await context.addInitScript(CURSOR_INIT_SCRIPT);
  // 로컬 dev 서버 전용 표시(화면 하단의 Next.js 개발 인디케이터)는 프로덕션에는 없는
  // UI라 녹화에 들어가면 안 된다 - 캡처 전에 숨긴다.
  await context.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.head?.appendChild(style) ?? document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });
  const page = await context.newPage();

  // 첫 프레임: 페이지가 안정된 직후, 커서/하이라이트가 나타나기 전 상태를 그대로
  // poster PNG로도 저장한다 - GIF 재생 시작 프레임과 완전히 동일해진다. 새 탭이 열리고
  // 페이지가 로드되기 전의 흰 화면을 늘리지 않도록 별도의 정지 구간은 넣지 않는다.
  await page.goto(fn.url);
  await fn.waitReady(page);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), clip: { x: 0, y: 0, ...SIZE } });

  await fn.play(page);
  await page.waitForTimeout(1000);

  await context.close();
  const [file] = fs.readdirSync(tmpDir);
  fs.renameSync(path.join(tmpDir, file), path.join(outDir, `${name}.webm`));
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`완료: ${name}.webm / ${name}.png`);
}

// Next dev 서버는 첫 요청에서 페이지를 즉석 컴파일하느라 느리다 - 녹화 전에 미리 한 번씩
// 방문해서 워밍업해두면, 실제 녹화 중에는 오래 걸리는 컴파일 대기가 흰 화면으로 찍히지 않는다.
{
  const warmupPage = await browser.newPage();
  for (const url of [
    base,
    `${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`,
  ]) {
    await warmupPage.goto(url, { waitUntil: "networkidle" });
  }
  await warmupPage.close();
}

const CATEGORY_URL = `${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`;
const CHECKLIST_SCROLL_PX = await computeChecklistScrollPx(CATEGORY_URL);
console.log("계산된 스크롤량:", CHECKLIST_SCROLL_PX, "px");

// 1. 검색: 입력창으로 커서 이동 -> 클릭 -> 타이핑 -> 자동완성 결과로 커서 이동 -> 클릭
await recordClip("1-search", {
  url: base,
  waitReady: async (page) => {
    const input = page.locator('input[name="q"]');
    await input.waitFor();
    // 620px 캡처 폭은 Tailwind sm(640px) 미만이라 이용가이드/업종 그리드가 1열로
    // 쌓이면서 검색창이 화면 훨씬 아래로 밀려난다 - 뷰포트 안으로 스크롤해줘야 한다.
    await input.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(100);
  },
  play: async (page) => {
    const input = page.locator('input[name="q"]');
    const inputBox = await input.boundingBox();
    await moveMouseSmooth(page, inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2, {
      from: { x: 20, y: 20 },
      steps: 25,
      stepDelay: 16,
    });
    await page.waitForTimeout(150);
    await page.click('input[name="q"]');
    await page.waitForTimeout(300);
    await page.type('input[name="q"]', "삼성", { delay: 180 });
    await page.waitForSelector("#company-search-listbox li:nth-child(1)");
    await page.waitForTimeout(500);
    const firstResult = page.locator("#company-search-listbox li").first();
    const resultBox = await firstResult.boundingBox();
    await moveMouseSmooth(page, resultBox.x + resultBox.width / 2, resultBox.y + resultBox.height / 2, {
      steps: 18,
      stepDelay: 16,
    });
    await page.waitForTimeout(400);
    await firstResult.click();
    await page.waitForTimeout(1000);
  },
});

// 2. 확인: 카테고리 페이지로 이동해서 체크리스트를 천천히 스크롤 (관련 기준서 칩이 보이는
// 지점에서 끝난다 - 3번 클립이 정확히 이 위치에서 이어받는다)
await recordClip("2-checklist", {
  url: `${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`,
  waitReady: async (page) => {
    await page.locator("article").first().waitFor();
  },
  play: async (page) => {
    const ticks = 18;
    const perTick = CHECKLIST_SCROLL_PX / ticks;
    for (let i = 0; i < ticks; i++) {
      await page.mouse.wheel(0, perTick);
      await page.waitForTimeout(160);
    }
    await page.waitForTimeout(800);
  },
});

// 3. 기준서 이동: 2번이 끝난 스크롤 위치 + 강조 표시가 이미 된 상태로 시작(첫 프레임) ->
// 클릭 -> 기준서 페이지로 전환 -> 스크롤
await recordClip("3-standard", {
  url: `${base}/industries/212/%EC%98%81%EC%97%85%EA%B6%8C%20%EC%86%90%EC%83%81`,
  waitReady: async (page) => {
    const chip = page.locator('a[href^="/standards/"]').first();
    await chip.waitFor();
    await page.mouse.wheel(0, CHECKLIST_SCROLL_PX);
    await page.waitForTimeout(100);
    const chipBox = await chip.boundingBox();
    const cx = chipBox.x + chipBox.width / 2;
    const cy = chipBox.y + chipBox.height / 2;
    await page.mouse.move(cx, cy); // 첫 프레임부터 커서가 칩 위에 있도록 즉시 배치
    await page.evaluate(({ x, y }) => (window.__lastMouse__ = { x, y }), { x: cx, y: cy });
    await ringHighlight(page, chipBox);
  },
  play: async (page) => {
    const chip = page.locator('a[href^="/standards/"]').first();
    await page.waitForTimeout(900);
    await chip.click();
    await page.waitForSelector("main");
    // Next.js는 클라이언트 사이드 이동이라 페이지가 새로고침되지 않는다 - 직접 그려 넣은
    // 하이라이트 링이 새 페이지까지 그대로 남아있으므로 명시적으로 지워준다.
    await page.evaluate(() => document.getElementById("__ring_highlight__")?.remove());
    await page.waitForTimeout(500);
    // 도착한 기준서 페이지도 조금 스크롤해서 내용을 보여준다.
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 25);
      await page.waitForTimeout(220);
    }
    await page.waitForTimeout(800);
  },
});

await browser.close();
console.log("전체 완료:", outDir);
