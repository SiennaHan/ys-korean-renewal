import { useEffect, useRef } from "react";

/**
 * 화면이 바뀔 때 초점을 새 화면으로 옮긴다.
 *
 * 왜 필요한가 — 이 앱은 SPA 라 화면을 바꿔도 페이지가 새로 로드되지 않는다.
 * React 가 DOM 만 갈아 끼우면 **내가 누른 버튼이 사라지고 초점이 `<body>` 로
 * 떨어진다.** 그러면 둘이 깨진다.
 *   · 스크린리더가 아무 말도 안 한다 — 화면이 바뀐 줄을 모른다
 *   · 다음 Tab 이 문서 맨 처음으로 간다 — 화면마다 처음부터 다시 훑어야 한다
 * 보통 웹은 페이지가 새로 로드되며 브라우저가 이 일을 해 주는데, SPA 는
 * 아무도 안 해 준다.
 *
 * 쓰는 법 — 화면을 가르는 값(`gameState` 같은 것)을 넘기고, 돌려받은 ref 를
 * **그 화면을 감싸는 칸**에 붙인다. 그 칸에는 `tabIndex={-1}` 도 같이 준다
 * (-1 이라 Tab 순서에는 안 들어가고 코드로만 초점을 줄 수 있다).
 *
 * ```tsx
 * const frameRef = useScreenFocus(gameState, !contentLoading);
 * return <div ref={frameRef} tabIndex={-1} className="game-frame" aria-label="…">
 * ```
 *
 * **`ready` 는 "지금 초점을 줘도 되는가" 다.** 로딩 칸에 초점을 줬다가 진짜
 * 화면으로 갈아 끼워지면 초점을 도로 잃는다. `false` 인 동안은 참고, `true` 가
 * 되는 순간 옮긴다.
 *
 * **첫 마운트에도 옮긴다.** 전에는 여기 "첫 마운트에는 옮기지 않는다" 고
 * 적혀 있었는데, 이 훅을 쓰는 다섯은 **전부 라우트 컴포넌트**다(`routes/main/game/*`).
 * 마운트된다는 것은 곧 **사람이 그 주소로 이동했다**는 뜻이고, 그건 보통 웹에서
 * 페이지가 새로 로드되며 초점이 옮겨지는 바로 그 자리다. 게임 목록에서 게임을
 * 누르면 누른 버튼이 사라지며 초점이 `<body>` 로 떨어지는데, 옮기지 않으면
 * 아무것도 안 읽히고 Tab 은 문서 맨 처음으로 간다.
 *
 * 눈으로 보는 사람에게 초점 테두리가 뜨지는 않는다 — 코드로 준 초점은
 * `:focus-visible` 을 켜지 않는다.
 *
 * **붙이는 자리를 목업 대조 밖으로 둔다.** `tabIndex` 는 비교기의 `DROP_ATTRS`
 * 에 없어서 대조가 보는 자리에 붙이면 화면이 갈린다. 게임은 `SCREEN_ROOT` 가
 * 화면별 뿌리(`ps-level-shell` 등)부터 자르므로 그 **바깥**인 `.game-frame` 에
 * 붙이면 된다. VocaShot 은 `.vocashot-frame` 이 껍데기째 벗겨진다 —
 * 다만 **`class` 가 첫 속성이어야** 벗겨진다(`activity-parity.tsx` 참고).
 */
export function useScreenFocus<T>(screenKey: T, ready = true) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!ready) return;
		ref.current?.focus();
	}, [screenKey, ready]);

	return ref;
}
