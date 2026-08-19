import clsx from "clsx"
import { ChevronLeft, Volume2, SpeakerIcon, ChevronRight, CircleCheckBig } from "lucide-react"
import { ProblemHeader } from "../scene/header";
import { useEffect, useRef, useState } from "react";
import { ModuleType, ProblemType } from "@/types/book.types";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import { chapters } from "@/shared/data/chapter";
import { problems } from "@/shared/data/problem";
import AudioRecorder from "../audio-recorder";
import { useRouter } from "@tanstack/react-router";
import { env } from "@/config/env";

interface Props {
	code: string;
	setScene: (scene: string) => void;
}

const baseButton = "bg-[#4396F4] text-white rounded-full flex items-center justify-center cursor-pointer disabled:text-[#bbb] hover:bg-[#4396F4dd] active:bg-[#4396F4cc] disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-white disabled:hover:bg-white"
const baseButtonClasses = "flex items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300";

export default function Scene2({code, setScene}: Props) {
	const router = useRouter();
	
	const module = modules.find((item) => item.code === code);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const problemList = problems.filter((item) => item.module_code === code && item.scene_num === 2);

	const [problemIndex, setProblemIndex] = useState(-1);
	const [selectedWord, setSelectedWord] = useState<undefined | ProblemType>(undefined);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined);
	const myaudioRef = useRef<HTMLAudioElement | null>(null);
	const [myAudioSrc, setMyAudioSrc] = useState<undefined | string>(undefined);

	const [resultColor, setResultColor] = useState("bg-[#E1F8D1]");
	const [resultWord, setResultWord] = useState<undefined | string>(undefined);

	const [isSucceed, setIsSucceed] = useState(false);
	const [isExit, setIsExit] = useState(false);

	const init = () => {
		setIsSucceed(false);
		setIsExit(false);
		setResultWord(undefined);
		setAudioSrc(undefined);
	}

	const playAudio = () => {
		if (audioSrc) {
			audioRef.current?.play();
		}
	}

	const playMyAudio = () => {
		if (myaudioRef.current)
			myaudioRef.current.play();
	}

	const selectWord = (item: any) => {
		init();

		console.log('selectWord', item);

		setSelectedWord(item);
		const _audioSrc = env.RES_URL_ROOT + "/" + item.content_sound;
		setAudioSrc(_audioSrc);
	}

	const WordCard = ({item, index}: {item: ProblemType, index: number}) => {
		const imgSrc = env.RES_URL_ROOT + "/" + item.content_img;
		return <div 
			onClick={(e)=>setProblemIndex(index)} 
			className={clsx(baseButtonClasses, "w-[100px] h-[50px] bg-[#fff] border-1", item.content === selectedWord?.content && "!border-3 border-[#ccc]")}>
				<div className="size-[50px] p-[5px]"><img src={imgSrc} /></div>
				<div className="size-[50px] border-l-1 flex items-center justify-center text-[12px]">{item.content}</div>
			</div>
	}

	const setResult = (isCorrect: boolean, resultWord: string, audioUrl: string) => {
		setResultWord(resultWord);
		setMyAudioSrc(audioUrl);

		const _isCorrect = resultWord === selectedWord?.content
		if (_isCorrect) {
			setResultColor("bg-[#E1F8D1]")
			setIsSucceed(true);
			if (problemIndex === problemList.length - 1) {
				setIsExit(true);
			}
		} else setResultColor("bg-[#FFCACA]")
	}

	const next = () => {
		if (problemIndex < problemList.length - 1)
			setProblemIndex(problemIndex + 1);
	}

	const exit = () => {
		router.history.back();
	}

	useEffect(() => {
		setTimeout(()=>{
			setProblemIndex(0);
		}, 100)
	}, [])

	useEffect(() => {
		console.log('scene2 problemIndex =>', problemIndex, selectedWord);

		if (problemIndex > -1) {
			const _problem = problemList[problemIndex];
			selectWord(_problem);
			console.log('scene2 selectedWord =>', problemIndex, _problem);
		}
	}, [problemIndex])

	useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.load(); 
      const handleCanPlay = () => {
        playAudio(); 
        audioRef.current?.removeEventListener('canplaythrough', handleCanPlay);
      };
      audioRef.current.addEventListener('canplaythrough', handleCanPlay);
      return () => {
         audioRef.current?.removeEventListener('canplaythrough', handleCanPlay);
      };
    } else if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
    }
  }, [audioSrc]);

  return <div className="h-full flex flex-col justify-between">
		<div>
			<ProblemHeader chapterSeq={chapter?.seq} unitTitle={unit?.title} />
			<div className="flex flex-col items-center pl-[30px] pr-[30px]">
				<div className="w-full mt-[14px]">
					<div className="text-[24px] text-[#000] font-bold">{module?.title}</div>
					<div className="text-[18px] text-[#000]">{module?.eng}</div>
				</div>

				<div className="grid grid-cols-3 gap-[2px] mt-[20px]">
					{problemList.map((item, idx) => {
						return <WordCard key={item.id} item={item} index={idx} />
					})}
				</div>

				<div className="w-full bg-[#f3f3f3] rounded-[8px] mt-[15px]">
					<div className=" flex items-center justify-between">
						<div className="size-[60px] flex justify-center items-center">
							<div onClick={e=>playAudio()} className={clsx(baseButtonClasses, "size-[36px] bg-white text-[#4396F4] rounded-full")}>
								<Volume2 />
							</div>
						</div>
						<div className="text-[32px] text-[#000] font-bold">{selectedWord && selectedWord.content}</div>
						<div className="size-[60px]"></div>
					</div>
					<div className="flex justify-center m-[5px] bg-white rounded-[5px]">
						<img className="h-[130px]" src={env.RES_URL_ROOT + "/" + selectedWord?.content_img} />
					</div>
				</div>

				{resultWord && (
					<div className={
						clsx(
							"w-full rounded-[5px] mt-[15px] flex items-center justify-between",
							resultColor,
						)
					}>
						<div className="size-[60px] flex justify-center items-center">
							<div onClick={e=>playMyAudio()} className={clsx(baseButtonClasses, "size-[36px] bg-white rounded-full")}>
								<Volume2 />
							</div>
						</div>
						<div className="text-[32px] text-[#000] font-bold">{resultWord}</div>
						<div className="size-[60px]"></div>
					</div>
				)}
			</div>
		</div>

		<audio ref={audioRef} className="hidden" src={audioSrc}>
			Your device does not support the audio.
		</audio>

		<audio ref={myaudioRef} className="hidden" src={myAudioSrc}>
			Your device does not support the audio.
		</audio>

		<div className="flex justify-center items-end gap-[10px] ml-[10px] mr-[10px] mb-[10px]">
			<AudioRecorder setResult={setResult}/>
			{isExit ?(
				<button onClick={exit} className={clsx(baseButton, "!bg-green-500 w-[60px] h-[60px]")}>
					<CircleCheckBig />
				</button>
			):(
				<button onClick={next} disabled={!isSucceed} className={clsx(baseButton, "w-[60px] h-[60px]")}><ChevronRight /></button>
			)}
		</div>
	</div>
}