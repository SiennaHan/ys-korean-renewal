import { createFileRoute, useRouter } from "@tanstack/react-router";

import HangulCanvas from "@/components/draw/HangulCanvas";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { ProblemHeader } from "@/components/problem/scene/header";
import Dialog from "@/components/ui/dialog";
import { env } from "@/config/env";
import { chapters } from "@/shared/data/chapter";
import { modules } from "@/shared/data/module";
import { problems } from "@/shared/data/problem";
import { units } from "@/shared/data/unit";
import type { ModuleType, ProblemType } from "@/types/book.types";
import clsx from "clsx";
import { ChevronRight, CircleCheckBig, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/book/chapter/unit/write2/$code")({
	component: RouteComponent,
});

const baseButton =
	"bg-[#4396F4] text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[#4396F4dd] active:bg-[#4396F4cc] \
									  disabled:text-[#bbb] disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-white disabled:hover:bg-white";

const baseCardButton =
	"h-[100px] rounded-[10px] bg-[#E9F2FC] text-[40px] font-bold flex items-center justify-center cursor-pointer hover:bg-gray-100 active:bg-gray-200";
const selectedCardButton = "border-5 border-[#b9daff]";

function RouteComponent() {
	const { code } = Route.useParams();
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

	console.log("problemList=>", problemList);

	const [problemIndex, setProblemIndex] = useState(0);
	const [problem, setProblem] = useState<ProblemType | undefined>(undefined);
	const [word, setWord] = useState<string | undefined>(undefined);

	const [wordList, setWordList] = useState<string[]>([]);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined);

	const [isSucceed, setIsSucceed] = useState(false);
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
		console.log("next =>", word);
		if (word === problem?.answer_1) {
			next();
		} else {
			setIncorrect();
		}
	};

	const next = () => {
		sound.playCorrect();
		setIsDisabled(true);

		setTimeout(() => {
			setIsOpenCanvas(true);
		}, 1000);
	};

	const setIncorrect = () => {
		sound.playIncorrect();

		const _words = problem?.choice_1.split(",");
		const wordIndex = _words?.indexOf(word ?? "") ?? -1;

		console.log("next wrong =>", word, _words, wordIndex);
		setIncorrectSlots((prevSlots) => {
			const newSlots = [...prevSlots];
			newSlots[wordIndex] = true;
			console.log("next incorrectSlots =>", newSlots);
			return newSlots;
		});
		setIsDisabled(true);
		setWord(undefined);
	};

	const init = () => {
		setWord(undefined);
	};

	const selectWord = (word: string) => {
		// sound.playClick();
		setWord(word);
		setCanvasText(word);
		setIsDisabled(false);
	};

	const play = () => {
		if (audioRef.current) {
			audioRef.current.play().catch((error) => {
				console.error("Audio playback failed:", error);
			});
		}
	};

	//canvas
	const [canvasText, setCanvasText] = useState<string | null>(null);
	const [isOpenCanvas, setIsOpenCanvas] = useState(false);

	const returnImage = (base64Img: string) => {
		setIncorrectSlots([false, false, false, false]);

		if (problemIndex < problemList.length - 1) {
			setProblemIndex(problemIndex + 1);
		} else {
			setIsExit(true);
		}
	};

	/*
	 * problemIndex 가 유일한 방아쇠다. biome 은 init·problemList 도 넣으라고 하는데
	 * init 은 컴포넌트 안에서 매 렌더 새로 만들어지는 함수이고 이 효과가 setState 를
	 * 부르므로, 넣으면 **무한 렌더**가 된다. problemList 는 모듈 상수를 filter 한
	 * 것이라 code 가 그대로면 내용도 그대로다.
	 * 자모 화면들(learn/jamo/combine 등)이 같은 꼴이고 같은 근거로 재워 뒀다.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: init 을 넣으면 무한 렌더가 된다 — 위 주석 참고
	useEffect(() => {
		init();
		const _problem = problemList[problemIndex];
		setProblem(_problem);
		if (_problem) {
			setWordList(_problem.choice_1.split(","));
			const _audioSrc = `${env.RES_URL_ROOT}/${_problem.content_sound}`;
			setAudioSrc(_audioSrc);
		}
		if (problemIndex === problemList.length - 1) setIsLastPage(true);
	}, [problemIndex]);

	return (
		<div className="flex h-full flex-col justify-between">
			<ProblemHeader chapterSeq={chapter?.seq} unitTitle={unit?.title} />
			<div>
				<div className="flex flex-col items-center pr-[30px] pl-[30px]">
					<div className="mt-[14px] w-full">
						<div className="font-bold text-[#000] text-[24px]">
							{module?.title}
						</div>
						<div className="text-[#000] text-[18px]">{module?.eng}</div>
					</div>
					<div className="mt-[10px] w-full">
						<button
							type="button"
							onClick={play}
							className="cursor-pointer rounded-full bg-gray-100 p-2 text-blue-500 hover:bg-gray-200 active:bg-gray-300"
						>
							<Volume2 strokeWidth={2} />
						</button>
					</div>
					<div className="mt-[20px] grid w-full grid-cols-1 gap-[8px]">
						{wordList.map((item, idx) => {
							return (
								<button
									type="button"
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
			</div>

			<div className="flex w-full items-end justify-end p-[10px]">
				{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
				<audio ref={audioRef} className="hidden" src={audioSrc}>
					Your device does not support the audio.
				</audio>
				{isExit ? (
					<button
						type="button"
						onClick={exit}
						className={clsx(baseButton, "!bg-green-500 h-[60px] w-[80px]")}
					>
						<CircleCheckBig />
					</button>
				) : (
					<button
						type="button"
						onClick={checkAnswer}
						className={clsx(baseButton, "h-[60px] w-[80px]")}
						disabled={isDisabled}
					>
						<ChevronRight />
					</button>
				)}
			</div>

			<Dialog isOpen={isOpenCanvas} onClose={() => setIsOpenCanvas(false)}>
				<HangulCanvas
					text={canvasText}
					returnImage={returnImage}
					onClose={() => setIsOpenCanvas(false)}
				/>
			</Dialog>
		</div>
	);
}
