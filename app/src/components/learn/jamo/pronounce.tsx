/**
 * 자모 — 발음 듣고 따라하기
 *
 * 구 경로 /book/chapter/unit/listen-repeat/$code 에서 옮겨 왔다.
 * 그쪽은 리다이렉트만 남는다.
 *
 * 2026-08-24: 라우트에서 컴포넌트로 옮겼다. 자모는 /learn/jamo 한 라우트가
 * sub 로 갈라 이 컴포넌트들을 부른다 — URL 에서 콘텐츠 ID 를 걷어냈다.
 * moduleCode 는 주소 (과·묶음·활동) 에서 풀어 받는다 — shared/data/jamo.ts
 */
import { CardCheckIcon, SpeakerIcon } from "@/assets/icons";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	AudioPair,
	Dock,
	MouthVideo,
	PracticeBrowser,
	ProblemCard,
	WordCards,
} from "@/components/main/activity";
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
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const wordGridClassName = "px-[16px] grid grid-cols-5 gap-[12px]";

export default function JamoPronounce({ moduleCode }: { moduleCode: string }) {
	const code = moduleCode;
	const router = useRouter();
	const { t } = useTranslation();
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
		setAudioSrc(`${env.RES_URL_ROOT}/${item?.content_sound}`);
		setVideoSrc(`${env.RES_URL_ROOT}/${item?.content_vid}`);

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
			<button
				type="button"
				onClick={() => selectWord(item.id)}
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
			</button>
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

	// 마운트 1회 — 첫 낱말을 골라 소리를 걸어 둔다. selectWord 는 매 렌더 새로
	// 만들어지는 함수이고 안에서 setState 와 setTimeout 재생을 부르므로, 넣으면
	// 매 렌더마다 첫 낱말로 되돌아가며 무한 렌더가 된다. problemList 는 모듈 상수
	// problems 를 걸러 만든 목록이라 마운트 뒤 달라지지 않는다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 1회 첫 낱말 선택 — 위 주석 참고
	useEffect(() => {
		if (problemList.length > 0) {
			selectWord(problemList[0].id);
		}
	}, []);

	// useEffect(()=>{
	// 	selectWord(problemId);
	// }, [problemId])

	const groupName = (unit?.title ?? "").split(":")[0].trim();
	const lesson = [
		t("catalog.chapterSeq", { seq: chapter?.seq ?? 1 }),
		groupName,
	]
		.filter(Boolean)
		.join(" · ");
	// 탭이 있으면 그 탭의 낱말만, 없으면 전부
	const shown =
		tabList && selectedTabItems.length > 0
			? problemList.filter((x) =>
					selectedTabItems.map((i) => i.problem_id).includes(x.id),
				)
			: problemList;

	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={() => router.history.back()} />

			<ActivityBody>
				<ProblemCard
					instruction={t("activity.instrSpeak")}
					stimulusStyle={{ gap: 16 }}
				>
					<MouthVideo>
						{/* biome-ignore lint/a11y/useMediaCaption: 입모양 영상 — 말이 없다 */}
						<video controls src={videoSrc} />
					</MouthVideo>
					<AudioPair
						source={selectedWord?.content ?? ""}
						mine={resultWord ? (isSucceed ? "ok" : "no") : ""}
						onPlaySource={playAudio}
						onPlayMine={playMyAudio}
					/>
				</ProblemCard>

				<PracticeBrowser
					tabs={(tabList ?? []).map((x) => x.tab_name)}
					current={tabList?.find((x) => x.id === selectedTab)?.tab_name ?? ""}
					onTab={(name) => {
						const hit = tabList?.find((x) => x.tab_name === name);
						if (hit) onTabClick(hit.id);
					}}
				>
					<WordCards
						words={shown.map((x) => x.content)}
						current={selectedWord?.content ?? ""}
						done={() => false}
						onPick={(word) => {
							const hit = shown.find((x) => x.content === word);
							if (hit) selectWord(hit.id);
						}}
					/>
				</PracticeBrowser>
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<AudioRecorder dock setResult={setResult} />
				</Dock>
			</ActivityFooter>

			{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
			<audio className="hidden" ref={audioRef} src={audioSrc} />
			{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
			<audio className="hidden" ref={myAudioRef} src={myAudioSrc} />
		</ActivityFrame>
	);
}
