import clsx from "clsx"
import { ChevronRight, Volume2 } from "lucide-react"
import { ProblemHeader } from "../scene/header";
import { useEffect, useRef, useState } from "react";
import { ModuleType, ProblemType } from "@/types/book.types";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import { chapters } from "@/shared/data/chapter";
import { problems } from "@/shared/data/problem";
import AudioRecorder from "../audio-recorder";
import { env } from "@/config/env";
import { useSoundEffects } from "@/components/effect/use-sound-effects";

interface Props {
	code: string;
	setScene: (scene: string) => void;
}

const baseButton = "bg-[#4396F4] text-white rounded-full flex items-center justify-center cursor-pointer disabled:text-[#bbb] hover:bg-[#4396F4dd] active:bg-[#4396F4cc] disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-white disabled:hover:bg-white"
const baseButtonClasses = "flex items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300";

export default function Scene1({code, setScene}: Props) {

	const sound = useSoundEffects()
	
	const module: ModuleType | undefined = modules.find((item) => item.code === code);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const problemList = problems.filter((item) => item.module_code === code && item.scene_num === 1);

	const [problemIndex, setProblemIndex] = useState(0);
	const [selectedWord, setSelectedWord] = useState<undefined | ProblemType>(undefined);

	const [videoSrc, setVideoSrc] = useState<undefined | string>(undefined);

	const audioRef = useRef<HTMLAudioElement | null>(null)
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined)

	const myAudioRef = useRef<HTMLAudioElement | null>(null)
	const [myAudioSrc, setMyAudioSrc] = useState<undefined | string>(undefined)

	const [resultColor, setResultColor] = useState("bg-[#E1F8D1]");
	const [resultWord, setResultWord] = useState<undefined | string>(undefined);
	const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined)
	const [isSucceed, setIsSucceed] = useState(false);
	const [isExit, setIsExit] = useState(false);

	const init = () => {
		setVideoSrc(undefined);
		setIsCorrect(undefined);
		setResultWord(undefined);
		
		setAudioSrc(undefined);
		setMyAudioSrc(undefined);
		setIsSucceed(false);
		setIsExit(false);
	}

	const playVideo = () => {
		if (selectedWord?.content_vid) {
			const src = env.RES_URL_ROOT + "/" + selectedWord.content_vid;
			setVideoSrc(src);
		}
	}

	const playAudio = () => {
		if (audioRef.current)
			audioRef.current.play();
	}

	const playMyAudio = () => {
		if (myAudioRef.current)
			myAudioRef.current.play();
	}

	const selectWord = (index: number) => {
		init();
		const item = problemList[index];
		setSelectedWord(item);
		const audioUrl = env.RES_URL_ROOT + "/" + item.content_sound;
		setAudioSrc(audioUrl);

		setTimeout(()=>{
			playAudio();
		}, 500)
	}

	const WordCard = ({item, index}: {item: any, index: number}) => {
		return <div 
			onClick={(e)=>setProblemIndex(index)} 
			className={clsx(baseButtonClasses, "w-[44px] h-[44px] bg-[#E9F2FC] text-[32px]", item.content === selectedWord?.content && "text-white !bg-[#003377]")}>
				{item.content}
			</div>
	}

	const setResult = (isCorrect: boolean, resultWord: string, audioUrl: string) => {
		setResultWord(resultWord);
		setMyAudioSrc(audioUrl);

		const _isCorrect = resultWord === selectedWord?.content;
		setIsCorrect(_isCorrect)

		if (_isCorrect) {
			setResultColor("bg-[#030302]");
			setIsSucceed(true);
			if (problemIndex === problemList.length - 1) setIsExit(true);
		} else setResultColor("bg-[#FFCACA]")
	}

	const next = () => {
		if (problemIndex < problemList.length - 1)
			setProblemIndex(problemIndex + 1);
	}

	const exit = () => {
		if (module)
			setScene('scene2')
	}

	useEffect(() => {
		if (problemList.length > 0) {
			selectWord(0);
		}
	}, [])

	useEffect(()=>{
		const _problem = problemList[problemIndex];
		selectWord(problemIndex);
	}, [problemIndex])

  return <div className="h-full flex flex-col justify-between">
		<div>
			<ProblemHeader chapterSeq={chapter?.seq} unitTitle={unit?.title} />
			<div className="flex flex-col items-center pl-[30px] pr-[30px]">
				<div className="w-full mt-[14px]">
					<div className="text-[24px] text-[#000] font-bold">{module?.title}</div>
					<div className="text-[18px] text-[#000]">{module?.eng}</div>
				</div>

				<div className="grid grid-cols-5 gap-[6px] mt-[20px]">
					{problemList.map((item, idx) => {
						return <WordCard key={item.id} item={item} index={idx} />
					})}
				</div>

				<div className="w-full bg-[#f3f3f3] rounded-[5px] mt-[15px] flex items-center justify-between">
					<div className="size-[60px] flex justify-center items-center">
						<div onClick={playVideo} className={clsx(baseButtonClasses, "size-[36px] bg-white rounded-full")}>
							<img src="/icons/mouth.png" />
						</div>
					</div>
					<div className="text-[32px] text-[#000] font-bold">{selectedWord && selectedWord.content}</div>
					<div className="size-[60px]"></div>
				</div>

				{resultWord && (
					<div className={
						clsx(
							"w-full rounded-[5px] mt-[15px] flex items-center justify-between",
							resultColor,
						)
					}>
						<div className="size-[60px] flex justify-center items-center">
							<div onClick={playMyAudio} className={clsx(baseButtonClasses, "size-[36px] bg-white rounded-full")}>
								<Volume2 />
							</div>
						</div>
						<div className="text-[32px] text-[#000] font-bold">{resultWord}</div>
						<div className="size-[60px]"></div>
					</div>
				)}

				<div className="flex justify-center mt-[20px]">
					{videoSrc && (
						<video autoPlay controls>
							<source src={videoSrc} type="video/mp4" />
							Your device does not support the video.
						</video>
					)}
				</div>
			</div>
		</div>

		<div className="flex justify-center items-end gap-[10px] ml-[10px] mr-[10px] mb-[10px]">
			<AudioRecorder setResult={setResult}/>
			<audio className="hidden" ref={audioRef} src={audioSrc}>
				Your device does not support the audio.
			</audio>
			<audio className="hidden" ref={myAudioRef} src={myAudioSrc}>
				Your device does not support the audio.
			</audio>
			{isExit ?(
				<button onClick={exit} className={clsx(baseButton, "!bg-green-500 w-[60px] h-[60px]")}>
					<ChevronRight />
				</button>
			):(
				<button onClick={next} disabled={!isSucceed} className={clsx(baseButton, "w-[60px] h-[60px]")}><ChevronRight /></button>
			)}
		</div>
	</div>
}