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

/**
 * **iframe 절은 `polishFrame` 이 끝나기를 기다린다 — 시간을 재지 않는다.**
 *
 * 프로토타입이 스스로 `polishFrame(d, v)` 로 게임 화면에 클래스를 주입하고
 * (`ux-control` · `cs-level-shell` · `ps-back` …) `body.dataset.polished='1'` 을 찍는다.
 * `screens_ref/screens.ts` 머리가 「게임 화면은 polishFrame 이 클래스를 주입한 뒤의
 * 상태다」라고 적어 둔 그것이다.
 *
 * 그 전에 읽으면 **클래스 없는 판**이 떠서 `cs_level`·`ps_level` 이 「다르다」로 나온다.
 * 처음에 `waitForTimeout(700)` 으로 뭉갰다가 `cs_level` 이 그래도 어긋났다 —
 * **기다릴 것이 시간이 아니라 플래그**였다(2026-09-03).
 *
 * 프로토타입 주석이 이 함정을 이미 적어 뒀다 — 「d.close() 직후엔 body 가 안 채워져
 * 있다. 그때 polishFrame 을 부르면 아무것도 못 찾고 조용히 지나간다」. 그래서 플래그가
 * 안 오면 **던진다** — 조용히 클래스 없는 판을 비교하면 그 보고가 거짓이 된다.
 */
async function readScreen(key) {
	const hasFrame = await page.locator(`#screen-${key} iframe`).count();
	if (!hasFrame) return await page.locator(`#screen-${key}`).evaluate(UNFADE);

	const frame = page.frameLocator(`#screen-${key} iframe`);
	// **`polishFrame` 은 게임 전용이다.** 표현클립도 iframe 을 쓰지만 그 플래그를
	// 안 찍는다 — 처음에 절을 안 가리고 기다렸다가 clip 넷이 전부 타임아웃해
	// 「못 닿음」으로 빠졌다(2026-09-03).
	const sel = key === "game" ? "body[data-polished='1']" : "body";
	await frame.locator(sel).waitFor({ state: "attached", timeout: 8000 });
	return await frame.locator("body").evaluate(UNFADE);
}

/**
 * **`polished` 플래그만으로는 부족하다.** 프로토타입은 플래그를 *먼저* 찍고
 * `polishFrame` 을 부르므로, body 가 덜 채워진 순간에 걸리면 **플래그는 1인데 클래스는
 * 안 붙는다** — 그 파일 주석이 「아무것도 못 찾고 조용히 지나간다」고 예고한 그것이다.
 * `game__cs_level`(canvas 가 있는 화면)이 실제로 그랬다.
 *
 * 그래서 **주입 결과를 직접 확인한다** — `polishFrame` 은 모든 button 에 `ux-control` 을
 * 붙이므로, button 이 있는데 그 클래스가 없으면 주입이 안 된 것이다. 그러면 한 번 더
 * 렌더시킨다(같은 옵션을 다시 눌러 iframe 을 새로 만들면 플래그도 초기화된다).
 */
async function polished(key) {
	if (key !== "game") return true;
	return await page
		.frameLocator(`#screen-${key} iframe`)
		.locator("body")
		.evaluate((b) => {
			const btns = [...b.querySelectorAll("button")];
			return btns.length === 0 || btns.some((x) => x.classList.contains("ux-control"));
		});
}

/**
 * 화면을 고르고 렌더가 앉을 틈을 준다.
 *
 * **게임은 더 기다려야 한다.** 180ms 로는 `game__cs_level` 이 2,060자만 떠서
 * (캡처는 14,052자) 「다르다」로 나왔다 — canvas 와 진입 애니메이션이 있는 화면이다.
 * 도구가 안 기다린 것을 갈라짐으로 보고하면 그 보고가 거짓이 된다(2026-09-03).
 */
const SETTLE = { game: 700, clip: 400 };

async function pick(key, set, value) {
	await page.click(
		`section[data-mk="${key}"] .control-group[data-set="${set}"] button.option[data-value="${value}"]`,
	);
	await page.waitForTimeout(SETTLE[key] ?? 200);
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
			let html = await readScreen(key);
			if (!(await polished(key))) {
				// 주입이 조용히 지나갔다 — 한 번 더 렌더시킨다(위 주석)
				await pick(key, set, v);
				html = await readScreen(key);
				if (!(await polished(key))) {
					failed.push([name, "polishFrame 주입이 두 번 다 조용히 지나갔다"]);
					continue;
				}
			}
			fs.writeFileSync(path.join(outDir, `${name}.html`), html);
			wrote.push(name);
		} catch (e) {
			failed.push([name, String(e).split("\n")[0].slice(0, 90)]);
		}
	}
}

await browser.close();
console.log(JSON.stringify({ wrote, failed, pageErrors }, null, 1));
