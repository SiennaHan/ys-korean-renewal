import { useActivityState } from "@/hooks/use-activity-state";
import { useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/**
 * 자모 여섯 화면의 활동 상태 — 진입 · 이동 저장 · 완료.
 *
 * 여섯이 한 라우트(`/learn/jamo?level&lesson&group&sub`) 아래 `sub` 로 갈리고
 * 문항 구조가 같아서(`problemIndex` / `problemList.length` / 끝나면 `isExit`)
 * 배선도 같다. 그래서 화면마다 베끼지 않고 여기 모았다.
 *
 * **`sub` 를 반드시 같이 보낸다** — shell_spec §32. 빠지면 여섯이 **같은 상태 행**을
 * 써서, 하나를 끝내면 나머지도 완료로 보이고 이어할 위치가 서로를 덮는다.
 * `menuType` 은 여섯 모두 `"jamo"` 다(dev_spec §10 의 8종 중 하나).
 *
 * ## 자모는 채점하지 않는다 — 확정이다, 미완이 아니다
 *
 * **여섯 다 `gradedCount = 0` 이고 결과의 정답률은 "—" 다.**
 * 기획 확정 2026-08-27 — shell_spec §28 · dev_spec §11 도 같은 판에 고쳤다.
 * 발음(`sub` 1·3)은 STT, 쓰기(`sub` 2·4·6)는 OCR 판정이고 고르기(`sub` 5)까지
 * 같이 뺀다. 한글을 처음 익히는 자리라 점수를 매길 자리가 아니다.
 *
 * **0 으로 두는 것이 재는 것보다 정확하다.** 분모만 채우면 화면이 "정답률 0%" 로
 * 그리는데 그건 "다 틀렸다" 는 말이고 사실이 아니다. `—` 는 "재지 않았다" 다.
 *
 * 그러니 **여기에 첫 시도 정답 기록을 넣지 마라.** 여섯 화면 중
 * `saveLearningRecord` 를 부르는 것이 0개인데 그것은 빠뜨린 것이 아니라
 * 이 결정과 맞는 상태다. `correctCount` 도 같은 이유로 0 이다.
 *
 * 플래시카드·롤플레잉도 같은 이유로 0 이다(자기 평가 · STT).
 */
export function useJamoActivityState(opts: {
	/** 전체 문항 수. 아직 모르면 0 을 넘긴다 */
	total: number;
	/** 지금 문항 위치 */
	index: number;
	/** 서버가 준 위치로 옮긴다. 한 번만 불린다 */
	onResume: (index: number) => void;
	/** 마지막 문항까지 끝냈나 */
	done: boolean;
	/**
	 * **응답한 문항 수를 센다.** 완료 시점에 한 번 불린다(그래서 함수다 —
	 * 값으로 받으면 세는 쪽이 매 응답마다 다시 렌더해야 한다).
	 *
	 * 전에 여기서 `answeredCount` 로 `total` 을 그대로 보냈다. **그때는 서버가
	 * "마지막 문항에 닿으면 완료" 였으므로 티가 안 났는데**, 2026-08-27 에 완료 기준이
	 * **「건너뛴 문항 없이 모두 응답」** 으로 바뀌면서(`repo_activity_state.complete`)
	 * 그 값이 곧 완료 판정이 됐다 — `total` 을 보내면 **다 건너뛰고 끝까지 넘긴 것도
	 * 완료**가 되어, 그 기준을 세운 이유가 자모에서만 사라진다.
	 *
	 * 그래서 필수다. `enter-only` 는 완료를 안 보내므로 `() => 0` 이면 된다.
	 */
	countAnswered: () => number;
	/**
	 * `"enter-only"` — 진입만 알리고 위치도 완료도 보내지 않는다.
	 *
	 * 자모 발음(`sub=1`)이 그렇다. 그 화면은 **순서대로 푸는 활동이 아니다** —
	 * 묶음 탭에서 낱말을 골라 다니며 발음해 보는 자리라 정본 목업
	 * (`activity__speak.html`)에 진행바가 아예 없고(칸 0), 끝났다는 신호도 없다
	 * (`setIsExit(true)` 가 주석으로 남아 있다). 없는 위치를 지어내 저장하면
	 * 이어하기가 엉뚱한 자리를 가리키고, 없는 완료를 지어내면 스트릭이 오른다.
	 *
	 * 그래서 "열었다" 만 남긴다. 이 활동의 완료를 무엇으로 볼지는 기획 결정이다.
	 */
	mode?: "linear" | "enter-only";
}) {
	const { total, index, onResume, done, countAnswered } = opts;
	const enterOnly = opts.mode === "enter-only";
	const { level, lesson, sub } = useSearch({ from: "/learn/jamo" });

	const { startIndex, practice, saveProgress, complete } = useActivityState({
		bookId: level,
		chapterSeq: lesson,
		menuType: "jamo",
		sub,
		totalItems: total || null,
	});

	/*
	 * 서버가 준 위치로 한 번만 옮긴다.
	 *
	 * `onResume` 은 화면에서 매 렌더 새로 만들어지는 함수일 수 있으므로 ref 로
	 * 읽는다 — 의존성에 넣으면 이 효과가 매 렌더 다시 돌아 학습자가 넘긴 문항을
	 * 계속 되돌린다.
	 */
	const resumeRef = useRef(onResume);
	resumeRef.current = onResume;
	const jumped = useRef(false);
	useEffect(() => {
		if (enterOnly) return;
		if (jumped.current || startIndex === null || total === 0) return;
		jumped.current = true;
		if (startIndex > 0 && startIndex < total) resumeRef.current(startIndex);
	}, [startIndex, total, enterOnly]);

	/** 문항을 넘기면 알린다. ✕ 로 나가도 이 값이 이미 저장돼 있다 */
	useEffect(() => {
		if (enterOnly) return;
		saveProgress(index);
	}, [index, saveProgress, enterOnly]);

	/*
	 * 끝냈을 때 한 번 완료를 알린다.
	 *
	 * `answeredCount` 는 화면이 센 **실제 응답 수**다 — 건너뛴 문항은 빠진다.
	 * 서버가 이 값을 `total_items` 와 견주어 완료인지 판정하므로(위 `countAnswered`
	 * 주석) 여기서 부풀리면 건너뛴 활동이 완료로 남는다.
	 */
	const answeredRef = useRef(countAnswered);
	answeredRef.current = countAnswered;

	/*
	 * **한 번만 보내면 안 된다.** 건너뛴 문항이 남으면 서버가 `in_progress` 로 두고
	 * (`repo_activity_state.complete`), 학습자가 진행바로 돌아가 그것을 풀면 그때
	 * 완료가 되어야 한다 — shell_spec 시나리오 14. 처음엔 `reported` 불리언 하나로
	 * 막았는데, 그러면 **돌아가 풀어도 다시 안 보내서 영원히 미완료**였다.
	 * 브라우저에서 실제로 그렇게 나왔다(a=4 로 멈춤).
	 *
	 * 그래서 보낸 **값**을 기억한다 — 응답 수가 늘면 다시 보내고, 같으면 안 보낸다.
	 * `index` 를 의존성에 두는 것이 방아쇠다: 문항을 옮길 때마다 다시 세어 본다.
	 * (자모는 끝에 닿아도 `isExit` 이 참으로 남으므로 `done` 만으로는 안 돈다.)
	 */
	const sentAnswered = useRef<number | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `index` 는 몸통에서 안 읽는다 — **일부러 넣은 재실행 방아쇠**다. 응답 수는 ref 안의 Set 이라 늘어도 렌더가 안 나므로, 문항을 옮기는 것을 방아쇠로 삼아 다시 세어 본다. 빼면 건너뛴 문항을 돌아가 풀어도 완료가 다시 안 나간다(위 주석의 a=4 멈춤)
	useEffect(() => {
		if (enterOnly || !done || total === 0) return;
		const answeredCount = answeredRef.current();
		if (sentAnswered.current === answeredCount) return;
		sentAnswered.current = answeredCount;
		void complete({ answeredCount, gradedCount: 0, correctCount: 0 });
	}, [done, total, index, complete, enterOnly]);

	return { practice };
}
