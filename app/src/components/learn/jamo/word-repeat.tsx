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
import { jamoProblems } from "@/shared/data/jamo";
import { modules } from "@/shared/data/module";
import { wordgroup } from "@/shared/data/problem_wordgroup";
import { wordgroup_choice } from "@/shared/data/problem_wordgroup_choice";
import { units } from "@/shared/data/unit";
import type { ProblemType } from "@/types/book.types";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const baseButtonClasses =
	"flex rounded-[8px] items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300";

/**
 * 단어 듣고 따라 말하기 — **표시만** 한다.
 * 진행바가 없는 것은 shell_spec "활동별 진행 표시 정책"(2026-08-25 확정) 대로다 —
 * 내부 탐색형이라 카드·탭이 현재 위치를 말한다.
 */
export function JamoWordRepeatView({
	lesson,
	onExit,
	onSkip,
	instruction,
	word,
	image,
	mine,
	onPlaySource,
	onPlayMine,
	tabs,
	currentTab,
	onTab,
	cards,
	onPick,
	footer,
	next,
	after,
}: {
	lesson: string;
	onExit?: () => void;
	onSkip?: () => void;
	instruction: ReactNode;
	word: string;
	image: string;
	/** 내가 말한 것의 판정 — "" · "ok" · "no" */
	mine?: "" | "ok" | "no";
	onPlaySource?: () => void;
	onPlayMine?: () => void;
	tabs: string[];
	currentTab: string;
	onTab?: (name: string) => void;
	cards: { word: string; image: string; done: boolean }[];
	onPick?: (word: string) => void;
	footer: ReactNode;
	/**
	 * 하단 오른쪽 [다음]. shell_spec §26 — "발음 활동은 첫 녹음을 마치면 [다음]이 활성".
	 * 목업은 처음부터 이 칸을 그렸는데 제품에는 없었다(대조가 못 보던 자리다).
	 */
	next?: { enabled: boolean; onClick?: () => void };
	/** 숨은 <audio> 처럼 표시가 아닌 것 */
	after?: ReactNode;
}) {
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />

			<ActivityBody>
				<ProblemCard instruction={instruction} stimulusStyle={{ gap: 20 }}>
					<WordPicture word={word} image={image} />
					<AudioPair
						source={word}
						mine={mine ?? ""}
						onPlaySource={onPlaySource}
						onPlayMine={onPlayMine}
					/>
				</ProblemCard>

				<PracticeBrowser tabs={tabs} current={currentTab} onTab={onTab}>
					<ThumbWordCards cards={cards} current={word} onPick={onPick} />
				</PracticeBrowser>
			</ActivityBody>

			<ActivityFooter>
				<Dock right={next ?? { enabled: false }}>{footer}</Dock>
			</ActivityFooter>
			{after}
		</ActivityFrame>
	);
}

export default function JamoWordRepeat({ moduleCode }: { moduleCode: string }) {
	const code = moduleCode;
	const router = useRouter();
	const { t } = useTranslation();

	const sound = useSoundEffects();

	const module = modules.find((item) => item.code === code);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const problemList = jamoProblems.filter((item) => item.module_code === code);

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

	/*
	 * 건너뛰기 — 이 화면은 하단 CTA 가 없고 연습 목록에서 낱말을 골라 진행한다.
	 * 그래서 "다음" 은 목록의 다음 낱말이다. 마지막이면 화면을 나간다.
	 * 목업 모든 활동 화면에 건너뛰기가 있는데 실제 자모 화면엔 없었다 —
	 * 대조가 못 잡는 자리다(activity-parity 는 learn/jamo 를 안 본다).
	 */
	const skip = () => {
		const nextIndex = problemIndex + 1;
		if (nextIndex >= problemList.length) {
			router.history.back();
			return;
		}
		setProblemIndex(nextIndex);
		selectWord(nextIndex);
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

	// problemIndex 가 바뀔 때 그 낱말을 고르는 방아쇠다. selectWord 는 매 렌더 새로
	// 만들어지는 함수이고 안에서 setState 와 setTimeout 재생을 부르므로, 넣으면
	// 매 렌더마다 다시 골라 소리가 겹치고 무한 렌더가 된다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: 문항 전환 방아쇠 — 위 주석 참고
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
		<JamoWordRepeatView
			lesson={lesson}
			onExit={() => router.history.back()}
			onSkip={skip}
			instruction={t("activity.instrWordRep")}
			word={selectedWord?.content ?? ""}
			image={`${env.RES_URL_ROOT}/${selectedWord?.content_img}`}
			mine={resultWord ? (isSucceed ? "ok" : "no") : ""}
			onPlaySource={playAudio}
			onPlayMine={playMyAudio}
			tabs={(tabList ?? []).map((x) => x.tab_name)}
			currentTab={tabList?.find((x) => x.id === selectedTab)?.tab_name ?? ""}
			onTab={(name) => {
				const at = tabList?.findIndex((x) => x.tab_name === name) ?? -1;
				if (at >= 0) onTabClick(tabList[at].id, at);
			}}
			cards={shown.map((x) => ({
				word: x.content,
				image: `${env.RES_URL_ROOT}/${x.content_img}`,
				done: false,
			}))}
			onPick={(word) => {
				const idx = problemList.findIndex((x) => x.content === word);
				if (idx >= 0) setProblemIndex(idx);
			}}
			footer={<AudioRecorder dock setResult={setResult} />}
			// 녹음을 마치면 다음 단어로 — 명세 §26
			next={{ enabled: !!resultWord, onClick: skip }}
			after={
				<>
					{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
					<audio className="hidden" ref={audioRef} src={audioSrc} />
					{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
					<audio className="hidden" ref={myAudioRef} src={myAudioSrc} />
				</>
			}
		/>
	);
}
