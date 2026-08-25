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
 * 쓰는 법 — 화면을 가르는 값(gameState 같은 것)을 넘기고, 돌려받은 ref 를
 * **그 화면을 감싸는 칸**에 붙인다. 그 칸에는 `tabIndex={-1}` 도 같이 준다
 * (-1 이라 Tab 순서에는 안 들어가고 코드로만 초점을 줄 수 있다).
 *
 * ```tsx
 * const frameRef = useScreenFocus(gameState);
 * return <div ref={frameRef} tabIndex={-1} className="game-frame" …>
 * ```
 *
 * **붙이는 자리를 목업 대조 밖으로 둔다.** `tabIndex` 는 비교기의 `DROP_ATTRS`
 * 에 없어서 대조가 보는 자리에 붙이면 화면이 갈린다. 게임은 `SCREEN_ROOT` 가
 * 화면별 뿌리(`ps-level-shell` 등)부터 자르므로 그 **바깥**인 `.game-frame`
 * 에 붙이면 된다.
 *
 * 첫 마운트에는 옮기지 않는다 — 그때는 사람이 아직 이 화면을 부른 적이 없고,
 * 화면에 들어오자마자 초점이 움직이면 도리어 놀란다.
 */
export function useScreenFocus<T>(screenKey: T) {
	const ref = useRef<HTMLDivElement>(null);
	const first = useRef(true);

	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		ref.current?.focus();
	}, [screenKey]);

	return ref;
}
