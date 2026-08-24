/**
 * 자모 — 자음-모음 조합하고 쓰기
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
	ComboResult,
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
import { modules } from "@/shared/data/module";
import { problems } from "@/shared/data/problem";
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
	const problemList = problems.filter(
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
	const [isLastPage, setIsLastPage] = useState(false);
	const [isExit, setIsExit] = useState(false);

	const exit = () => router.history.back();

	const [stage, setStage] = useState<"select" | "write">("select");

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
			<ActivityAppBar lesson={lesson} onExit={exit} />

			{stage === "select" ? (
				<ActivityBody>
					<ProblemCard instruction={t("activity.instrWriteSelect")}>
						<ComboResult
							syllable={combined || "?"}
							parts={consonant && vowel ? `${consonant} + ${vowel}` : ""}
							word={problem?.content ?? ""}
							onPlay={playAudio}
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
