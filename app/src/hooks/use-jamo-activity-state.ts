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
 * ## 정답률은 아직 안 센다 — 일부러다
 *
 * §28 은 자모 쓰기(`sub` 2·4·6)와 고르기(`sub` 5)의 `gradedCount` 를 문항 수로
 * 정했다. 그런데 **여섯 화면 중 어느 것도 첫 시도 정답을 기록하지 않는다** —
 * `saveLearningRecord` 를 부르는 자모 화면이 0개다(자모는 학습 기록이 아예 없다).
 * 분모만 채우면 결과 화면이 **0%** 로 그린다. 그건 "못 맞혔다" 는 거짓말이고,
 * `gradedCount == 0` 이면 "—" 로 나오는 것이 사실에 맞다.
 *
 * 그래서 지금은 셋 다 0 으로 두고 진행 위치와 응답 수만 사실대로 쓴다.
 * 첫 시도 기록을 여섯에 넣는 것은 따로 할 일이다 — BLOCKERS.md §9-c.
 *
 * ## 발음(`sub` 1·3)은 원래 0 이다
 *
 * STT 오판이 잦아 채점하지 않기로 확정돼 있다(§28 · §26). 이쪽은 임시가 아니다.
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
	const { total, index, onResume, done } = opts;
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
	 * `answeredCount` 는 **끝까지 갔으니 문항 수 전부**다 — 자모는 건너뛰어도
	 * 다음으로 넘어가므로 응답하지 않은 문항이 섞일 수 있는데, 그것을 가려내려면
	 * 화면마다 응답 여부를 세야 한다. 지금은 세는 자리가 없어 전부로 둔다.
	 * 이 값이 진행률의 분자이므로 **덜 세는 것보다 과하게 세는 쪽으로 기울었다는
	 * 것을 알고 두는 것**이다 — 위 정답률과 같은 자리에서 같이 고칠 일이다.
	 */
	const reported = useRef(false);
	useEffect(() => {
		if (enterOnly || !done || reported.current || total === 0) return;
		reported.current = true;
		void complete({
			answeredCount: total,
			gradedCount: 0,
			correctCount: 0,
		});
	}, [done, total, complete, enterOnly]);

	return { practice };
}
