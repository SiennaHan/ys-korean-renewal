/**
 * 자모 — 듣고 맞는 것 고르기
 *
 * 구 경로 /book/chapter/unit/listen/$code 에서 옮겨 왔다.
 * 그쪽은 리다이렉트만 남는다.
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type JamoSearch, parseJamoSearch } from "../-jamo-search";

import { SpeakerIcon } from "@/assets/icons";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { ProblemHeader } from "@/components/problem/scene/header";
import { ModuleTitle } from "@/components/problem/scene/title";
import { useToast } from "@/components/toast/toast-context";
import { env } from "@/config/env";
import { chapters } from "@/shared/data/chapter";
import { modules } from "@/shared/data/module";
import { problems } from "@/shared/data/problem";
import { units } from "@/shared/data/unit";
import type { ModuleType, ProblemType } from "@/types/book.types";
import clsx from "clsx";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/learn/jamo/choose")({
	validateSearch: (search: Record<string, unknown>): JamoSearch =>
		parseJamoSearch(search),
	component: RouteComponent,
});

const baseButton =
	"w-full max-w-[500px] h-[56px] bg-[#4396F4] text-white rounded-[10px] flex items-center justify-center cursor-pointer \
										hover:bg-[#4396F4dd] active:bg-[#4396F4cc] \
										disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-[#bbb] disabled:hover:bg-[#bbb]";
const baseCardButton =
	"h-[96px] rounded-[12px] bg-[#F9FAFC] text-[24px] text-[#24425F] font-bold flex items-center justify-center cursor-pointer \
												hover:bg-gray-100 active:bg-gray-200 disabled:text-[#bbb] disabled:shadow-none disabled:opacity-70 \
												disabled:border-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:hover:bg-gray-100";
const selectedCardButton = "!bg-[#359AFF] !text-white";

function RouteComponent() {
	const { code } = Route.useSearch();
	const { addToast } = useToast();
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
	const [word, setWord] = useState<string | undefined>(undefined);

	const [wordList, setWordList] = useState<string[]>([]);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined);

	const [isLastPage, setIsLastPage] = useState(false);

	const [incorrectSlots, setIncorrectSlots] = useState<boolean[]>([
		false,
		false,
		false,
		false,
	]);
	const [isDisabled, setIsDisabled] = useState(true);
	const [isExit, setIsExit] = useState(false);

	const exit = () => {
		router.history.back();
	};

	const checkAnswer = () => {
		if (word === problem?.answer_1) {
			sound.playCorrect();
			next();
		} else {
			sound.playIncorrect();
			setIncorrect();
		}
	};

	const next = () => {
		// 맞았습니다 출력 후 1초 딜레이 후

		addToast("Correct", "success");
		setIsDisabled(true);

		setTimeout(() => {
			if (problemIndex < problemList.length - 1) {
				setProblemIndex(problemIndex + 1);
			} else {
				setIsExit(true);
			}
		}, 1000);
	};

	const setIncorrect = () => {
		addToast("Incorrect", "error");

		const wordIndex = wordList?.indexOf(word ?? "") ?? -1;

		setIncorrectSlots((prevSlots) => {
			const newSlots = [...prevSlots];
			newSlots[wordIndex] = true;
			return newSlots;
		});
		setIsDisabled(true);
		setWord(undefined);
	};

	const init = () => {
		setWord(undefined);
		setIncorrectSlots([false, false, false, false]);
	};

	const selectWord = (word: string) => {
		sound.playClick();
		setWord(word);
		setIsDisabled(false);
	};

	const play = () => {
		if (audioRef.current) {
			audioRef.current.play().catch((error) => {
				console.error("Audio playback failed:", error);
			});
		}
	};

	useEffect(() => {
		init();
		const _problem = problemList[problemIndex];
		setProblem(_problem);
		if (_problem) {
			const _wordList = _problem.choice_1.split(",").map((item) => item.trim());
			setWordList(_wordList);
			const _audioSrc = env.RES_URL_ROOT + "/" + _problem.content_sound;
			setAudioSrc(_audioSrc);

			setTimeout(() => {
				audioRef.current?.play();
			}, 1000);
		}
		setWord(undefined);
		if (problemIndex === problemList.length - 1) setIsLastPage(true);
	}, [problemIndex]);

	return (
		<div className="flex h-full flex-col justify-between">
			<ProblemHeader chapterSeq={chapter?.seq} unitTitle={unit?.title} />
			<div className="bg-white px-[16px] pb-[8px]">
				<ModuleTitle title={module?.title} subtitle={module?.eng} />
			</div>

			<div className="flex flex-col items-center px-[16px]">
				<div className="w-full">
					<button
						onClick={play}
						className="flex h-[40px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] bg-[#DBEDFF] text-[#0180FF] hover:opacity-[0.8] active:opacity-[0.9]"
					>
						<SpeakerIcon color={"#0180FF"} />
						<div className="font-semibold text-[#0180FF] text-[16px]">
							발음듣기
						</div>
					</button>
				</div>
				<div className="mt-[40px] grid w-full grid-cols-2 gap-x-[12px] gap-y-[16px]">
					{wordList.map((item, idx) => {
						return (
							<button
								key={idx}
								onClick={(e) => selectWord(item)}
								className={clsx(
									baseCardButton,
									word === item && selectedCardButton,
								)}
								disabled={incorrectSlots[idx]}
							>
								{item}
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex-1"></div>

			<div className="sticky bottom-0 items-center bg-white">
				<div className="flex justify-center p-[16px] ">
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
							onClick={checkAnswer}
							className={clsx(baseButton)}
							disabled={isDisabled}
						>
							{"정답 확인 check answer"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
