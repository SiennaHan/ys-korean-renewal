import {
	FRAME_CLASS,
	MOCKUP_SCREENS,
	type MockupScreen,
} from "@/screens_ref/screens";
import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useRef } from "react";

/**
 * 목업 대조 — 캡처한 마크업을 이관한 CSS 로 렌더한다.
 *
 * 마크업은 목업에서 그대로 받은 것이라 내가 손으로 쓴 부분이 없다.
 * 여기서 목업과 같아 보이면 CSS 이관이 맞은 것이고, 다르면 이관이 틀린 것이다.
 * 컴포넌트로 쪼갤 때는 이 화면이 기준이 된다.
 *
 * 게임 넷(screens_uiux 의 게임 절)만 여기 없다. 기준은 게임이냐 아니냐가 아니라
 * 목업이 자기완결적이냐 앱 DOM 캡처냐다.
 *
 *  · 활동 · 내비 · VocaShot — 손으로 짠 목업이다. 자기 클래스(g-dark · g-body · choice)와
 *    자기 CSS 로 완결되므로 Storybook 에 떼어 놓아도 그대로 나온다.
 *  · 게임 넷 — 이미 있는 화면을 다시 칠한 것이라 목업 자체가 앱 DOM 캡처다.
 *    클래스가 앱 Tailwind(h-dvh · bg-gray-100 · ps-width-shell)라 앱 CSS·레이아웃
 *    래퍼에 의존하고, 떼어 놓으면 레이아웃이 무너진다. 앱에서 라우트를 열어 대조한다.
 *
 * VocaShot 도 게임이지만 개인 플레이가 신규 화면이라 손으로 짠 목업이 있다 —
 * 그래서 이쪽에 속한다.
 */
const meta = {
	title: "목업 대조",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

function Frame({ screen }: { screen: MockupScreen }) {
	const ref = useRef<HTMLDivElement>(null);

	// 캡처한 마크업에는 framer-motion 이 페이드 도중에 굳혀 놓은 inline opacity:0 이
	// 남아 있다. 목업의 render() 도 같은 보정을 한다 — 없으면 화면이 통째로 비어 보인다.
	// screen.name 은 재실행 방아쇠다 — 스토리를 바꾸면 새 마크업에 다시 보정해야 한다.
	// 지우면 다음 화면이 opacity:0 그대로 남아 통째로 비어 보인다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: 화면이 바뀔 때 다시 보정하려고 넣은 방아쇠다
	useEffect(() => {
		const root = ref.current;
		if (!root) return;
		for (const el of root.querySelectorAll<HTMLElement>('[style*="opacity"]')) {
			if (Number.parseFloat(el.style.opacity) === 0) el.style.opacity = "1";
		}
	}, [screen.name]);

	return (
		<div
			ref={ref}
			className={FRAME_CLASS[screen.group]}
			// 게임 CSS 는 화면을 data-screen 으로 가른다
			data-screen={screen.group === "game" ? screen.name : undefined}
			style={{ height: 720, width: "100%" }}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: 목업에서 캡처한 정적 마크업이다
			dangerouslySetInnerHTML={{ __html: screen.html }}
		/>
	);
}

type Story = StoryObj;

const stories: Record<string, Story> = {};
for (const s of MOCKUP_SCREENS) {
	// 스토리 이름을 그룹__화면 으로 두어 목업 파일과 1:1 로 짝지어 본다
	stories[`${s.group}__${s.name}`] = { render: () => <Frame screen={s} /> };
}

export const activity__wordQuiz = stories.activity__wordQuiz;
export const activity__wordPreview = stories.activity__wordPreview;
export const activity__listen = stories.activity__listen;
export const activity__grammar = stories.activity__grammar;
export const activity__reading = stories.activity__reading;
export const activity__flash = stories.activity__flash;
export const activity__chat = stories.activity__chat;
export const activity__role = stories.activity__role;
export const activity__jamoListen = stories.activity__jamoListen;
export const activity__write = stories.activity__write;
export const activity__write_canvas = stories.activity__write_canvas;
export const activity__write3 = stories.activity__write3;
export const activity__write3_canvas = stories.activity__write3_canvas;
export const activity__speak = stories.activity__speak;
export const activity__wordrep = stories.activity__wordrep;
export const activity__readwrite = stories.activity__readwrite;
export const activity__result = stories.activity__result;
export const activity__report = stories.activity__report;
export const activity__briefing = stories.activity__briefing;
export const activity__loading = stories.activity__loading;
export const activity__failed = stories.activity__failed;
export const activity__micdenied = stories.activity__micdenied;

export const nav__home_resume = stories.nav__home__resume;
export const nav__home_review = stories.nav__home__review;
export const nav__home_none = stories.nav__home__none;
export const nav__book = stories.nav__book__resume;
export const nav__jamo = stories.nav__jamo__resume;

export const vocashot__start = stories.vocashot__start;
export const vocashot__play = stories.vocashot__play;
export const vocashot__result = stories.vocashot__result;
