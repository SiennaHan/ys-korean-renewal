/**
 * 자모 — 발음 듣고 따라하기
 *
 * 구 경로 /book/chapter/unit/listen-repeat/$code 에서 옮겨 왔다.
 * 그쪽은 리다이렉트만 남는다.
 */
import { CardCheckIcon, SpeakerIcon } from "@/assets/icons";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import AudioRecorder from "@/components/problem/audio-recorder";
import { JamoHeader, ProblemHeader } from "@/components/problem/scene/header";
import { ModuleTitle } from "@/components/problem/scene/title";
import { env } from "@/config/env";
import { chapters } from "@/shared/data/chapter";
import { modules } from "@/shared/data/module";
import { problems } from "@/shared/data/problem";
import { wordgroup } from "@/shared/data/problem_wordgroup";
import { wordgroup_choice } from "@/shared/data/problem_wordgroup_choice";
import { units } from "@/shared/data/unit";
import type { ModuleType, ProblemType } from "@/types/book.types";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type JamoSearch, parseJamoSearch } from "../-jamo-search";

export const Route = createFileRoute("/learn/jamo/pronounce")({
	validateSearch: (search: Record<string, unknown>): JamoSearch =>
		parseJamoSearch(search),
	component: RouteComponent,
});

const wordGridClassName = "px-[16px] grid grid-cols-5 gap-[12px]";

function RouteComponent() {
	const { code } = Route.useSearch();
	const sound = useSoundEffects();

	const module: ModuleType | undefined = modules.find(
		(item) => item.code === code,
	);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const problemList = problems.filter((item) => item.module_code === code);

	const [problemId, setProblemId] = useState("");
	const [selectedWord, setSelectedWord] = useState<undefined | ProblemType>(
		undefined,
	);

	// tab
	const tabList = wordgroup.filter((item) => item.module_code === code);
	const tabItemList = wordgroup_choice.filter((item) =>
		tabList.map((tab) => tab.id).includes(item.group_id),
	);

	const [selectedTab, setSelectedTab] = useState(
		tabList && tabList.length > 0 ? tabList[0].id : undefined,
	);
	const [selectedTabItems, seteSlectedTabItems] = useState(
		tabList && tabList.length > 0
			? tabItemList.filter((item) => item.group_id === tabList[0].id)
			: [],
	);

	const [videoSrc, setVideoSrc] = useState<undefined | string>(undefined);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined);

	const myAudioRef = useRef<HTMLAudioElement | null>(null);
	const [myAudioSrc, setMyAudioSrc] = useState<undefined | string>(undefined);

	const [resultColor, setResultColor] = useState("#C8CCD3");
	const [resultWord, setResultWord] = useState<undefined | string>(undefined);
	const [isSucceed, setIsSucceed] = useState(false);
	const [isExit, setIsExit] = useState(false);

	const init = () => {
		setVideoSrc(undefined);
		setResultWord(undefined);

		setAudioSrc(undefined);
		setMyAudioSrc(undefined);
		setIsSucceed(false);
		setIsExit(false);
	};

	const playAudio = () => {
		if (audioRef.current) audioRef.current.play();
	};

	const playMyAudio = () => {
		if (myAudioRef.current) myAudioRef.current.play();
	};

	const selectWord = (problemId: string) => {
		init();
		sound.playClick();
		const item = problemList.find((pr) => pr.id === problemId);
		if (!item) return;
		setSelectedWord(item);
		setResultColor("#C8CCD3");
		setAudioSrc(env.RES_URL_ROOT + "/" + item?.content_sound);
		setVideoSrc(env.RES_URL_ROOT + "/" + item?.content_vid);

		setTimeout(() => {
			playAudio();
		}, 500);
	};

	const ref = useRef<HTMLVideoElement>(null);

	const WordCard = ({
		item,
		isChecked,
	}: { item: ProblemType; index: number; isChecked: boolean }) => {
		return (
			<div
				onClick={(e) => selectWord(item.id)}
				className={clsx(
					"size-[56px] rounded-[10px] bg-[#fff] font-semibold text-[#24425F] text-[20px] transition-colors",
					"relative flex cursor-pointer items-center justify-center rounded-[5px] hover:bg-gray-200 active:bg-gray-300",
					item.content === selectedWord?.content && "!bg-[#4396F4] text-white",
				)}
			>
				{item.content}
				<div className="absolute top-[2px] right-[2px]">
					<CardCheckIcon color={isChecked ? "#11C378" : "#E5E8EC"} />
				</div>
			</div>
		);
	};

	const setResult = (
		isCorrect: boolean,
		resultWord: string,
		audioUrl: string,
	) => {
		const result = resultWord === "" ? undefined : resultWord;

		setResultWord(result);
		setMyAudioSrc(audioUrl);

		const _isCorrect = resultWord === selectedWord?.content;

		if (_isCorrect) {
			sound.playCorrect();
			setResultColor("#11C378");
			setIsSucceed(true);
			// if (problemIndex === problemList.length - 1) setIsExit(true);
		} else {
			sound.playIncorrect();
			setResultColor("#F15F49");
		}
	};

	const onTabClick = (tabId: number) => {
		setSelectedTab(tabId);
		const items = tabItemList.filter((item) => item.group_id === tabId);
		seteSlectedTabItems(items);
	};

	useEffect(() => {
		if (problemList.length > 0) {
			selectWord(problemList[0].id);
		}
	}, []);

	// useEffect(()=>{
	// 	selectWord(problemId);
	// }, [problemId])

	return (
		<div className="flex h-full flex-col justify-between bg-[#F6F7F8]">
			<JamoHeader chapterSeq={chapter?.seq} unitTitle={unit?.title} />
			<div>
				<div className="flex flex-col items-center">
					<div className="w-full bg-white px-[16px]">
						<ModuleTitle title={module?.title} subtitle={module?.eng} />

						<div className="flex aspect-video w-full justify-center overflow-hidden rounded-[10px] bg-[#F8FAFF]">
							<video
								controls
								className="h-full w-full object-contain"
								src={videoSrc}
							>
								Your device does not support the video.
							</video>
						</div>

						<div className="grid grid-cols-2 gap-[8px] py-[16px]">
							<div
								onClick={playAudio}
								className="flex h-[40px] cursor-pointer items-center justify-between rounded-[8px] bg-[#DBEDFF] px-[2px]"
							>
								<div className="flex size-[36px] items-center justify-center">
									<div className="flex size-[24px] items-center justify-center">
										<SpeakerIcon color={"#0180FF"} />
									</div>
								</div>
								<div className="font-semibold text-[#0180FF] text-[16px]">
									{selectedWord && selectedWord.content}
								</div>
								<div className="size-[36px]"></div>
							</div>

							<div
								onClick={playMyAudio}
								className="flex h-[40px] cursor-pointer items-center justify-between rounded-[8px] bg-[#F6F7F8] px-[2px]"
							>
								<div className="flex size-[36px] items-center justify-center">
									<div className="flex size-[24px] items-center justify-center">
										<SpeakerIcon color={resultColor} />
									</div>
								</div>
								<div
									className="font-semibold text-base"
									style={{ color: resultColor }}
								>
									{"내 녹음"}
								</div>
								<div className="size-[36px]"></div>
							</div>
						</div>
					</div>

					{tabList && selectedTabItems.length > 0 ? (
						<div className="w-full">
							<div className="flex gap-[6px] rounded-t-[12px] bg-[#E5E8EC] p-[16px]">
								{tabList.map((item) => (
									<div
										key={item.id}
										onClick={(e) => onTabClick(item.id)}
										className={clsx(
											"flex size-[32px] cursor-pointer items-center justify-center rounded-[8px] border-1 font-medium text-[13px]",
											item.id === selectedTab
												? "border-[#59ACFF] bg-[#DBEDFF] text-[#0180FF]"
												: "border-[#F6F7F8] bg-[#F6F7F8] text-[#C8CCD3]",
										)}
									>
										{item.tab_name}
									</div>
								))}
							</div>
							<div className={clsx(wordGridClassName, "mt-[18px]")}>
								{problemList
									.filter((problem) =>
										selectedTabItems
											.map((item) => item.problem_id)
											.includes(problem.id),
									)
									.map((item, idx) => {
										return (
											<WordCard
												key={item.id}
												item={item}
												index={idx}
												isChecked={false}
											/>
										);
									})}
							</div>
						</div>
					) : (
						<div className={clsx(wordGridClassName, "mt-[18px]")}>
							{problemList.map((item, idx) => {
								return (
									<WordCard
										key={item.id}
										item={item}
										index={idx}
										isChecked={false}
									/>
								);
							})}
						</div>
					)}
				</div>
			</div>

			<div className="flex-1"></div>

			<div className="sticky bottom-0 items-center">
				<div className="mr-[10px] mb-[10px] ml-[10px] flex items-end justify-center gap-[10px]">
					<AudioRecorder setResult={setResult} />
					<audio className="hidden" ref={audioRef} src={audioSrc}>
						Your device does not support the audio.
					</audio>
					<audio className="hidden" ref={myAudioRef} src={myAudioSrc}>
						Your device does not support the audio.
					</audio>
				</div>
			</div>
		</div>
	);
}
