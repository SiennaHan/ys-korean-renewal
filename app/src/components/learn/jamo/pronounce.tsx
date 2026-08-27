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
	HeardRow,
	MouthVideo,
	PracticeBrowser,
	ProblemCard,
	WordCards,
} from "@/components/main/activity";
import AudioRecorder from "@/components/problem/audio-recorder";
import { JamoHeader, ProblemHeader } from "@/components/problem/scene/header";
import { ModuleTitle } from "@/components/problem/scene/title";
import { env } from "@/config/env";
import { useJamoActivityState } from "@/hooks/use-jamo-activity-state";
import { chapters } from "@/shared/data/chapter";
import { jamoProblems } from "@/shared/data/jamo";
import { modules } from "@/shared/data/module";
import { wordgroup } from "@/shared/data/problem_wordgroup";
import { wordgroup_choice } from "@/shared/data/problem_wordgroup_choice";
import { units } from "@/shared/data/unit";
import type { ModuleType, ProblemType } from "@/types/book.types";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const wordGridClassName = "px-[16px] grid grid-cols-5 gap-[12px]";

/**
 * 자모 발음 — **표시만** 한다.
 * 진행바가 없는 것은 shell_spec "활동별 진행 표시 정책"(2026-08-25) 대로다.
 */
export function JamoPronounceView({
	lesson,
	onExit,
	onSkip,
	instruction,
	video,
	word,
	mine,
	onPlaySource,
	onPlayMine,
	tabs,
	currentTab,
	onTab,
	words,
	onPick,
	isDone,
	heard,
	footer,
	next,
	after,
}: {
	lesson: string;
	onExit?: () => void;
	onSkip?: () => void;
	instruction: ReactNode;
	/** 입모양. 자리표 글자만 줄 수도 있다(목업) */
	video: ReactNode;
	word: string;
	mine?: "" | "ok" | "no";
	onPlaySource?: () => void;
	onPlayMine?: () => void;
	tabs: string[];
	currentTab: string;
	onTab?: (name: string) => void;
	words: string[];
	onPick?: (word: string) => void;
	isDone?: (word: string) => boolean;
	/**
	 * 녹음을 마친 뒤 "이렇게 들렸어요" 한 줄. 없으면 안 그린다.
	 *
	 * 정본(`screens_SOT.html` 의 `speakView`)이 녹음을 마치면 이 줄을 띄우는데
	 * 제품은 **판정 색만 바꾸고 무엇으로 들렸는지는 안 보여 줬다**(2026-08-27).
	 * 틀렸다는 것만 알고 왜 틀렸는지는 모르는 화면이었다. 목업 캡처가 녹음 전
	 * 상태라 대조에도 안 걸렸다.
	 */
	heard?: { text: string; ok: boolean };
	footer: ReactNode;
	/** shell_spec §26 — 첫 녹음을 마치면 [다음]이 활성 */
	next?: { enabled: boolean; onClick?: () => void };
	after?: ReactNode;
}) {
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />

			<ActivityBody>
				<ProblemCard instruction={instruction} stimulusStyle={{ gap: 16 }}>
					<MouthVideo>{video}</MouthVideo>
					<AudioPair
						source={word}
						mine={mine ?? ""}
						onPlaySource={onPlaySource}
						onPlayMine={onPlayMine}
					/>
				</ProblemCard>

				<PracticeBrowser tabs={tabs} current={currentTab} onTab={onTab}>
					<WordCards
						words={words}
						current={word}
						done={isDone ?? (() => false)}
						onPick={onPick}
					/>
				</PracticeBrowser>

				{heard && <HeardRow heard={heard.text} ok={heard.ok} />}
			</ActivityBody>

			<ActivityFooter>
				<Dock right={next ?? { enabled: false }}>{footer}</Dock>
			</ActivityFooter>
			{after}
		</ActivityFrame>
	);
}

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
	const problemList = jamoProblems.filter((item) => item.module_code === code);

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

	/*
	 * 활동 상태 — **진입만** 알린다. 이 화면은 순서대로 푸는 활동이 아니라
	 * 낱말을 골라 다니며 발음해 보는 자리다(목업 진행바 0칸). 자세한 이유는
	 * use-jamo-activity-state.ts 의 `mode` 주석에 있다.
	 */
	useJamoActivityState({
		total: problemList.length,
		index: 0,
		onResume: () => {},
		done: false,
		mode: "enter-only",
	});

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

	/*
	 * 건너뛰기 — word-repeat 과 같은 사정이다. 하단 CTA 가 없고 연습 목록에서
	 * 낱말을 골라 진행하므로 "다음" 은 목록의 다음 낱말이고, 마지막이면 나간다.
	 * 여기는 낱말을 id 로 고르므로 지금 낱말의 자리를 찾아 다음 것을 넘긴다.
	 */
	const skip = () => {
		const here = problemList.findIndex((pr) => pr.id === selectedWord?.id);
		const nextItem = problemList[here + 1];
		if (!nextItem) {
			router.history.back();
			return;
		}
		selectWord(nextItem.id);
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
	// jamoProblems 를 걸러 만든 목록이라 마운트 뒤 달라지지 않는다.
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
		<JamoPronounceView
			lesson={lesson}
			onExit={() => router.history.back()}
			onSkip={skip}
			instruction={t("activity.instrSpeak")}
			video={
				// biome-ignore lint/a11y/useMediaCaption: 입모양 영상 — 말이 없다
				<video controls src={videoSrc} />
			}
			word={selectedWord?.content ?? ""}
			mine={resultWord ? (isSucceed ? "ok" : "no") : ""}
			onPlaySource={playAudio}
			onPlayMine={playMyAudio}
			tabs={(tabList ?? []).map((x) => x.tab_name)}
			currentTab={tabList?.find((x) => x.id === selectedTab)?.tab_name ?? ""}
			onTab={(name) => {
				const hit = tabList?.find((x) => x.tab_name === name);
				if (hit) onTabClick(hit.id);
			}}
			heard={resultWord ? { text: resultWord, ok: isSucceed } : undefined}
			words={shown.map((x) => x.content)}
			onPick={(word) => {
				const hit = shown.find((x) => x.content === word);
				if (hit) selectWord(hit.id);
			}}
			footer={<AudioRecorder dock setResult={setResult} />}
			// 녹음을 마치면 다음으로 — 명세 §26
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
