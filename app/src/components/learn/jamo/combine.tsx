/**
 * 자모 — 자음-모음 조합하기
 *
 * 구 경로 /book/chapter/unit/write/$code 에서 옮겨 왔다.
 * 그쪽은 리다이렉트만 남는다.
 *
 * 2026-08-24: 라우트에서 컴포넌트로 옮겼다. 자모는 /learn/jamo 한 라우트가
 * sub 로 갈라 이 컴포넌트들을 부른다 — URL 에서 콘텐츠 ID 를 걷어냈다.
 * moduleCode 는 주소 (과·묶음·활동) 에서 풀어 받는다 — shared/data/jamo.ts
 */
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	AudioRow,
	ComboTarget,
	Dock,
	JamoSection,
	PrimaryButton,
	ProblemCard,
} from "@/components/main/activity";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { SpeakerIcon } from "@/assets/icons";
import HangulTracingCanvas, {
	type HangulTracingCanvasHandle,
} from "@/components/draw/HangulTracingCanvas";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { JamoHeader, ProblemHeader } from "@/components/problem/scene/header";
import { ModuleTitle } from "@/components/problem/scene/title";
import { env } from "@/config/env";
import { combineHangul } from "@/lib/hangul-utils";
import { chapters } from "@/shared/data/chapter";
import { jamoProblems } from "@/shared/data/jamo";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import type { ModuleType, ProblemType } from "@/types/book.types";
import clsx from "clsx";
import { ChevronRight, CircleCheckBig, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const baseButton =
	"w-full max-w-[500px] h-[56px] bg-[#0180FF] text-white rounded-[10px] flex items-center justify-center cursor-pointer \
										hover:bg-[#0180FFdd] active:bg-[#0180FFcc] \
									  disabled:text-[#ADB3BE] disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-[#E5E8EC] disabled:hover:bg-[#bbb]";
const baseCardButton =
	"w-[46px] h-[46px] rounded-[10px] bg-[#fff] text-[20px] font-bold flex items-center justify-center cursor-pointer \
												hover:bg-gray-200 active:bg-gray-300";
const selectedCardButton = "!bg-[#359AFF] text-white";

const baseControlButton =
	"px-[12px] py-[6px] text-[12px] font-semibold rounded-[6px] hover:opacity-[0.8] active:opacity-[0.9] cursor-pointer\
													disabled:text-[#ADB3BE] disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-[#E5E8EC] disabled:hover:bg-[#bbb]";

export default function JamoCombine({ moduleCode }: { moduleCode: string }) {
	const code = moduleCode;
	const { t } = useTranslation();
	const router = useRouter();
	const sound = useSoundEffects();

	const module: ModuleType | undefined = modules.find(
		(item) => item.code === code,
	);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const problemList = jamoProblems.filter(
		(item) => item.module_code === code && item.scene_num === 1,
	);

	const [problemIndex, setProblemIndex] = useState(0);
	const [problem, setProblem] = useState<ProblemType | undefined>(undefined);
	const [consonant, setConsonant] = useState<string | undefined>(undefined);
	const [vowel, setVowel] = useState<string | undefined>(undefined);
	const [combined, setCombined] = useState<string | undefined>(undefined);

	const [consonantList, setConsonantList] = useState<string[]>([]);
	const [vowelList, setVowelList] = useState<string[]>([]);

	const tracingRef = useRef<HangulTracingCanvasHandle>(null);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined);

	const [isSucceed, setIsSucceed] = useState(false);
	/*
	 * 힌트 — 누르면 만들 글자가 1초만 보인다. 듣고 맞히는 문제라 답을 늘
	 * 보여 주면 문제가 없어지고, 아예 못 보면 무엇을 만들지 알 길이 없다.
	 * 타이머는 언마운트·재클릭 때 반드시 지운다(안 지우면 새 문항에서 터진다).
	 */
	const [hintOn, setHintOn] = useState(false);
	const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const showHint = () => {
		if (hintTimer.current) clearTimeout(hintTimer.current);
		setHintOn(true);
		hintTimer.current = setTimeout(() => setHintOn(false), 1000);
	};
	useEffect(
		() => () => {
			if (hintTimer.current) clearTimeout(hintTimer.current);
		},
		[],
	);
	const [isLastPage, setIsLastPage] = useState(false);
	const [isExit, setIsExit] = useState(false);

	const exit = () => router.history.back();

	const [stage, setStage] = useState<"select" | "write">("select");

	/*
	 * 건너뛰기는 next() 를 쓰지 않는다. next() 는 조합 단계에서 **정답 소리를 내고**
	 * 따라쓰기 단계로 넘기는 것이라 "잘했다" 는 신호가 된다 — 건너뛸 때 낼 소리가
	 * 아니다. 셸의 건너뛰기는 "이 문항을 건너뛴다" 는 뜻이므로 단계와 상관없이
	 * 다음 문항으로 보낸다(problemIndex 가 바뀌면 init() 이 단계도 되돌린다).
	 */
	const skip = () => {
		if (problemIndex < problemList.length - 1) {
			setProblemIndex(problemIndex + 1);
		} else {
			setIsExit(true);
		}
	};

	const next = () => {
		if (stage === "select") {
			sound.playCorrect();
			setStage("write");
			setIsSucceed(false);
		} else if (problemIndex < problemList.length - 1) {
			setProblemIndex(problemIndex + 1);
		}
	};

	const init = () => {
		setStage("select");
		setConsonant(undefined);
		setVowel(undefined);
		setCombined(undefined);
	};

	const undoDrawing = () => {
		tracingRef.current?.undo();
	};

	const eraseDrawing = () => {
		tracingRef.current?.eraseAll();
	};

	const isWriteDone = () => {
		sound.playCorrect();
		setIsSucceed(true);
		if (problemIndex === problemList.length - 1) {
			setIsExit(true);
		}
	};

	const playAudio = () => {
		console.log("audioRef=>", audioRef.current);
		if (audioRef.current) audioRef.current.play();
	};

	/*
	 * 문항이 바뀔 때만 도는 효과다. 빠졌다는 셋 다 넣으면 안 된다:
	 * - init 은 컴포넌트 안에서 매 렌더 새로 만들어지는 함수이고, 이 효과는 몸통에서
	 *   setState 를 부른다 — 넣으면 매 렌더마다 다시 돌아 무한 렌더가 된다
	 * - problemList 는 모듈 상수 jamoProblems 를 걸러 만든 목록이라 code 가 그대로면
	 *   내용도 그대로다. 방아쇠는 problemIndex 하나가 맞다
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: 위 주석 — 문항 전환 1회, init 은 매 렌더 새 함수
	useEffect(() => {
		init();
		const _problem = problemList[problemIndex];
		setProblem(_problem);
		const audioUrl = `${env.RES_URL_ROOT}/${_problem.content_sound}`;
		setAudioSrc(audioUrl);

		if (_problem) {
			setConsonantList(_problem.choice_1.split(",").map((item) => item.trim()));

			setVowelList(_problem.choice_2.split(",").map((item) => item.trim()));
		}
		if (problemIndex === problemList.length - 1) setIsLastPage(true);
	}, [problemIndex]);

	// 방아쇠는 사용자가 고른 자음·모음이다. 문항이 바뀔 때는 위 효과의 init() 이
	// 둘을 비우므로 이 효과도 따라 돈다 — problem?.content 를 넣으면 정답 문자만
	// 달라져도 채점이 다시 도는, 지금과 다른 순서가 된다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: 자모 선택에만 반응하는 채점 — 위 주석 참고
	useEffect(() => {
		const combined = combineHangul(consonant, vowel);
		setCombined(combined);
		setIsSucceed(combined !== undefined && combined === problem?.content);
	}, [consonant, vowel]);

	const groupName = (unit?.title ?? "").split(":")[0].trim();
	const lesson = [
		t("catalog.chapterSeq", { seq: chapter?.seq ?? 1 }),
		groupName,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<ActivityFrame>
			{/* 건너뛰기 — 목업 모든 활동 화면에 있는데 실제 자모 화면엔 없었다.
			    대조가 못 잡는 자리다(activity-parity 는 learn/jamo 를 안 본다). */}
			<ActivityAppBar lesson={lesson} onExit={exit} onSkip={skip} />

			{stage === "select" ? (
				<ActivityBody>
					<ProblemCard instruction={t("activity.instrWriteSelect")}>
						<AudioRow
							label={t("player.playAudio")}
							sub={t("activity.audioSub")}
							onPlay={playAudio}
						/>
						<ComboTarget
							syllable={hintOn ? (problem?.content ?? "?") : combined || "?"}
							parts={consonant && vowel ? `${consonant} + ${vowel}` : ""}
							onHint={showHint}
							hintOn={hintOn}
						/>
					</ProblemCard>
					<JamoSection
						step={1}
						slot="consonant"
						options={consonantList}
						picked={consonant ?? ""}
						onPick={setConsonant}
					/>
					<JamoSection
						step={2}
						slot="vowel"
						options={vowelList}
						picked={vowel ?? ""}
						onPick={setVowel}
					/>
				</ActivityBody>
			) : (
				<ActivityBody>
					<ProblemCard instruction={t("activity.instrWriteTrace")} />
					<div className="response-area">
						{/* 획을 받는 판은 기존 컴포넌트를 그대로 쓴다 — 목업의 canvas 자리다 */}
						<div className="canvas-host">
							<HangulTracingCanvas
								ref={tracingRef}
								char={problem?.content ?? ""}
								isWriteDone={isWriteDone}
							/>
						</div>
						<div className="tools">
							<button
								type="button"
								className="tool"
								onClick={undoDrawing}
								disabled={isSucceed}
							>
								{t("player.undo")}
							</button>
							<button
								type="button"
								className="tool"
								onClick={eraseDrawing}
								disabled={isSucceed}
							>
								{t("player.eraseAll")}
							</button>
						</div>
					</div>
				</ActivityBody>
			)}

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={
							isExit
								? t("player.showResult")
								: stage === "select"
									? t("player.confirm")
									: t("player.next")
						}
						on={isExit || isSucceed}
						action="next"
						onClick={isExit ? exit : next}
					/>
				</Dock>
			</ActivityFooter>

			{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
			<audio className="hidden" src={audioSrc} ref={audioRef} />
		</ActivityFrame>
	);
}
