// 홈 화면 설명 섹션에 넣을 "예시 화면" 스크린샷들 - 블록마다 2장씩 겹쳐서 보여준다.
// deviceScaleFactor:2로 캡처해 표시 크기보다 2배 해상도로 저장 - 그래야 화면에서 다운스케일되며 선명하게 보인다.
// 우리 앱 화면은 라이트/다크 두 벌을 찍어서 방문자의 시스템 테마에 맞는 쪽이 보이게 한다.
// PC와 모바일은 실제 화면 폭이 달라 같은 크롭 기준을 쓰면 한쪽이 과하게 잘리므로,
// 데스크톱 폭(640)과 모바일 폭(390) 각각에서 따로 캡처해 "-mobile" 접미사로 구분한다.
// (samili.com/DART는 외부 사이트라 다크모드가 없어 라이트 한 벌만 찍는다.)
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 2400 }, deviceScaleFactor: 2 });

async function capture(url, locate, out, maxHeight) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const el = locate(page);
  if (maxHeight) {
    const box = await el.boundingBox();
    await page.screenshot({
      path: `public/${out}`,
      clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, maxHeight) },
    });
  } else {
    await el.screenshot({ path: `public/${out}` });
  }
  console.log(`saved public/${out}`);
}

// 시작 지점(예: "관련 감사기준서" 소제목)부터 끝까지 넓게 잘라낸다 - 작은 div 하나만
// 잘라내면 카드 안에서 콘텐츠가 차지하는 비율이 너무 작아 표시할 때 과하게 확대돼 보인다.
async function captureFrom(url, startLocate, widthLocate, out, height) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const startBox = await startLocate(page).boundingBox();
  const widthBox = await widthLocate(page).boundingBox();
  await page.screenshot({
    path: `public/${out}`,
    clip: { x: widthBox.x, y: startBox.y, width: widthBox.width, height },
  });
  console.log(`saved public/${out}`);
}

// main 태그부터 실제 마지막 콘텐츠 엘리먼트까지만 잘라낸다 - main은 flex-1이라 뷰포트
// 높이만큼 늘어나서, 그냥 el.screenshot()하면 실제 내용 아래로 빈 여백이 크게 남는다.
async function captureUpTo(url, mainLocate, lastLocate, out) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const mainBox = await mainLocate(page).boundingBox();
  const lastBox = await lastLocate(page).boundingBox();
  await page.screenshot({
    path: `public/${out}`,
    clip: { x: mainBox.x, y: mainBox.y, width: mainBox.width, height: lastBox.y + lastBox.height - mainBox.y },
  });
  console.log(`saved public/${out}`);
}

async function runAppShots(suffix, h) {
  const APP_SHOTS = [
    ["http://localhost:3000/search?q=삼성전자", (p) => p.locator("main"), `preview-search${suffix}.png`, h.search],
    ["http://localhost:3000/companies/00126380", (p) => p.locator("article").first(), `preview-company${suffix}.png`, h.company],
    ["http://localhost:3000/standards/701", (p) => p.locator("main"), `preview-standard${suffix}.png`, h.standard],
  ];

  for (const [url, locate, out, maxHeight] of APP_SHOTS) {
    await capture(url, locate, out, maxHeight);
  }
  await captureFrom(
    "http://localhost:3000/companies/00126380",
    (p) => p.getByText("관련 감사기준서", { exact: true }).first(),
    (p) => p.locator("article").first(),
    `preview-dart-buttons${suffix}.png`,
    h.dartButtons
  );
  await captureUpTo(
    "http://localhost:3000/industries",
    (p) => p.locator("main"),
    (p) => p.getByText("모든 상장사를 커버하지는 않습니다", { exact: false }),
    `preview-industries-grid${suffix}.png`
  );
  await captureUpTo(
    "http://localhost:3000/industries/2612,264",
    (p) => p.locator("main"),
    (p) => p.locator("ul").first(),
    `preview-industry${suffix}.png`
  );

  await page.emulateMedia({ colorScheme: "dark" });
  for (const [url, locate, out, maxHeight] of APP_SHOTS) {
    await capture(url, locate, out.replace(".png", "-dark.png"), maxHeight);
  }
  await captureFrom(
    "http://localhost:3000/companies/00126380",
    (p) => p.getByText("관련 감사기준서", { exact: true }).first(),
    (p) => p.locator("article").first(),
    `preview-dart-buttons${suffix}-dark.png`,
    h.dartButtons
  );
  await captureUpTo(
    "http://localhost:3000/industries",
    (p) => p.locator("main"),
    (p) => p.getByText("모든 상장사를 커버하지는 않습니다", { exact: false }),
    `preview-industries-grid${suffix}-dark.png`
  );
  await captureUpTo(
    "http://localhost:3000/industries/2612,264",
    (p) => p.locator("main"),
    (p) => p.locator("ul").first(),
    `preview-industry${suffix}-dark.png`
  );
  await page.emulateMedia({ colorScheme: "light" });
}

await page.setViewportSize({ width: 640, height: 2400 });
await runAppShots("", { search: 300, company: 460, standard: 460, dartButtons: 400 });

await page.setViewportSize({ width: 390, height: 2600 });
await runAppShots("-mobile", { search: 380, company: 620, standard: 600, dartButtons: 560 });

// 실제 클릭 시 이동하는 삼일아이닷컴 원문 화면 자체를 보여준다 (K-IFRS 1036 · 자산손상).
// 이 사이트는 데스크톱 2단 레이아웃 전용이라 좁은 뷰포트에서는 깨져 보인다 - 데스크톱용은 넓게 찍는다.
await page.setViewportSize({ width: 1100, height: 2400 });
await capture(
  "https://www.samili.com/acc/Kijun/Kijunjomun.asp?code=1978-1036",
  (p) => p.locator("body"),
  "preview-samili.png",
  420
);

// DART 사업보고서 원문 화면을 보여준다 (삼성전자 2026 사업보고서). 이 사이트는 넓은
// 화면 전제로 만들어져 있어 뷰포트를 좁게 잡으면 로고·메뉴 같은 요소가 상대적으로
// 확대돼 보인다 - 데스크톱용은 실제 레이아웃 그대로 넓게 찍고, 문서 뷰어(캔버스 렌더링이라
// 느림)가 뜰 때까지 충분히 기다려 오른쪽이 비어 보이지 않게 한다.
async function captureDart(out, clip) {
  await page.goto("https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260310002820", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `public/${out}`, clip });
  console.log(`saved public/${out}`);
}
await captureDart("preview-dart.png", { x: 0, y: 0, width: 1100, height: 420 });

// 모바일용은 실제 모바일 폭에서 찍는다 - 로고·회사명 영역만으로도 알아보기 충분하다.
await page.setViewportSize({ width: 390, height: 2400 });
await captureDart("preview-dart-mobile.png", { x: 0, y: 0, width: 390, height: 280 });
await page.goto("https://www.samili.com/acc/Kijun/Kijunjomun.asp?code=1978-1036", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: "public/preview-samili-mobile.png", clip: { x: 0, y: 0, width: 390, height: 280 } });
console.log("saved public/preview-samili-mobile.png");

await browser.close();
