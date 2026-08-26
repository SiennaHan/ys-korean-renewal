/**
 * 활동 컴포넌트 ↔ 목업 대조.
 *
 * 컴포넌트를 정적 HTML 로 그려 src/screens_ref/activity__*.html 과 맞춰 본다.
 * 목업 화면은 손으로 짠 것이라 이 대조가 곧 "디자인이 같다"의 증명이 된다.
 * 눈으로 보는 대조는 Storybook 이 하고, 이쪽은 구조가 어긋나면 바로 잡아 준다.
 *
 *   npx tsx scripts/activity-parity.tsx
 */
import "./parity-shim";
import { AudioProvider } from "@/components/audio/audio-provider";
import { MicPermissionProvider } from "@/components/audio/mic-permission-provider";
import { ConfettiProvider } from "@/components/effect/confetti-provider";
import { LottieEffectProvider } from "@/components/effect/lottie-effect-provider";
import { SignProvider } from "@/components/sign/sign-provider";
import { ToastProvider } from "@/components/toast/toast-context";

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FillBlankView } from "@/components/learn/fill-blank";
import { JamoChooseView } from "@/components/learn/jamo/choose";
import { JamoPronounceView } from "@/components/learn/jamo/pronounce";
import { JamoWordRepeatView } from "@/components/learn/jamo/word-repeat";
import { JamoWordWriteView } from "@/components/learn/jamo/word-write";
import { ListenAnswerView } from "@/components/learn/listen-answer";
import { ReadAnswerView } from "@/components/learn/read-answer";
import {
	WordPreviewView,
	WordQuizPageView,
} from "@/components/learn/word-learning";
import WordQuizCard from "@/components/learn/word-quiz-card";
import { AudioRow } from "@/components/main/activity/audio";
import { BriefingScreen } from "@/components/main/activity/briefing-screen";
import { ChatScreen } from "@/components/main/activity/chat";
import {
	ChipOption,
	ChipWrap,
	Choice,
	ChoiceList,
} from "@/components/main/activity/choice";
import { FlashcardScreen } from "@/components/main/activity/flashcard";
import {
	JamoCombineSelectView,
	JamoSection,
	JamoTraceView,
	WriteCanvas,
	WriteCanvasPane,
} from "@/components/main/activity/jamo-write";
import {
	PracticeBrowser,
	ThumbWordCards,
	WordCards,
} from "@/components/main/activity/practice-browser";
import { ProblemCard } from "@/components/main/activity/problem-card";
import { RecordControl } from "@/components/main/activity/record";
import { ReportScreen } from "@/components/main/activity/report-screen";
import { ResultScreen } from "@/components/main/activity/result-screen";
import { RoleplayScreen } from "@/components/main/activity/roleplay";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Dock,
	PrimaryButton,
} from "@/components/main/activity/shell";
import {
	FailedScreen,
	LoadingScreen,
	MicDeniedScreen,
} from "@/components/main/activity/state-screens";
import {
	AudioBar,
	AudioPair,
	ComboTarget,
	ListenCopy,
	MouthVideo,
	Passage,
	QuestionText,
	SyllableRow,
	WordFocus,
	WordPicture,
} from "@/components/main/activity/stimulus";
import { WordPreviewList } from "@/components/main/activity/word-preview";
import Jamo from "@/components/main/course-list/jamo";
import {
	CardSortIntroView,
	CardSortLevelView,
	CardSortPlayView,
	CardSortResultView,
} from "@/components/main/game/card-sort-view";
import { GameListView } from "@/components/main/game/list-view";
import {
	ParticleSniperLessonView,
	ParticleSniperLevelView,
	ParticleSniperPlayView,
	ParticleSniperResultView,
} from "@/components/main/game/particle-sniper-view";
import {
	C as SP_C,
	SP_KEYFRAMES_CSS,
	type Location as SpLocation,
	type Puzzle as SpRawPuzzle,
	resolveToken,
} from "@/components/main/game/seoul-puzzle";
import {
	SpCompleteView,
	SpEntryView,
	SpMapView,
	SpPuzzleView,
	SpTravelHeader,
} from "@/components/main/game/seoul-puzzle-view";
import {
	PcGameView,
	type PcQuestion,
	PcResultView,
	PcSelectView,
	PcTitleView,
} from "@/components/main/game/spring-picnic-view";
import VocashotSolo from "@/components/main/game/vocashot-solo";
import {
	VocashotPlayView,
	VocashotResultView,
} from "@/components/main/game/vocashot-view";
import HomeView from "@/components/main/home/view";
import BookTabs from "@/components/main/textbook/book-tabs";
import ChapterChips from "@/components/main/textbook/chapter-chips";
import {
	ACT_SECTIONS,
	actLabel,
	buildBookTabs,
	buildChapterChips,
} from "@/components/main/textbook/labels";
import ModuleList, {
	ChapterHead,
	type ModuleState,
} from "@/components/main/textbook/module-list";
import AudioRecorder from "@/components/problem/audio-recorder";
import i18n from "@/i18n";
import { chapters } from "@/shared/data/chapter";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";

/** 목업의 한국어와 i18n 의 한국어가 같은지도 이 대조에 얹는다 */
const T = (key: string) => i18n.t(key);
const LESSON = "1급 4과";

/** 문제 화면의 공통 껍데기 — 목업 gapFrame 과 같은 자리 */
function Screen({
	lesson = LESSON,
	progress,
	/** 칸을 눌러 그 문항으로 — 제품이 문항형 활동에 늘 준다 */
	jump = true,
	body,
	footer,
	feedback,
	noFeedback,
	dockRight,
}: {
	lesson?: string;
	progress?: [number, number];
	jump?: boolean;
	body: ReactElement;
	footer: ReactElement;
	feedback?: ReactElement | null;
	/** 피드백 칸이 aria-live 없이 비는 화면 (목업 gapFrame 의 기본값) */
	noFeedback?: boolean;
	dockRight?: { enabled: boolean };
}) {
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={() => {}} onSkip={() => {}} />
			{progress && (
				<ActivityProgress
					current={progress[0]}
					total={progress[1]}
					onJump={jump ? () => {} : undefined}
				/>
			)}
			<ActivityBody feedback={noFeedback ? undefined : (feedback ?? null)}>
				{body}
			</ActivityBody>
			<ActivityFooter>
				<Dock right={dockRight}>{footer}</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}

const NEXT = <PrimaryButton label={T("player.next")} on={false} />;

const CONSONANTS = "ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ ㅎ ㅋ ㅌ".split(" ");
const VOWELS = "ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ ㅐ ㅔ ㅚ ㅟ ㅑ ㅕ".split(" ");
const FINALS = "ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ".split(" ");
/*
 * 어휘 문제 두 갈래의 표본. 제품 `WordQuizCard` 를 그대로 그리므로 원장 한 줄의
 * 꼴을 그대로 흉내 낸다 — 값은 목업이 그리는 것과 같게 맞췄다.
 */
const WORD_QUIZ_BASE = {
	book_id: 1,
	chapter: 6,
	prompt_en: "",
	prompt_jp: "",
	prompt_cn: "",
	prompt_vi: "",
	meaning_jp: "",
	meaning_cn: "",
	meaning_vi: "",
	selection3: "",
	selection4: "",
	item_id: "",
	review_status: "reviewed",
	source_page: "",
	change_note: "",
	hold_reason: "",
} as const;

const WORD_QUIZ_MEANING = {
	...WORD_QUIZ_BASE,
	id: 9001,
	type: "meaning-to-word" as const,
	prompt: "단어에 맞는 뜻을 고르세요.",
	meaning_en: "college / university",
	image: "",
	selection1: "친구",
	selection2: "대학교",
	selection3: "학생",
	selection4: "성",
	answer_index: 1,
};

const WORD_QUIZ_IMAGE = {
	...WORD_QUIZ_BASE,
	id: 9002,
	type: "image-to-word" as const,
	prompt: "그림에 알맞은 단어를 고르세요.",
	meaning_en: "",
	image: "b1_ch6_p63_10.png",
	selection1: "책",
	selection2: "공책",
	selection3: "연필",
	selection4: "지우개",
	answer_index: 0,
};

const TABS = ["1", "2", "3"];
const JAMO_WORDS = "아 어 오 우 으 이 애 에 외 위".split(" ");
const IMG = "../illust/images";
const FAMILY = [
	["어머니", `${IMG}/b1/b1_ch8_p85_13.png`, true],
	["아버지", `${IMG}/b1/b1_ch8_p85_12.png`, true],
	["형", `${IMG}/b1/b1_ch8_p85_15.png`, true],
	["누나", `${IMG}/b1/b1_ch8_p85_16.png`, false],
	["남동생", `${IMG}/b1/b1_ch8_p85_18.png`, false],
	["여동생", `${IMG}/b1/b1_ch8_p85_19.png`, false],
].map(([word, image, done]) => ({
	word: word as string,
	image: image as string,
	done: done as boolean,
}));
const THINGS = [
	["바지", `${IMG}/b3/b3_ch14_p159_28.png`, true],
	["책", `${IMG}/b1/b1_ch6_p63_10.png`, true],
	["가방", `${IMG}/b1/b1_ch6_p63_9.png`, false],
	["공책", `${IMG}/b1/b1_ch6_p63_11.png`, false],
	["연필", `${IMG}/b1/b1_ch6_p63_14.png`, false],
	["지우개", `${IMG}/b1/b1_ch6_p63_16.png`, false],
].map(([word, image, done]) => ({
	word: word as string,
	image: image as string,
	done: done as boolean,
}));
const ROLE_TURNS = [
	["AI", false, "어서 오세요. 뭘 도와드릴까요?"],
	["나", true, "커피 한 잔 주세요."],
	["AI", false, "따뜻한 걸로 드릴까요?"],
	["나", true, "네, 따뜻한 걸로 주세요."],
	["AI", false, "삼천 원입니다."],
].map(([who, mine, ko], i) => ({
	id: i,
	who: who as string,
	mine: mine as boolean,
	ko: ko as string,
}));

/*
 * ─── 픽스처가 실제 데이터를 흉내 낸 자리 ─────────────────────────────
 *
 * 이 파일의 값은 **내가 목업을 보고 손으로 적은 것**이다. 그래서 목업과는
 * 맞는데 **실제 데이터와는 규약이 다른** 값이 들어갈 수 있고, 그러면 대조는
 * 통과하면서 실제 화면만 깨진다. 실제로 겪었다 — 조사 스나이퍼 픽스처는
 * 목업을 따라 `저는 한국어___공부해요` 를 적었는데, 진짜 데이터는 `___` 를
 * 한 번도 안 쓰고 `blank` 의 `[?]` 를 쓴다. 대조는 계속 "모두 같다" 였고
 * 화면에는 정답이 그대로 보였다(BLOCKERS.md).
 *
 * 그래서 **데이터를 흉내 낸 값은 여기에 등록한다.** 등록하면
 * `.parity-out/_fixtures.json` 으로 나가고, `fixture-data-check.py` 가
 * 진짜 데이터에서 캔 불변식과 맞춰 본다.
 *
 * 등록 대상은 **씨드 JSON 의 레코드를 흉내 낸 값**뿐이다. 점수·HP·진행률처럼
 * 화면이 만들어 내는 값은 대조할 원본이 없으니 등록하지 않는다.
 */
const DATA_FIXTURES: Record<string, unknown[]> = {};
function fromData<T>(key: string, value: T): T {
	(DATA_FIXTURES[key] ??= []).push(value);
	return value;
}

const SCREENS: Record<string, ReactElement> = {
	/*
	 * 손으로 조립하지 않는다 — **제품이 그리는 그 컴포넌트**를 그린다.
	 * 값만 목업의 표본을 넣는다. 전에는 여기서 부품을 다시 배치했고,
	 * 그래서 제품이 목업과 갈라져도 대조가 통과했다(빈칸 표기·문법 줄·진행바).
	 */
	grammar: (
		<FillBlankView
			lesson={LESSON}
			onExit={() => {}}
			onSkip={() => {}}
			current={1}
			total={5}
			onJump={() => {}}
			instruction={T("activity.instrGrammar")}
			answerState="idle"
			segments={["오늘 날씨가 ", " 밖에 나가고 싶어요."]}
			selections={["좋아서", "좋지만", "좋으면", "좋아도"]}
			answer="좋아서"
			selectedAnswer={null}
			onSelect={() => {}}
			primary={{ label: T("player.next"), on: false, onClick: () => {} }}
		/>
	),

	/*
	 * 원장이 가진 갈래는 둘이다 — 뜻(meaning-to-word 950) · 그림(image-to-word 196).
	 * 낱말+발음듣기 갈래는 2026-08-26 에 정본에서 뺐다(원장에 0건이라 학생이 못 본다).
	 */
	wordQuiz: (
		<WordQuizPageView
			lesson={LESSON}
			onExit={() => {}}
			onSkip={() => {}}
			current={0}
			total={4}
			onJump={() => {}}
			card={<WordQuizCard quiz={WORD_QUIZ_MEANING} />}
			primary={{ label: T("player.next"), on: false }}
		/>
	),

	wordQuiz_image: (
		<WordQuizPageView
			lesson={LESSON}
			onExit={() => {}}
			onSkip={() => {}}
			current={1}
			total={4}
			onJump={() => {}}
			card={<WordQuizCard quiz={WORD_QUIZ_IMAGE} />}
			primary={{ label: T("player.next"), on: false }}
		/>
	),

	listen: (
		<ListenAnswerView
			lesson={LESSON}
			onExit={() => {}}
			onSkip={() => {}}
			current={0}
			total={3}
			onJump={() => {}}
			instruction={T("activity.instrListen")}
			type="ox"
			question="여자 이름은 영주예요."
			onSelect={() => {}}
			options={[
				{ index: 0, text: "X" },
				{ index: 1, text: "O" },
			]}
			primary={{ label: T("player.next"), on: false, onClick: () => {} }}
		/>
	),

	jamoListen: (
		<JamoChooseView
			lesson="1급 1과"
			onExit={() => {}}
			onSkip={() => {}}
			current={0}
			total={4}
			onJump={() => {}}
			instruction={T("activity.instrJamoListen")}
			audioLabel="발음 듣기"
			audioSub="자모 음성"
			options={["어", "오"]}
			onSelect={() => {}}
			primary={{ label: T("player.next"), on: false, onClick: () => {} }}
		/>
	),

	loading: <LoadingScreen lesson={LESSON} current={0} total={4} />,
	failed: <FailedScreen lesson={LESSON} />,
	micdenied: <MicDeniedScreen lesson={LESSON} />,

	result: (
		<ResultScreen
			lesson={LESSON}
			total={4}
			answered={3}
			graded={3}
			correct={2}
			wrongs={[{ picked: "grape", explanation: "사과는 apple 이에요." }]}
		/>
	),

	report: (
		<ReportScreen
			lesson={LESSON}
			hits={2}
			missions={3}
			values={[78, 62, 85, 70]}
			rows={[
				{
					axis: "pronunciation",
					text: "전반적으로 또렷해요. 커피의 받침을 조금 더 살려 보세요.",
				},
				{
					axis: "grammar",
					text: "어미가 대체로 정확해요. 높임 표현을 한 번 더 확인해 보세요.",
				},
				{ axis: "vocabulary", text: "주문에 필요한 말을 잘 썼어요." },
				{ axis: "content", text: "주문·가격·인사를 자연스럽게 다 다뤘어요." },
			]}
		/>
	),

	reading: (
		<ReadAnswerView
			lesson="1급 6과"
			onExit={() => {}}
			onSkip={() => {}}
			current={0}
			total={3}
			onJump={() => {}}
			instruction={T("activity.instrReading")}
			passage={`저는 마이클입니다. 미국 사람이에요.
지금 한국에서 한국어를 배웁니다.
학교는 신촌에 있어요. 매일 아침 아홉 시에 갑니다.`}
			question="마이클은 어디에서 한국어를 배웁니까?"
			type="choice"
			options={["미국", "신촌", "도쿄", "부산"]}
			onSelect={() => {}}
			primary={{ label: T("player.next"), on: false, onClick: () => {} }}
		/>
	),

	wordPreview: (
		<WordPreviewView
			lesson={LESSON}
			onExit={() => {}}
			onSkip={() => {}}
			instruction={T("activity.instrWordPreview")}
			rows={[
				{ key: 1, word: "안녕하다", meaning: "to be well / hello" },
				{ key: 2, word: "네", meaning: "yes" },
				{ key: 3, word: "제", meaning: "my" },
				{ key: 4, word: "이름", meaning: "name" },
				{ key: 5, word: "저", meaning: "I (formal)" },
				{ key: 6, word: "반갑다", meaning: "to be glad to meet" },
			]}
			primary={{ label: T("activity.toQuiz"), on: true, action: "toQuiz" }}
		/>
	),

	write: (
		<JamoCombineSelectView
			lesson="1급 1과"
			onExit={() => {}}
			onSkip={() => {}}
			current={0}
			total={3}
			onJump={() => {}}
			instruction={T("activity.instrWriteSelect")}
			audioLabel={T("player.playAudio")}
			audioSub={T("activity.audioSub")}
			target={{ syllable: "가", parts: "ㄱ + ㅏ", onHint: () => {} }}
			sections={[
				{ step: 1, slot: "consonant", options: CONSONANTS, picked: "ㄱ" },
				{ step: 2, slot: "vowel", options: VOWELS, picked: "ㅏ" },
			]}
			primary={{ label: T("player.confirm"), on: true, action: "toWrite" }}
		/>
	),

	write3: (
		<JamoCombineSelectView
			lesson="1급 1과"
			onExit={() => {}}
			onSkip={() => {}}
			current={0}
			total={1}
			onJump={() => {}}
			instruction={T("activity.instrWriteSelect")}
			audioLabel={T("player.playAudio")}
			audioSub={T("activity.audioSub")}
			target={{ syllable: "산", parts: "ㅅ + ㅏ + ㄴ", onHint: () => {} }}
			sections={[
				{ step: 1, slot: "consonant", options: CONSONANTS, picked: "ㅅ" },
				{ step: 2, slot: "vowel", options: VOWELS, picked: "ㅏ" },
				{ step: 3, slot: "final", options: FINALS, picked: "ㄴ" },
			]}
			primary={{ label: T("player.confirm"), on: true, action: "toWrite" }}
		/>
	),

	/*
	 * 판 안쪽은 대조하지 않는다 — 목업은 안내 그림을 깐 정적 canvas 이고 제품은
	 * 획을 판정하는 진짜 HangulTracingCanvas 다. 그 바깥은 전부 대조한다.
	 * 자세한 사정은 JamoTraceView 주석에 있다.
	 */
	write_canvas: (
		<JamoTraceView
			lesson="1급 1과"
			onExit={() => {}}
			onSkip={() => {}}
			current={0}
			total={3}
			onJump={() => {}}
			instruction={T("activity.instrWriteTrace")}
			canvas={<WriteCanvasPane guide="../handwriting/가.png" />}
			primary={{ label: T("player.confirm"), on: false }}
		/>
	),

	write3_canvas: (
		<JamoTraceView
			lesson="1급 1과"
			onExit={() => {}}
			onSkip={() => {}}
			current={0}
			total={1}
			onJump={() => {}}
			instruction={T("activity.instrWriteTrace")}
			canvas={<WriteCanvasPane guide="../handwriting/산.png" />}
			primary={{ label: T("player.confirm"), on: false }}
		/>
	),

	speak: (
		<JamoPronounceView
			lesson="1급 1과"
			onExit={() => {}}
			onSkip={() => {}}
			instruction={T("activity.instrSpeak")}
			video="입모양 영상"
			word="어"
			tabs={TABS}
			currentTab="1"
			words={JAMO_WORDS}
			isDone={(w) => JAMO_WORDS.indexOf(w) < 3}
			footer={<RecordControl mode="idle" action="srec" />}
		/>
	),

	wordrep: (
		<JamoWordRepeatView
			lesson="1급 1과"
			onExit={() => {}}
			onSkip={() => {}}
			instruction={T("activity.instrWordRep")}
			word="어머니"
			image={FAMILY[0].image}
			tabs={TABS}
			currentTab="1"
			cards={FAMILY}
			footer={<RecordControl mode="idle" action="srec" />}
		/>
	),

	readwrite: (
		<JamoWordWriteView
			lesson="1급 1과"
			onExit={() => {}}
			onSkip={() => {}}
			instruction={T("activity.instrReadWrite")}
			word="바지"
			image={THINGS[0].image}
			syllables={["바", "지"]}
			tabs={TABS}
			currentTab="1"
			cards={THINGS}
			primary={{ label: T("player.next"), on: false, onClick: () => {} }}
		/>
	),

	flash: (
		<FlashcardScreen
			lesson={LESSON}
			index={0}
			total={3}
			card={{ front: "사과", back: "apple", sub: "명사" }}
			flipped={false}
			knownCount={0}
			unknownCount={0}
			onSkip={() => {}}
		/>
	),

	chat: (
		<ChatScreen
			lesson={LESSON}
			scenario="카페에서 음료를 주문해 보세요"
			scenarioTranslated="Order a drink at the cafe"
			missions={["주문하기", "가격 묻기", "인사하기"]}
			hits={new Set([0, 1])}
			turns={[
				{ who: "bot", text: "어서 오세요. 무엇을 드릴까요?" },
				{ who: "me", text: "커피 주세요." },
				{ who: "bot", text: "네, 아메리카노요? 따뜻한 걸로 드릴까요?" },
				{ who: "me", text: "얼마예요?" },
			]}
			waiting
			recordMode="idle"
			onSkip={() => {}}
		/>
	),

	role: (
		/*
		 * 도크의 조작은 제품이 넣는 것을 그대로 넣는다 — 내 차례의 녹음 도크는
		 * `AudioRecorder dock` 이다. 여기만 `RecordControl` 을 직접 쓰면 대조가
		 * 또 아무도 안 보는 쪽을 보게 된다.
		 */
		<RoleplayScreen
			lesson={LESSON}
			turns={ROLE_TURNS}
			current={1}
			totalScenarios={2}
			onScenarioJump={() => {}}
			direction="ai"
			control={<AudioRecorder dock action="roleRecord" setResult={() => {}} />}
			onSkip={() => {}}
		/>
	),

	briefing: (
		<BriefingScreen
			lesson="4과"
			content={{
				title: "카페에서 주문하기",
				titleTranslated: "Ordering at a cafe",
				scene: "카페에 왔습니다. 마실 것을 주문해 보세요.",
				sceneTranslated: "You are at a cafe. Try ordering a drink.",
				keywords: [
					["주문하기", "마실 것을 골라 주문해요"],
					["가격 묻기", "얼마인지 물어봐요"],
					["인사하기", "헤어질 때 인사해요"],
				],
				words: [
					["커피", "coffee"],
					["얼마", "how much"],
					["따뜻하다", "to be hot"],
				],
			}}
		/>
	),
};

/** 어휘 문제 제시물의 소리 아이콘 — 목업이 sound-icon 안에 그대로 두는 모양 */
function IconVolumeInline() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4.75 9.3v5.4c0 .72.58 1.3 1.3 1.3h2.52l3.96 3.13c.82.65 2.02.07 2.02-.97V5.84c0-1.04-1.2-1.62-2.02-.97L8.57 8H6.05c-.72 0-1.3.58-1.3 1.3Z" />
			<path d="M18.15 9.2c.8.72 1.2 1.65 1.2 2.8s-.4 2.08-1.2 2.8" />
		</svg>
	);
}

/*
 * 교재학습 목록 — 목업 nav__book__resume 과 대조한다.
 *
 * 2026-08-21 에 목업을 실제 데이터에 맞췄다 — 급 탭 9개, 1급 과 12개.
 * 남은 표본은 과 제목뿐이다("가족" · 실제 1급 6과는 다른 제목이다). 상태는
 * 서버가 주는 것이라 목업이 정한 것을 그대로 쓴다.
 * 라벨은 labels.ts 의 같은 함수로 만들므로, 급/권 처럼 어긋나면 여기서 잡힌다.
 *
 * 탭 바는 이 컴포넌트가 그리지 않는다(레이아웃이 그린다). 목업 캡처에는 들어
 * 있으므로 대조 쪽에서 뺀다 — activity-parity-diff.py 의 drop_tabbar.
 */
const NAV_ACT_STATE: Record<string, ModuleState> = {
	word: "done",
	roleplay: "review",
	"listen-answer": "doing",
	"fill-blank": "none",
	"read-answer": "off",
	"mission-chat": "doing",
	flashcard: "doing",
};

function NavBookScreen() {
	// i18n.t 는 옵션을 받으면 상세 결과 타입도 낼 수 있어 문자열로 좁힌다
	const t = (key: string, opts?: Record<string, unknown>) =>
		String(i18n.t(key, opts as never));
	// 1급의 비-자모 과 전체(4~15과). 1~3과는 한글 탭으로 간다
	const book1 = chapters
		.filter((ch) => ch.book_id === 1 && ch.type !== "jamo")
		.sort((a, b) => a.seq - b.seq);
	return (
		<>
			<div className="catalog-nav">
				<BookTabs tabs={buildBookTabs(t)} activeId={1} onSelect={() => {}} />
				<ChapterChips
					chips={buildChapterChips(book1, t)}
					activeId={book1[2].id}
					onSelect={() => {}}
				/>
			</div>
			<div className="scroll catalog-scroll">
				<ChapterHead seq={6} title="가족" />
				<ModuleList
					sections={ACT_SECTIONS.map((sec) => ({
						label: t(sec.labelKey),
						modules: sec.actIds.map((id) => ({
							id,
							title: actLabel(t, id),
							state: NAV_ACT_STATE[id],
							...(id === "roleplay" ? { reviewCount: 2 } : {}),
						})),
					}))}
					onModuleClick={() => {}}
				/>
			</div>
		</>
	);
}

SCREENS.nav__book__resume = <NavBookScreen />;

/*
 * 자모 목록 — 컴포넌트를 그대로 그린다. 받아 오는 데이터가 없고 useEffect 도
 * 없어서 라우터 훅이 경고만 내고 지나간다.
 *
 * 목업은 2026-08-21 에 새 책 기준으로 갱신하고 다시 캡처했다 — 그전에는
 * 활동 이름이 "자모 듣고 따라하기 · 자모 쓰기" 이고 묶음명이 "모음 1" 이었다.
 */
SCREENS.nav__jamo__resume = <Jamo />;

/*
 * 홈 셋 — 목업 nav__home__{none,resume,review} 과 대조한다.
 *
 * 표시만 하는 HomeView 를 쓴다(index.tsx 는 받아 오는 쪽이라 정적으로 그리면
 * 스피너만 나온다). 값은 목업의 표본을 그대로 넘긴다 — 서버가 주는 것이라
 * 앱이 만들어 낼 수 있는 값이 아니다.
 *
 * 오늘 할 일 자리는 세 갈래가 나눠 쓴다. review 는 아직 index.tsx 가 넘기지
 * 않지만(GET /review-queue 가 없다) 목업과 i18n 이 이미 정해 둔 갈래라
 * 표시 쪽은 여기서 대조해 둔다.
 */
const HOME_BASE = {
	userName: "수현",
	attendance: {
		weekDays: [true, true, true, false, false, false, false],
		todayIndex: 3,
		streak: 3,
	},
	learningStatus: {
		chapterCompleted: 4,
		chapterTotal: 12,
		chapterLabel: "1급 학습 중",
		todayActivities: 4,
		weeklyActivities: 14,
	},
	/** 단위는 분(分)이다 — 활동 건수가 아니다. 목업의 D.chart 와 같은 값 */
	weeklyChart: { data: [18, 32, 14, 25, 0, 0, 0] },
	onContinue: () => {},
	onStartLearning: () => {},
};

const HOME_RESUME = {
	bookId: 1,
	bookLabel: "1급",
	chapterSeq: 6,
	chapterLabel: "6과",
	menuType: "listen-answer",
	moduleLabel: "듣고 질문에 답하기 3/5",
	route: "/learn/listen",
	routeParams: {},
};

SCREENS.nav__home__none = <HomeView {...HOME_BASE} continueLearning={null} />;
SCREENS.nav__home__resume = (
	<HomeView {...HOME_BASE} continueLearning={HOME_RESUME} />
);
SCREENS.nav__home__review = (
	<HomeView {...HOME_BASE} continueLearning={HOME_RESUME} reviewCount={7} />
);

/*
 * 게임 — 시작 화면만 들어간다.
 *
 * 게임 다섯은 export 가 하나뿐인 통짜이고 useState 가 8~27개다. 활동 화면처럼
 * 표시와 상태가 갈라져 있지 않아서, 정적으로 그리면 **첫 화면밖에 나오지 않는다.**
 * VocaShot 은 첫 화면이 곧 시작 화면이라 대조에 들어갈 수 있다.
 * 나머지 19개 캡처(플레이·결과·레벨 선택 …)는 그 게임을 HomeView 처럼
 * 표시/상태로 가른 뒤에야 들어온다 — ../BLOCKERS.md §3-b.
 */
SCREENS.vocashot__start = <VocashotSolo />;

/*
 * 플레이·결과는 VocaShot 의 내부 상태다. vocashot-solo 를 표시/상태로 가르면서
 * 이 둘이 대조에 들어왔다 — 값은 목업 캡처가 잡아 둔 그 상태 그대로 넘긴다.
 */
SCREENS.vocashot__play = (
	<VocashotPlayView
		level={2}
		mode="easy"
		lang="en"
		hearts={5}
		heartsMax={5}
		score={0}
		meteor={{
			meaning: "well",
			dur: 7.8,
			choices: ["의사", "잘", "한국말", "운동선수"],
		}}
		feedback={null}
		typed=""
		onTyped={() => {}}
		onResolve={() => {}}
	/>
);
/*
 * 직접 입력 모드 — 목업 캡처(vocashot__play_type)가 잡아 둔 상태 그대로.
 * 4개 중 고르기만 캡처돼 있어서 이 갈래는 **한 번도 견줘진 적이 없었다** —
 * 그래서 `.typed` 라는 없는 이름이 오래 남아 있었다(BLOCKERS).
 */
SCREENS.vocashot__play_type = (
	<VocashotPlayView
		level={2}
		mode="hard"
		lang="en"
		hearts={5}
		heartsMax={5}
		score={0}
		meteor={{ meaning: "to bloom (flowers)", dur: 10, choices: [] }}
		feedback={null}
		typed=""
		onTyped={() => {}}
		onResolve={() => {}}
	/>
);

/*
 * 결과 — **신기록이고 놓친 단어가 있는** 상태. 목업 캡처(vocashot__result_best).
 * 기존 캡처는 0점·놓친 단어 없음이라 `.r-new` 와 `.r-row` 를 못 견줬다.
 */
SCREENS.vocashot__result_best = (
	<VocashotResultView
		level={2}
		mode="easy"
		best={10}
		isBest={true}
		score={10}
		correct={2}
		asked={7}
		hearts={0}
		missed={[
			{ w: "의사", m: "doctor", got: true },
			{ w: "춤", m: "dance", got: false },
			{ w: "세일", m: "sale, discount", got: false },
		]}
		onAgain={() => {}}
		onExit={() => {}}
	/>
);

SCREENS.vocashot__result = (
	<VocashotResultView
		level={2}
		mode="easy"
		best={0}
		// 목업 캡처는 0점·최고 0 이라 신기록이 아니다("최고 점수 0" 이 보인다)
		isBest={false}
		score={0}
		correct={0}
		asked={1}
		hearts={5}
		missed={[]}
		onAgain={() => {}}
		onExit={() => {}}
	/>
);

/*
 * 조사 스나이퍼 결과 — 값은 목업 캡처(game__ps_result)가 잡아 둔 상태 그대로.
 * 게임 캡처는 <div id="app"> 껍데기가 한 겹 붙어 있고 비교기가 벗긴다.
 */
/* 조사 스나이퍼 급 선택 — levelMeta 는 서버에서 오므로 캡처가 잡아 둔 값을 넘긴다 */
SCREENS.game__ps_level = (
	<ParticleSniperLevelView
		levelMeta={fromData("particle_sniper.level_meta", {
			"1급": {
				color: "#4ade80",
				summary: "은/는 · 이/가 · 을/를 · 에 · 에서 · 하고 · 과/와 · 에게…",
			},
			"2급": { color: "#60a5fa", summary: "(으)로 · 의 · 보다 · 만" },
			"3급": { color: "#c084fc", summary: "한테서 · 밖에 · 이나/나 · 처럼" },
			"4급": { color: "#fb923c", summary: "에다가 · 이든지/든지 · 만큼" },
			"5급": { color: "#f472b6", summary: "에 비해서 · 께" },
			"6급": { color: "#a78bfa", summary: "랑/이랑 · 이라든가/라든가" },
			"7급": { color: "#22d3ee", summary: "고급 조사 연습" },
			"8급": { color: "#facc15", summary: "심화 조사 연습" },
		})}
		onPick={() => {}}
		onBack={() => {}}
	/>
);

/*
 * 조사 스나이퍼 과 선택 — 값은 어드민 실측(games_spec_v1 §4·부표, 1급 레슨 32행 중 1급분) 그대로.
 * 과별 문항수 4·16·20·20·20·20·20·20·20 은 그 과까지의 "누적" 이 아니라 각 과 자체의 실측 문항수이고,
 * 화면 카드 숫자는 코드가 min(maxPerGame, 누적) 으로 다시 계산한다 — 여기 questions 배열 길이가 그 재료다.
 */
SCREENS.game__ps_lesson = (
	<ParticleSniperLessonView
		level="1급"
		meta={{
			color: "#4ade80",
			summary: "은/는 · 이/가 · 을/를 · 에 · 에서 · 하고 · 과/와 · 에게…",
		}}
		lessons={fromData("particle_sniper.lesson", {
			"4과": { new_particles: ["은", "는"], questions: new Array(8).fill({}) },
			"6과": { new_particles: ["이", "가"], questions: new Array(8).fill({}) },
			"7과": { new_particles: ["에", "도"], questions: new Array(4).fill({}) },
			"8과": { new_particles: ["을", "를"], questions: new Array(4).fill({}) },
			"11과": { new_particles: ["하고"], questions: new Array(8).fill({}) },
			"12과": {
				new_particles: ["부터", "까지"],
				questions: new Array(8).fill({}),
			},
			"13과": { new_particles: ["에서"], questions: new Array(8).fill({}) },
			"14과": { new_particles: ["과", "와"], questions: new Array(8).fill({}) },
			"15과": { new_particles: ["에게"], questions: new Array(8).fill({}) },
		})}
		maxPerGame={20}
		onPick={() => {}}
		onBack={() => {}}
	/>
);

/* 조사 스나이퍼 플레이 — 값은 목업 캡처(game__ps_play)가 잡아 둔 상태 그대로. */
SCREENS.game__ps_play = (
	<ParticleSniperPlayView
		question={fromData("particle_sniper.question", {
			// 목업은 문장에 ___ 를 쓰지만 **실제 데이터는 blank 의 [?]** 다.
			// 화면이 쓰는 것은 blank 이므로 여기도 그것으로 준다 — 그려지는 결과는
			// 목업과 같다(앞 "저는 한국어" · 빈칸 · 뒤 " 공부해요").
			sentence: "저는 한국어를 공부해요",
			blank: "저는 한국어[?] 공부해요",
			answer: "를",
			choices: ["을", "를", "이", "가"],
			sourceLesson: "8과",
		})}
		questionIndex={3}
		totalQuestions={20}
		hp={3}
		combo={5}
		score={1180}
		timerProgress={62}
		picked={null}
		shotResult={null}
		onAnswer={() => {}}
		onBack={() => {}}
	/>
);

SCREENS.game__ps_result = (
	<ParticleSniperResultView
		level="1급"
		lesson="13과"
		score={1860}
		best={2480}
		correct={17}
		answered={20}
		maxCombo={4}
		mistakes={[
			{
				sentence: "친구___ 같이 영화를 봤어요.",
				userAnswer: "와",
				correct: "하고",
			},
			{ sentence: "학교___ 버스로 가요.", userAnswer: "에서", correct: "에" },
			{ sentence: "책상___ 책이 있어요.", userAnswer: "이", correct: "에" },
		]}
		onRetry={() => {}}
		onLesson={() => {}}
		onLevel={() => {}}
	/>
);

/*
 * 어휘 카드 마스터 — 값은 목업 캡처(game__cs_*)가 잡아 둔 상태 그대로.
 * 카테고리 색은 currentCard.isRare 홀로그램 그라디언트에도 쓰는 4색
 * (#4A9EFF·#FF9E4A·#FF4AEC·#B44AFF)과 같다 — 캡처의 rgb 값을 hex 로 되돌린 것.
 */
const CS_CATEGORY_COLORS: Record<string, string> = {
	직업: "#4A9EFF",
	교통수단: "#FF9E4A",
	위치: "#FF4AEC",
	날씨: "#B44AFF",
};

/*
 * 레벨 선택 목업(game__cs_level)은 2급·5과까지 선택된 상태를 캡처했고,
 * 1~15과 버튼 전부에 "새 카테고리 있음" 점이 찍혀 있다 — 그래서 15개 과 전부
 * new_categories 를 채운다. 미리보기(4개)에 실제로 뜨는 것은 1~4과가 내는
 * 직업·교통수단·위치·날씨뿐이고, 5과 이후는 단어 목록 없이 점만 찍히게 한다
 * (getCumulativeCategories 가 4단어 미만은 걸러낸다).
 */
const csDummyLesson = { new_categories: ["더미"] };
SCREENS.game__cs_level = (
	<CardSortLevelView
		vocab={{
			"2급": {
				"1과": {
					new_categories: ["직업"],
					직업: ["의사", "선생님", "경찰", "요리사"],
				},
				"2과": {
					new_categories: ["교통수단"],
					교통수단: ["버스", "지하철", "택시", "자전거"],
				},
				"3과": { new_categories: ["위치"], 위치: ["위", "아래", "앞", "뒤"] },
				"4과": { new_categories: ["날씨"], 날씨: ["비", "눈", "바람", "구름"] },
				"5과": csDummyLesson,
				"6과": csDummyLesson,
				"7과": csDummyLesson,
				"8과": csDummyLesson,
				"9과": csDummyLesson,
				"10과": csDummyLesson,
				"11과": csDummyLesson,
				"12과": csDummyLesson,
				"13과": csDummyLesson,
				"14과": csDummyLesson,
				"15과": csDummyLesson,
			},
		}}
		categoryColors={CS_CATEGORY_COLORS}
		selectedGrade="2급"
		selectedLesson={5}
		onGradeSelect={() => {}}
		onLessonSelect={() => {}}
		onStart={() => {}}
		onBack={() => {}}
	/>
);

/* 어휘 카드 마스터 인트로 — 값은 목업 캡처(game__cs_intro)가 잡아 둔 상태 그대로. */
SCREENS.game__cs_intro = (
	<CardSortIntroView
		activeCategories={["직업", "교통수단", "위치", "날씨"]}
		categoryColors={CS_CATEGORY_COLORS}
		introCountdown={2}
	/>
);

/* 어휘 카드 마스터 플레이 — 값은 목업 캡처(game__cs_play)가 잡아 둔 상태 그대로. */
SCREENS.game__cs_play = (
	<CardSortPlayView
		categoryColors={CS_CATEGORY_COLORS}
		activeCategories={["직업", "교통수단", "위치", "날씨"]}
		currentCard={fromData("card_sort.card", {
			word: "아래",
			category: "위치",
			grade: "2급",
			lesson: "3과",
			isRare: false,
		})}
		cardIndex={0}
		deckLength={32}
		timeLeft={60}
		hp={5}
		combo={0}
		score={0}
		scorePopup={null}
		cardShake={false}
		cardDismiss={false}
		slotFlash={null}
		activeSlot={null}
		onSlotDown={() => {}}
		onSlotUp={() => {}}
		onSlotLeave={() => {}}
		onAnswer={() => {}}
		onFinish={() => {}}
		onBack={() => {}}
	/>
);

/* 어휘 카드 마스터 결과 — 값은 목업 캡처(game__cs_result)가 잡아 둔 상태 그대로. */
SCREENS.game__cs_result = (
	<CardSortResultView
		selectedGrade="2급"
		selectedLesson={4}
		stats={{
			score: 150,
			correct: 1,
			total: 6,
			maxCombo: 1,
			rareCorrect: 0,
			rareTotal: 0,
		}}
		bestScore={2140}
		onRetry={() => {}}
		onLevelSelect={() => {}}
		onExit={() => {}}
	/>
);

/* 봄소풍 제목 — 지난 미션 기록이 없는 첫 방문 상태(목업 캡처 game__pc_title 그대로) */
SCREENS.game__pc_title = (
	<PcTitleView lastPlay={null} onStart={() => {}} onBack={() => {}} />
);

/*
 * 봄소풍 미션 선택 — 값은 목업 캡처(game__pc_select)가 잡아 둔 상태 그대로.
 * 친구 넷 다 아직 아무 것도 완료하지 않은 상태(played={})다.
 */
SCREENS.game__pc_select = (
	<PcSelectView
		friends={[
			{
				id: "sol",
				face: "🐰",
				name: "솔이",
				bg: "#AFA9EC",
				cats: ["age", "price"],
				mission: "나이 · 가격",
				desc: "~살, ~원 읽기",
				desc2: "~살, ~원 읽기",
			},
			{
				id: "gomdol",
				face: "🐻",
				name: "곰돌",
				bg: "#F0997B",
				cats: ["time", "date"],
				mission: "시간 · 날짜",
				desc: "~시, ~분, 월/일",
				desc2: "~시, ~분, 월/일",
			},
			{
				id: "ppiyak",
				face: "🐥",
				name: "삐약",
				bg: "#F4C0D1",
				cats: ["address", "phone"],
				mission: "주소 · 전화",
				desc: "동·호수 읽기",
				desc2: "동·호수 읽기",
			},
			{
				id: "nyang",
				face: "🐱",
				name: "냥이",
				bg: "#9FE1CB",
				cats: ["unit"],
				mission: "단위",
				desc: "개/마리/권, 낮은 숫자",
				desc2: "개/마리/권, 낮은 숫자",
			},
		]}
		played={{}}
		onStart={() => {}}
		onBack={() => {}}
	/>
);

/*
 * 봄소풍 플레이 — 값은 목업 캡처(game__pc_game)가 잡아 둔 상태 그대로(1문항째,
 * 미답변, 점수 0). curLang="en" 이라 힌트가 "How old?" 로 뜬다.
 */
SCREENS.game__pc_game = (
	<PcGameView
		game={{
			// 값은 spring_picnic_friends.json 의 somi 레코드 그대로다.
			// 전에는 id·cats·desc2 를 내가 지어냈다 — 화면에 안 그려지는 필드라
			// 목업 대조는 통과했다(fixture-data-check.py 가 잡았다).
			friend: fromData("spring_picnic.friend", {
				id: "somi",
				face: "🐰",
				name: "솔이",
				bg: "#AFA9EC",
				cats: ["나이", "가격"],
				mission: "나이 · 가격",
				desc: "~살, ~원 읽기",
				desc2: "~세/년생, 큰 금액",
			}),
			level: 1,
			// 나머지 아홉은 g-dots 진행 점만 그린다 — 내용은 안 읽으므로 빈 자리표다
			rounds: [
				// 값은 spring_picnic_questions.json 의 age02 레코드 그대로다.
				// 목업이 그리는 19살·"오빠는 ___ 살이에요."·열아홉 이 그 레코드다.
				// 칩 차례는 이 wrong 이 아니라 아래 choices 가 정한다(컨테이너가 섞는다).
				fromData("spring_picnic.round", {
					id: "age02",
					cat: "나이",
					level: 1,
					il: "🎂",
					hint: {
						ko: "몇 살이에요?",
						en: "How old?",
						zh: "多少岁？",
						ja: "何歳ですか？",
						vi: "Bao nhiêu tuổi?",
					},
					num: "19살",
					tmpl: "오빠는 ___ 살이에요.",
					tts: "오빠는 열아홉 살이에요.",
					correct: "열아홉",
					wrong: ["십구", "스물"],
				}),
				...(new Array(9).fill({}) as unknown as PcQuestion[]),
			],
			cur: 0,
			score: 0,
			answered: false,
			totalR: 10,
			wQueue: [],
			wSet: new Set(),
			w2: new Set(),
			choices: ["열아홉", "스물", "십구"],
			chosenAnswer: null,
			retrying: false,
		}}
		curLang="en"
		onChoose={() => {}}
		onNext={() => {}}
		onShowResult={() => {}}
		onExit={() => {}}
	/>
);

/*
 * 봄소풍 결과 — 값은 목업 캡처(game__pc_result)가 잡아 둔 상태 그대로.
 * pc_result 는 다른 게임 결과(ps_result·cs_result)처럼 마크업을 통째로 다시
 * 짰다 — 옛 r-* 클래스는 game.css 의 pc-result-* 24줄과 안 겹쳐서 죽어 있었다
 * (BLOCKERS.md "그리고 둘은 CSS 가 죽어 있다"). 통계 세 자리(첫 시도 정답 ·
 * 끝까지 맞힘 · 점수 정답률)의 실제 값 관계는 spring-picnic-view.tsx 의
 * PcResultView 주석에 적어 뒀다 — 집계 로직 자체는 고치지 않았다.
 */
SCREENS.game__pc_result = (
	<PcResultView
		game={{
			friend: {
				id: "nyang",
				face: "🐱",
				name: "냥이",
				bg: "#9FE1CB",
				cats: ["unit"],
				mission: "단위",
				desc: "",
				desc2: "",
			},
			level: 2,
			rounds: [],
			cur: 0,
			score: 4,
			answered: true,
			totalR: 6,
			wQueue: [],
			wSet: new Set(["q15", "q32"]),
			w2: new Set(["q32"]),
			choices: [],
			chosenAnswer: null,
			retrying: false,
		}}
		friends={[
			{
				id: "a",
				face: "🐱",
				name: "",
				bg: "",
				cats: [],
				mission: "",
				desc: "",
				desc2: "",
			},
			{
				id: "b",
				face: "🐰",
				name: "",
				bg: "",
				cats: [],
				mission: "",
				desc: "",
				desc2: "",
			},
			{
				id: "c",
				face: "🐻",
				name: "",
				bg: "",
				cats: [],
				mission: "",
				desc: "",
				desc2: "",
			},
		]}
		questions={[
			{
				id: "q15",
				cat: "unit",
				level: 2,
				il: "",
				hint: {},
				num: "15",
				tmpl: "책 ___ 권 읽었어요.",
				tts: "",
				correct: "열다섯",
				wrong: [],
			},
			{
				id: "q32",
				cat: "unit",
				level: 2,
				il: "",
				hint: {},
				num: "32",
				tmpl: "학생이 ___ 명 있어요.",
				tts: "",
				correct: "서른두",
				wrong: [],
			},
		]}
		totalPlayed={4}
		onSelectScreen={() => {}}
		onReset={() => {}}
	/>
);

/*
 * 서울 퍼즐 — map · entry · puzzle 세 화면은 목업(game__sp_*)에서 그대로 옮긴
 * ux-seoul(무대) + SpTravelHeader(뒤로가기·XP·"서울 여행") + 화면별 컴포넌트다.
 * seoul-puzzle.tsx 의 return 도 같은 조합을 쓴다 — 여기서만 다시 짠 게 아니다.
 * complete 는 그 셋과 달리 헤더가 없는 독립 화면이라 SpCompleteView 하나로 끝난다.
 *
 * 값은 목업 캡처(game__sp_map·sp_entry·sp_puzzle·sp_complete)를 직접 열어서
 * 읽은 것과 api/seed_data/seoul_puzzles.json 의 "홍대"
 * 항목(고정 표본)을 그대로 옮겼다 — 추측한 숫자·글자는 없다.
 */
function SpFrame({ children }: { children: ReactElement | ReactElement[] }) {
	return (
		<div
			className="ux-seoul"
			style={{
				width: "100%",
				maxWidth: 390,
				height: "100%",
				background: SP_C.bg,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				position: "relative",
				margin: "0px auto",
				fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
			}}
		>
			<style>{SP_KEYFRAMES_CSS}</style>
			<SpTravelHeader totalXp={0} onBack={() => {}} />
			{children}
		</div>
	);
}

/* 서울 퍼즐 지도 — 10 장소 전부(games_spec_v1 §서울 퍼즐 확정 데이터), 새 플레이어(완료 0) */
/*
 * 서울 퍼즐 값은 **씨드에서 그대로 읽는다**. 전에는 손으로 적었고, 그래서
 * 좌표 여덟 곳이 `x:0, y:0` 이고 경복궁 id 가 `gyeongbokgung`(씨드는 `gyeongbok`)
 * 이었다 — 핀 자리는 이름 표(PIN_FULL)가 덮어써서 목업 대조엔 안 보였다.
 * 읽어 오면 지어낼 수가 없다.
 */
const SEOUL = JSON.parse(
	readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"..",
			"api",
			"seed_data",
			"seoul_puzzles.json",
		),
		"utf8",
	),
) as {
	locations: SpLocation[];
	puzzles: Record<string, SpRawPuzzle[]>;
};
const SP_LOCATIONS = SEOUL.locations;

/* 홍대 첫 문제를 playerName "수현"(받침 있음)으로 푼 것 — 화면이 하는 것과 같다 */
const SP_RAW = SEOUL.puzzles.hongdae[0];
const SP_RT = (t: string) => resolveToken(t, "수현");
const SP_PUZZLE = {
	...SP_RAW,
	friendMsg: SP_RT(SP_RAW.friendMsg),
	friendMsg2: SP_RAW.friendMsg2 ? SP_RT(SP_RAW.friendMsg2) : null,
	selfMsg: SP_RAW.selfMsg ? SP_RT(SP_RAW.selfMsg) : null,
	hintText: SP_RT(SP_RAW.hintText),
	answer: SP_RAW.answer.map(SP_RT),
	distractors: SP_RAW.distractors.map(SP_RT),
};

/*
 * 칩은 답 두 조각 + 오답 세 조각을 섞은 것이다. **낱말은 씨드에서 오고**, 차례만
 * 목업 캡처가 잡아 둔 것이다(실제로는 컨테이너가 섞는다).
 * 아래 차례는 [오답3, 답1, 오답1, 오답2, 답2] 이다.
 */
const SP_CHIPS = [
	SP_PUZZLE.distractors[2],
	SP_PUZZLE.answer[0],
	SP_PUZZLE.distractors[0],
	SP_PUZZLE.distractors[1],
	SP_PUZZLE.answer[1],
];

SCREENS.game__sp_map = (
	<SpFrame>
		<SpMapView
			playerName="수현"
			totalXp={0}
			completed={new Set()}
			currentLoc={null}
			locations={SP_LOCATIONS as any}
			navDir="forward"
			onSelectLocation={() => {}}
		/>
	</SpFrame>
);

/* 서울 퍼즐 입장 — 홍대(1번), 아직 시작 전이라 XP 0. entryMessages 는 seoul_puzzles.json "홍대" 그대로 */
const SP_HONGDAE = SP_LOCATIONS[0];

SCREENS.game__sp_entry = (
	<SpFrame>
		<SpEntryView
			loc={SP_HONGDAE as any}
			playerName="수현"
			completed={new Set()}
			currentLoc="hongdae"
			locations={SP_LOCATIONS as any}
			grammars={[
				"이에요/예요",
				"은/는",
				"은/는, 이에요/예요",
				"이/가 아니에요",
			]}
			navDir="forward"
			onMapBack={() => {}}
			onStart={() => {}}
		/>
	</SpFrame>
);

/* 서울 퍼즐 문제 — 홍대 1번째 퍼즐(첫 문제), 아직 답을 놓지 않은 상태.
 * answer·distractors 는 playerName "수현"(받침 있음)으로 이미 풀어 둔 값 —
 * seoul_puzzles.json 의 [이름] 토큰을 resolveToken 이 만드는 값 그대로다. */
SCREENS.game__sp_puzzle = (
	<SpFrame>
		<SpPuzzleView
			loc={SP_HONGDAE as any}
			totalXp={0}
			streak={0}
			puzzleIdx={0}
			totalPuzzles={4}
			resolvedPuzzle={SP_PUZZLE}
			slotWords={[]}
			shuffledChips={SP_CHIPS}
			trayUsed={new Set()}
			answered={null}
			hintsLeft={3}
			grammarOpen={false}
			transVisible={new Set()}
			completed={new Set()}
			currentLoc="hongdae"
			locations={SP_LOCATIONS as any}
			navDir="forward"
			scrollAreaRef={{ current: null }}
			onMapBack={() => {}}
			onToggleGrammar={() => {}}
			onToggleTrans={() => {}}
			onTapTray={() => {}}
			onRemoveSlot={() => {}}
			onUseHint={() => {}}
			onCheckAnswer={() => {}}
			onRetry={() => {}}
			onNext={() => {}}
		/>
	</SpFrame>
);

/* 서울 퍼즐 완료 — 목업(game__sp_complete)의 표본 그대로. 실제 finishLocation()
 * 이 만드는 grammars 는 4종(4문제 각자의 grammar 필드)인데 이 목업은 대표로 2개만
 * 보여 준다 — 손으로 짠 표본이라 완결 로그와는 다르다(games_spec_v1 미언급, 애매
 * 하지 않음: 그냥 목업이 고른 표본 수다). */
SCREENS.game__sp_complete = (
	<SpCompleteView
		completeSnap={{
			locName: "홍대",
			sx: 55,
			sc: 3,
			sh: 1,
			tx: 55,
			puzzleCount: 4,
			grammars: ["이에요/예요", "은/는"],
		}}
		onBackToMap={() => {}}
		onRetry={() => {}}
	/>
);

/*
 * 게임 목록 — 마지막 47번째 화면. 값은 목업 캡처(game__list)가 잡아 둔 그대로.
 * 조사 스나이퍼만 진행이 없어(캡처에 is-progress 가 안 붙었다) 설명이 남는다.
 *
 * 이 자리에 오래 "게임 캡처는 앱 DOM 덤프라 대조에 못 넣는다" 고 적혀 있었다.
 * 세 번 틀린 판단이었다 — 커밋 d1a7cfb 가 답을 갖고 있었다. 캡처 47개는
 * **목업의 빌더 함수를 직접 불러 뜬 것**이고("stop hand-writing markup"),
 * 게임 캡처만 구 배포판 라우트 레이아웃의 껍데기 몇 겹을 끼고 있을 뿐이다.
 * 껍데기는 비교기가 벗긴다(drop_game_wrapper · SCREEN_ROOT).
 * 47 = 활동 22 + 내비 5 + VocaShot 3 + 게임 17 이고, 처음부터 47이 목표였다.
 */
SCREENS.game__list = (
	<GameListView
		progress={{
			vocashot: "2급 최고 210점",
			"spring-picnic": "솔이 · 2단계까지 했어요",
			"seoul-puzzle": "10곳 중 5곳 다녀왔어요",
			"card-sort": "3급 5과 최고 2,140점",
			// particle-sniper 는 넣지 않는다 — 진행이 없으면 설명이 남는 것이 목업이다
		}}
		onOpen={() => {}}
	/>
);

const outDir = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	".parity-out",
);
/*
 * 매번 비우고 다시 쓴다. 화면을 목록에서 빼면 옛 출력이 남아, 대조 쪽은
 * 그 파일을 보고 계속 검사한다 — 실제로 한 번 겪었다.
 */
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await i18n.changeLanguage("ko");
for (const [name, element] of Object.entries(SCREENS)) {
	/*
	 * 제품 컴포넌트를 그대로 그리므로 앱 루트가 씌우는 provider 를 같이 씌운다 —
	 * 소리·토스트·컨페티를 쓰는 컴포넌트가 있어서 없으면 렌더가 죽는다.
	 * 서버 렌더라 effect 는 돌지 않으므로 실제로 소리가 나지는 않는다.
	 */
	const html = renderToStaticMarkup(
		<I18nextProvider i18n={i18n}>
			<SignProvider>
				<AudioProvider>
					<MicPermissionProvider>
						<ToastProvider>
							<ConfettiProvider>
								<LottieEffectProvider>{element}</LottieEffectProvider>
							</ConfettiProvider>
						</ToastProvider>
					</MicPermissionProvider>
				</AudioProvider>
			</SignProvider>
		</I18nextProvider>,
	);
	/*
	 * 프레임은 목업 캡처에 없다 — 캡처는 프레임 안쪽만 담았다.
	 * activity-frame 은 활동 화면, vocashot-frame 은 VocaShot 이 쓴다.
	 *
	 * **`class` 가 첫 속성이어야 한다.** 아래 정규식이 `^<div class=` 로 시작하므로,
	 * 프레임에 속성을 더할 때 `className` 앞에 두면 껍데기가 안 벗겨지고 세 화면이
	 * 통째로 갈린다. VocaShot 에 초점용 `tabIndex` 를 붙이다 실제로 겪었다.
	 * data-screen 처럼 프레임에 붙는 속성도 같이 벗긴다.
	 */
	const inner = html
		/*
		 * 숨은 <audio> 는 화면이 아니다 — 어디에 있든 지운다.
		 * AudioProvider 가 프레임 밖에 하나 달고, AudioRecorder 는 도크 **안에**
		 * 하나 단다. 전에는 맨 끝만 벗겨서 도크 안의 것이 남아 대조에 걸렸다.
		 */
		.replace(/<audio class="hidden"[^>]*><\/audio>/g, "")
		.replace(/^<div class="(?:activity|vocashot)-frame"[^>]*>/, "")
		// 게임은 game-frame 이 프레임이다. 캡처 쪽에서도 같은 층을 벗긴다
		.replace(/^<div class="game-frame[^"]*"[^>]*>/, "")
		.replace(/<\/div>$/, "");
	writeFileSync(join(outDir, `${name}.html`), inner);
}
writeFileSync(
	join(outDir, "_fixtures.json"),
	JSON.stringify(DATA_FIXTURES, null, "\t"),
);
console.log(`${Object.keys(SCREENS).length}개 화면을 ${outDir} 에 그렸다`);
