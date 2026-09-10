import { useCallback, useEffect, useState } from "react";

/**
 * **들어설 때 이미 마이크가 막혀 있나** — 물어보지 않고 알아낸다.
 *
 * 말하기가 활동 자체인 활동(역할극)은 마이크가 없으면 할 것이 하나도 없다.
 * 그래서 목업이 그 경우를 **전체 화면**으로 따로 그려 뒀다
 * (`screens_ref/activity__micdenied.html`). 이 훅이 그 화면을 띄울지 정한다.
 *
 * **`getUserMedia` 를 쓰지 않는다.** 그것을 부르면 브라우저가 권한 창을 띄운다 —
 * 활동에 들어서자마자 묻는 것은 사용자가 시작하지 않은 일이고, 한 번 거절하면
 * 그 뒤로 계속 막힌다. `Permissions API` 는 **묻지 않고 지금 상태만** 준다.
 *
 * **모르면 막힌 것으로 단정하지 않는다.** Firefox 는 `microphone` 조회에
 * `TypeError` 를 내고, 옛 Safari 에는 `navigator.permissions` 자체가 없다.
 * 그때는 평소 화면을 그리고, 녹음을 누를 때 활동 중 모달이 맡는다 —
 * **틀린 전체 화면으로 활동을 막는 것이 더 나쁘다.**
 *
 * 상태 변화를 구독하지 않는다(`status.onchange`). 사용자가 설정을 바꾸고
 * 돌아오는 길은 화면의 「켰어요」 버튼이고, 그것이 `recheck()` 를 부른다 —
 * 구독을 더하면 같은 일을 두 곳이 하게 된다.
 */
export function useMicDeniedOnEntry() {
	const [denied, setDenied] = useState(false);

	const recheck = useCallback(async () => {
		try {
			const status = await navigator.permissions.query({
				// `PermissionName` 에 microphone 이 없는 TS 판이 있다
				name: "microphone" as PermissionName,
			});
			setDenied(status.state === "denied");
		} catch {
			setDenied(false);
		}
	}, []);

	useEffect(() => {
		void recheck();
	}, [recheck]);

	return { micDenied: denied, recheckMic: recheck };
}
