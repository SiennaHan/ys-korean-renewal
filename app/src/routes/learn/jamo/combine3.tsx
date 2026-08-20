/**
 * 자모 — 자음-모음 조합하고 쓰기 (받침)
 *
 * 구 경로 /book/chapter/unit/write3/$code 에서 옮겨 왔다.
 * 그쪽은 리다이렉트만 남는다.
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type JamoSearch, parseJamoSearch } from "../-jamo-search";

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

export const Route = createFileRoute("/learn/jamo/combine3")({
	validateSearch: (search: Record<string, unknown>): JamoSearch =>
		parseJamoSearch(search),
	component: RouteComponent,
});

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

function RouteComponent() {
	const { code } = Route.useSearch();
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
	const [finalConsonant, setFinalConsonant] = useState<string | undefined>(
		undefined,
	);
	const [combined, setCombined] = useState<string | undefined>(undefined);

	const [consonantList, setConsonantList] = useState<string[]>([]);
	const [vowelList, setVowelList] = useState<string[]>([]);

	const tracingRef = useRef<HangulTracingCanvasHandle>(null);

	const [finalConsonantList, setFinalConsonantList] = useState<string[]>([]);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined);

	const [isSucceed, setIsSucceed] = useState(false);
	const [isLastPage, setIsLastPage] = useState(false);
	const [isExit, setIsExit] = useState(false);

	const exit = () => router.history.back();

	const [stage, setStage] = useState<"select" | "write">("select");

	const next = () => {
		sound.playCorrect();
		if (stage === "select") {
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
		setFinalConsonant(undefined);
		setCombined(undefined);
	};

	const isWriteDone = () => {
		setIsSucceed(true);
		if (problemIndex === problemList.length - 1) {
			setIsExit(true);
		}
	};

	const playAudio = () => {
		console.log("audioRef=>", audioRef.current);
		if (audioRef.current) audioRef.current.play();
	};

	const undoDrawing = () => {
		tracingRef.current?.undo();
	};

	const eraseDrawing = () => {
		tracingRef.current?.eraseAll();
	};

	useEffect(() => {
		init();
		const _problem = problemList[problemIndex];
		setProblem(_problem);
		const audioUrl = env.RES_URL_ROOT + "/" + _problem.content_sound;
		setAudioSrc(audioUrl);

		if (_problem) {
			setConsonantList(_problem.choice_1.split(",").map((item) => item.trim()));
			setVowelList(_problem.choice_2.split(",").map((item) => item.trim()));
			setFinalConsonantList(
				_problem.choice_3.split(",").map((item) => item.trim()),
			);
		}
		if (problemIndex === problemList.length - 1) setIsLastPage(true);
	}, [problemIndex]);

	useEffect(() => {
		const combined = combineHangul(consonant, vowel, finalConsonant);

		setCombined(combined);

		setIsSucceed(combined !== undefined && combined === problem?.content);
	}, [consonant, vowel, finalConsonant]);

	return (
		<div className="flex h-full flex-col bg-[#F6F7F8]">
			<JamoHeader chapterSeq={chapter?.seq} unitTitle={unit?.title} />
			<div className="bg-white px-[16px] pb-[8px]">
				<ModuleTitle title={module?.title} subtitle={module?.eng} />
			</div>
			<div>
				{stage === "select" ? (
					<div className="w-full">
						<div className="w-full bg-white px-[16px] pb-[16px]">
							<div className="relative h-[100px] w-full rounded-[10px] bg-[#f6f7f8] pt-[10px]">
								<div className="mt-[12px] flex items-center justify-center rounded-[15px] font-bold text-[#003477]">
									<div>
										<div className={"text-[36px] leading-[48px]"}>
											{combined ? combined : "?"}
										</div>
										<div className={"text-[#7F848D] text-[12px]"}>
											{consonant &&
												vowel &&
												finalConsonant &&
												consonant + " + " + vowel + " + " + finalConsonant}
										</div>
									</div>
								</div>
								<div
									onClick={playAudio}
									className="absolute top-2 left-2 flex h-[32px] cursor-pointer items-center rounded-[6px] bg-[#fff] pr-[12px] pl-[8px] text-[#24425F] text-[16px]"
								>
									<div className="flex size-[20px] items-center justify-center rounded-full bg-white">
										<SpeakerIcon color={"#24425F"} size={10} />
									</div>
									<div className="ml-[2px] text-[12px]">{problem?.content}</div>
								</div>
							</div>
						</div>
						<div className="w-full px-[16px]">
							<div className="mt-[24px] flex w-full items-center gap-[5px] text-[14px]">
								<div className="flex size-[16px] items-center justify-center rounded-[4px] bg-[#0180FF] font-semibold text-[12px] text-white">
									1
								</div>
								<div className="font-bold text-[#0180FF]">
									맨 앞에 오는 소리
								</div>
								<div className="ml-[2px] text-[#ADB3BE] text-[14px]">
									initial consonant
								</div>
							</div>
							<div className="mt-[12px] w-full">
								<div className="grid grid-cols-6 gap-[5px]">
									{consonantList.map((item, idx) => {
										return (
											<div
												key={idx}
												onClick={(e) => setConsonant(item)}
												className={clsx(
													baseCardButton,
													item === consonant && selectedCardButton,
												)}
											>
												{item}
											</div>
										);
									})}
								</div>
							</div>
							<div className="mt-[40px] flex w-full items-center gap-[5px] text-[14px]">
								<div className="flex size-[16px] items-center justify-center rounded-[4px] bg-[#0180FF] font-semibold text-[12px] text-white">
									2
								</div>
								<div className="font-bold text-[#0180FF]">가운데 오는 소리</div>
								<div className="ml-[2px] text-[#ADB3BE] text-[14px]">
									medial vowel
								</div>
							</div>
							<div className="mt-[12px] w-full">
								<div className="grid grid-cols-6 gap-[5px]">
									{vowelList.map((item, idx) => {
										return (
											<div
												key={idx}
												onClick={(e) => setVowel(item)}
												className={clsx(
													baseCardButton,
													item === vowel && selectedCardButton,
												)}
											>
												{item}
											</div>
										);
									})}
								</div>
							</div>
							<div className="mt-[40px] flex w-full items-center gap-[5px] text-[14px]">
								<div className="flex size-[16px] items-center justify-center rounded-[4px] bg-[#0180FF] font-semibold text-[12px] text-white">
									2
								</div>
								<div className="font-bold text-[#0180FF]">
									맨 뒤에 오는 소리
								</div>
								<div className="ml-[2px] text-[#ADB3BE] text-[14px]">
									final vowel
								</div>
							</div>
							<div className="mt-[12px] w-full">
								<div className="grid grid-cols-6 gap-[5px]">
									{finalConsonantList.map((item, idx) => {
										return (
											<div
												key={idx}
												onClick={(e) => setFinalConsonant(item)}
												className={clsx(
													baseCardButton,
													item === finalConsonant && selectedCardButton,
												)}
											>
												{item}
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				) : (
					<div className="bg-white px-[16px]">
						<div className="relative h-[72px] rounded-[12px] bg-[#F6F7F8] pt-[16px]">
							<div className="text-center font-bold text-[#0180FF] text-[16px]">
								손가락으로 따라 쓰세요.
							</div>
							<div className="text-center text-[#7FBFFF] text-[12px]">
								Draw the character with your finger.
							</div>
							<div
								onClick={playAudio}
								className="absolute top-2 left-2 flex h-[32px] cursor-pointer items-center rounded-[6px] bg-[#fff] pr-[12px] pl-[8px] text-[#24425F] text-[16px]"
							>
								<div className="flex size-[20px] items-center justify-center rounded-full bg-white">
									<SpeakerIcon color={"#24425F"} size={10} />
								</div>
							</div>
						</div>

						<div className="mt-[16px] flex justify-center gap-[8px]">
							<button
								onClick={eraseDrawing}
								className={clsx(
									baseControlButton,
									"bg-[#FFE8E8] text-[#F15F49]",
								)}
								disabled={isSucceed}
							>
								Erase all
							</button>
							<button
								onClick={undoDrawing}
								className={clsx(
									baseControlButton,
									"bg-[#F6F7F8] text-[#383A3F]",
								)}
								disabled={isSucceed}
							>
								Undo
							</button>
						</div>
						<HangulTracingCanvas
							ref={tracingRef}
							char={problem?.content ?? ""}
							isWriteDone={isWriteDone}
						/>
					</div>
				)}
			</div>

			<div
				className={`flex-1 bg-[${stage === "select" ? "#F6F7F8" : "#fff"}]`}
			></div>

			<div className="sticky bottom-0 items-center bg-white">
				<div className="flex w-full items-end justify-center p-[10px]">
					<audio className="hidden" src={audioSrc} ref={audioRef}>
						Your device does not support the audio.
					</audio>
					{isExit ? (
						<button
							onClick={exit}
							className={clsx(baseButton, "!bg-green-500")}
						>
							완료 done
						</button>
					) : (
						<button
							onClick={next}
							className={clsx(baseButton)}
							disabled={!isSucceed}
						>
							{stage === "select" ? "확인 check" : "다음 next"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
