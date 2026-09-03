/**
 * 프로토타입(`docs/screens_SOT.html`)을 헤드리스로 띄워 화면 마크업을 떠서 낸다.
 *
 * **혼자 쓰지 마라** — `mockup-source-diff.py` 가 부른다. 이 파일은 브라우저 쪽만 하고
 * 비교·정규화는 파이썬이 한다(`activity-parity-diff.py` 의 규약을 빌려 쓴다).
 *
 * ## 왜 브라우저가 필요한가
 *
 * 프로토타입은 **빌더 함수가 화면을 그리는 실행물**이다. 그래서 정적으로는 읽을 수
 * 없다 — `BLOCKERS.md` §5-c 의 「어떻게 재현하나」가 산문으로 적어 둔 절차를 여기에
 * 굳혔다. 렌더 자리는 절마다 다르다 — `readScreen()` 주석 참고.
 *
 * ## 화면에 어떻게 닿나 — 절마다 다르다
 *
 * 상단 `button.deck-btn[data-mk]` 로 절을 고르고, 절 안의
 * `.control-group[data-set=…] button.option[data-value]` 로 화면을 고른다.
 *
 *   act    data-set="activity" 네 묶음 — 20화면
 *   nav    data-set="screen" × data-set="task" — 조합 아홉 중 캡처가 있는 다섯
 *   game   data-set="v" — 17화면
 *   clip   data-set="v" — 4화면
 *   voca   **화면 선택자가 없다**(폭만) — 시작 화면 하나만 닿고 나머지 넷은
 *          그 화면까지 플레이해야 한다. 못 닿는 것으로 보고한다
 *
 * **닿지 못하는 것을 조용히 빼지 않는다.** 이름을 찍어서 낸다 — 커버리지가 조용히
 * 줄면 「모두 같다」가 거짓이 된다.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) {
	console.error("usage: node mockup-source-capture.mjs <url> <outDir>");
	process.exit(2);
}

/** 절 → 화면을 고르는 `data-set` 이름. voca 는 없다(위 주석) */
const PICKER = { act: "activity", nav: null, game: "v", clip: "v", voca: null };

/**
 * nav 는 두 축의 조합이다. 캡처가 있는 다섯만 뜬다.
 *
 * **「오늘 할 일」 축은 홈에만 있다** — `book`·`jamo` 를 고르면 그 버튼이 사라져서,
 * 처음에 무조건 누르다가 둘이 타임아웃했다(2026-09-03). 있을 때만 누른다.
 * `null` 은 「그 축을 건드리지 않는다」는 뜻이다.
 */
const NAV_COMBOS = [
	["home", "resume"],
	["home", "review"],
	["home", "none"],
	["book", null],
	["jamo", null],
];

/** 절 → 캡처 파일명 접두 */
const PREFIX = { act: "activity", nav: "nav", game: "game", clip: "clip", voca: "vocashot" };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
await page.goto(url, { waitUntil: "networkidle" });

/** 절을 열고, 렌더가 끝날 틈을 준다 */
async function openSection(key) {
	await page.click(`button.deck-btn[data-mk="${key}"]`);
	await page.waitForTimeout(200);
}

/**
 * `#screen-<key>` 의 마크업.
 *
 * **절마다 렌더 방식이 다르다**(2026-09-03 실측) — `game`·`clip` 은 CSS 를 가르려고
 * **iframe** 안에 그리고, `act`·`nav`·`voca` 는 그 요소에 **직접** 그린다.
 * 처음에 iframe 만 보다가 활동·내비·VocaShot 이 전부 타임아웃했다.
 *
 * **framer-motion 이 페이드 도중에 굳혀 놓은 inline `opacity:0` 을 되돌린다** —
 * 프로토타입의 render() 도 같은 보정을 하고 Storybook 의 `Frame` 도 한다.
 * 없으면 화면이 통째로 빈 것으로 떠서 「다르다」가 거짓으로 나온다.
 */
const UNFADE = (root) => {
	for (const el of root.querySelectorAll('[style*="opacity"]')) {
		if (Number.parseFloat(el.style.opacity) === 0) el.style.opacity = "1";
	}
	return root.innerHTML.trim();
};

async function readScreen(key) {
	const hasFrame = await page.locator(`#screen-${key} iframe`).count();
	if (hasFrame) {
		const frame = page.frameLocator(`#screen-${key} iframe`);
		await frame.locator("body").waitFor({ state: "attached", timeout: 5000 });
		return await frame.locator("body").evaluate(UNFADE);
	}
	return await page.locator(`#screen-${key}`).evaluate(UNFADE);
}

async function pick(key, set, value) {
	await page.click(
		`section[data-mk="${key}"] .control-group[data-set="${set}"] button.option[data-value="${value}"]`,
	);
	await page.waitForTimeout(180);
}

fs.mkdirSync(outDir, { recursive: true });
const wrote = [];
const failed = [];

for (const key of ["act", "nav", "game", "clip", "voca"]) {
	await openSection(key);
	const set = PICKER[key];

	if (key === "nav") {
		for (const [screen, task] of NAV_COMBOS) {
			// 캡처 이름은 `nav__book__resume` 이다 — 축을 안 건드려도 이름은 그대로다
			const name = `nav__${screen}__${task ?? "resume"}`;
			try {
				await pick(key, "screen", screen);
				if (task) await pick(key, "task", task);
				fs.writeFileSync(path.join(outDir, `${name}.html`), await readScreen(key));
				wrote.push(name);
			} catch (e) {
				failed.push([name, String(e).split("\n")[0].slice(0, 90)]);
			}
		}
		continue;
	}

	if (!set) {
		// voca — 기본으로 열리는 화면 하나만 뜬다
		const name = `${PREFIX[key]}__start`;
		try {
			fs.writeFileSync(path.join(outDir, `${name}.html`), await readScreen(key));
			wrote.push(name);
		} catch (e) {
			failed.push([name, String(e).split("\n")[0].slice(0, 90)]);
		}
		continue;
	}

	const values = await page.evaluate(
		({ k, s }) =>
			[
				...document
					.querySelector(`section[data-mk="${k}"]`)
					.querySelectorAll(`.control-group[data-set="${s}"] button.option`),
			].map((b) => b.dataset.value),
		{ k: key, s: set },
	);
	for (const v of values) {
		const name = `${PREFIX[key]}__${v}`;
		try {
			await pick(key, set, v);
			fs.writeFileSync(path.join(outDir, `${name}.html`), await readScreen(key));
			wrote.push(name);
		} catch (e) {
			failed.push([name, String(e).split("\n")[0].slice(0, 90)]);
		}
	}
}

await browser.close();
console.log(JSON.stringify({ wrote, failed, pageErrors }, null, 1));
