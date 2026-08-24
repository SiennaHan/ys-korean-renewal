/**
 * 자모 — 단어 듣고 따라하기
 *
 * 구 경로 /book/chapter/unit/listen-repeat2/$code 에서 옮겨 왔다.
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
	PracticeBrowser,
	ProblemCard,
	ThumbWordCards,
	WordPicture,
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
import type { ProblemType } from "@/types/book.types";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const baseButtonClasses =
	"flex rounded-[8px] items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300";

export default function JamoWordRepeat({ moduleCode }: { moduleCode: string }) {
	const code = moduleCode;
	const router = useRouter();
	const { t } = useTranslation();

	const sound = useSoundEffects();

	const module = modules.find((item) => item.code === code);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const problemList = problems.filter((item) => item.module_code === code);

	const [problemIndex, setProblemIndex] = useState(0);
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

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined);
	const myAudioRef = useRef<HTMLAudioElement | null>(null);
	const [myAudioSrc, setMyAudioSrc] = useState<undefined | string>(undefined);

	const [resultColor, setResultColor] = useState("#C8CCD3");
	const [resultWord, setResultWord] = useState<undefined | string>(undefined);

	const [isSucceed, setIsSucceed] = useState(false);
	const [isExit, setIsExit] = useState(false);

	const init = () => {
		setIsSucceed(false);
		setIsExit(false);
		setResultWord(undefined);
		setAudioSrc(undefined);
		setMyAudioSrc(undefined);
	};

	const playAudio = () => {
		if (audioRef.current) {
			audioRef.current?.play();
		}
	};

	const playMyAudio = () => {
		if (myAudioRef.current) myAudioRef.current.play();
	};

	const selectWord = (index: number) => {
		init();
		sound.playClick();

		const item = problemList[index];

		setSelectedWord(item);
		setResultColor("#C8CCD3");
		setAudioSrc(`${env.RES_URL_ROOT}/${item.content_sound}`);

		setTimeout(() => {
			playAudio();
		}, 500);
	};

	const WordCard = ({
		item,
		index,
		isChecked,
	}: { item: ProblemType; index: number; isChecked: boolean }) => {
		const imgSrc = `${env.RES_URL_ROOT}/${item.content_img}`;

		const realIndex = problemList.findIndex((p) => p.id === item.id);

		return (
			<button
				type="button"
				onClick={() => setProblemIndex(realIndex)}
				className={clsx(
					baseButtonClasses,
					"w-[100px] border-[#fff] border-[4px] bg-[#fff]",
					item.content === selectedWord?.content &&
						"!bg-[#4396F4] !border-[#4396F4] !text-white font-bold",
				)}
			>
				<div
					className={`size-[50px] rounded-[5px] p-[5px] bg-[url(${imgSrc})] bg-center bg-cover bg-size-[90px] bg-white bg-no-repeat`}
				/>
				<div className="relative flex size-[50px] items-center justify-center text-[12px]">
					{item.content}
					<div className="absolute top-[0px] right-[0px]">
						<CardCheckIcon color={isChecked ? "#11C378" : "#E5E8EC"} />
					</div>
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
			if (problemIndex === problemList.length - 1) {
				setIsExit(true);
			}
		} else {
			sound.playIncorrect();
			setResultColor("#F15F49");
		}
	};

	const [tabIndex, setTabIndex] = useState(0);
	const onTabClick = (tabId: number, tabIndex: number) => {
		setTabIndex(tabIndex);
		setSelectedTab(tabId);
		const items = tabItemList.filter((item) => item.group_id === tabId);
		seteSlectedTabItems(items);
	};

	useEffect(() => {
		setTimeout(() => {
			setProblemIndex(0);
		}, 100);
	}, []);

	useEffect(() => {
		selectWord(problemIndex);
	}, [problemIndex]);

	const groupName = (unit?.title ?? "").split(":")[0].trim();
	const lesson = [
		t("catalog.chapterSeq", { seq: chapter?.seq ?? 1 }),
		groupName,
	]
		.filter(Boolean)
		.join(" · ");
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
					instruction={t("activity.instrWordRep")}
					stimulusStyle={{ gap: 20 }}
				>
					<WordPicture
						word={selectedWord?.content ?? ""}
						image={`${env.RES_URL_ROOT}/${selectedWord?.content_img}`}
					/>
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
						const at = tabList?.findIndex((x) => x.tab_name === name) ?? -1;
						if (at >= 0) onTabClick(tabList[at].id, at);
					}}
				>
					<ThumbWordCards
						cards={shown.map((x) => ({
							word: x.content,
							image: `${env.RES_URL_ROOT}/${x.content_img}`,
							done: false,
						}))}
						current={selectedWord?.content ?? ""}
						onPick={(word) => {
							const idx = problemList.findIndex((x) => x.content === word);
							if (idx >= 0) setProblemIndex(idx);
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
