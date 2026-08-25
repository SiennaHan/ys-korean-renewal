/**
 * 활동 컴포넌트 ↔ 목업 대조.
 *
 * 컴포넌트를 정적 HTML 로 그려 src/mockups/activity__*.html 과 맞춰 본다.
 * 목업 화면은 손으로 짠 것이라 이 대조가 곧 "디자인이 같다"의 증명이 된다.
 * 눈으로 보는 대조는 Storybook 이 하고, 이쪽은 구조가 어긋나면 바로 잡아 준다.
 *
 *   npx tsx scripts/activity-parity.tsx
 */
import "./parity-shim";

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
	JamoSection,
	WriteCanvas,
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
import {
	ParticleSniperLessonView,
	ParticleSniperPlayView,
	ParticleSniperLevelView,
	ParticleSniperResultView,
} from "@/components/main/game/particle-sniper-view";
import {
	SpCompleteView,
	SpEntryView,
	SpMapView,
	SpPuzzleView,
	SpTravelHeader,
} from "@/components/main/game/seoul-puzzle-view";
import { C as SP_C, SP_KEYFRAMES_CSS } from "@/components/main/game/seoul-puzzle";
import {
	PcGameView,
	type PcQuestion,
	PcResultView,
	PcSelectView,
	PcTitleView,
} from "@/components/main/game/spring-picnic-view";
import {
	VocashotPlayView,
	VocashotResultView,
} from "@/components/main/game/vocashot-view";
import { GameListView } from "@/components/main/game/list-view";
import VocashotSolo from "@/components/main/game/vocashot-solo";
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
	body,
	footer,
	feedback,
	noFeedback,
	dockRight,
}: {
	lesson?: string;
	progress?: [number, number];
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
				<ActivityProgress current={progress[0]} total={progress[1]} />
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
	[
		"AI",
		false,
		"어서 오세요. 뭘 도와드릴까요?",
		"Welcome. How can I help you?",
	],
	["나", true, "커피 한 잔 주세요.", "One coffee, please."],
	["AI", false, "따뜻한 걸로 드릴까요?", "Would you like it hot?"],
	["나", true, "네, 따뜻한 걸로 주세요.", "Yes, hot please."],
	["AI", false, "삼천 원입니다.", "That is 3,000 won."],
].map(([who, mine, ko, en]) => ({
	who: who as string,
	mine: mine as boolean,
	ko: ko as string,
	en: en as string,
}));

const SCREENS: Record<string, ReactElement> = {
	grammar: (
		<Screen
			progress={[1, 5]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrGrammar")}>
						<div className="blank-card">
							오늘 날씨가 <u>　</u> 밖에 나가고 싶어요.
						</div>
					</ProblemCard>
					<ChipWrap>
						{["좋아서", "좋지만", "좋으면", "좋아도"].map((x) => (
							<ChipOption key={x} value={x}>
								{x}
							</ChipOption>
						))}
					</ChipWrap>
				</>
			}
			footer={NEXT}
		/>
	),

	wordQuiz: (
		<Screen
			progress={[0, 4]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrWordQuiz")}>
						<div className="word-focus">
							<strong>사과</strong>
							<button
								type="button"
								className="sound-icon"
								data-action="audio"
								aria-label="발음 듣기"
							>
								<IconVolumeInline />
							</button>
						</div>
					</ProblemCard>
					<ChoiceList>
						{["apple", "grape", "peach", "pear"].map((x, i) => (
							<Choice key={x} index={i}>
								{x}
							</Choice>
						))}
					</ChoiceList>
				</>
			}
			footer={NEXT}
		/>
	),

	listen: (
		<Screen
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrListen")}>
						<div className="listen-copy">
							<small>들은 문장</small>
							<p className="statement">여자 이름은 영주예요.</p>
						</div>
						<div className="listen-stimulus">
							<AudioRow label="문장 다시 듣기" sub="오디오" />
						</div>
					</ProblemCard>
					<ChoiceList variant="binary">
						<Choice index={0} sub="내용이 달라요">
							X
						</Choice>
						<Choice index={1} sub="내용이 같아요">
							O
						</Choice>
					</ChoiceList>
				</>
			}
			footer={NEXT}
		/>
	),

	jamoListen: (
		<Screen
			lesson="1급 1과"
			progress={[0, 4]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrJamoListen")}>
						<AudioRow label="발음 듣기" sub="자모 음성" />
					</ProblemCard>
					<ChoiceList variant="jamo">
						{["어", "오"].map((x, i) => (
							<Choice key={x} index={i}>
								{x}
							</Choice>
						))}
					</ChoiceList>
				</>
			}
			footer={NEXT}
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
		<Screen
			lesson="1급 6과"
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrReading")}>
						<Passage>
							{`저는 마이클입니다. 미국 사람이에요.
지금 한국에서 한국어를 배웁니다.
학교는 신촌에 있어요. 매일 아침 아홉 시에 갑니다.`}
						</Passage>
					</ProblemCard>
					<div className="response-area">
						<QuestionText>마이클은 어디에서 한국어를 배웁니까?</QuestionText>
						<ChoiceList inResponseArea={false}>
							{["미국", "신촌", "도쿄", "부산"].map((x, i) => (
								<Choice key={x} index={i} action="rpick">
									{x}
								</Choice>
							))}
						</ChoiceList>
					</div>
				</>
			}
			footer={NEXT}
		/>
	),

	wordPreview: (
		<Screen
			progress={[0, 1]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrWordPreview")} />
					<WordPreviewList
						words={[
							{ word: "안녕하다", meaning: "to be well / hello" },
							{ word: "네", meaning: "yes" },
							{ word: "제", meaning: "my" },
							{ word: "이름", meaning: "name" },
							{ word: "저", meaning: "I (formal)" },
							{ word: "반갑다", meaning: "to be glad to meet" },
						]}
					/>
				</>
			}
			footer={<PrimaryButton label={T("activity.toQuiz")} on action="toQuiz" />}
		/>
	),

	write: (
		<Screen
			lesson="1급 1과"
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrWriteSelect")}>
						<AudioRow
							label={T("player.playAudio")}
							sub={T("activity.audioSub")}
						/>
						<ComboTarget syllable="가" parts="ㄱ + ㅏ" onHint={() => {}} />
					</ProblemCard>
					<JamoSection
						step={1}
						slot="consonant"
						options={CONSONANTS}
						picked="ㄱ"
					/>
					<JamoSection step={2} slot="vowel" options={VOWELS} picked="ㅏ" />
				</>
			}
			footer={<PrimaryButton label={T("player.confirm")} on action="toWrite" />}
		/>
	),

	write3: (
		<Screen
			lesson="1급 1과"
			progress={[0, 1]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrWriteSelect")}>
						<AudioRow
							label={T("player.playAudio")}
							sub={T("activity.audioSub")}
						/>
						<ComboTarget syllable="산" parts="ㅅ + ㅏ + ㄴ" onHint={() => {}} />
					</ProblemCard>
					<JamoSection
						step={1}
						slot="consonant"
						options={CONSONANTS}
						picked="ㅅ"
					/>
					<JamoSection step={2} slot="vowel" options={VOWELS} picked="ㅏ" />
					<JamoSection step={3} slot="final" options={FINALS} picked="ㄴ" />
				</>
			}
			footer={<PrimaryButton label={T("player.confirm")} on action="toWrite" />}
		/>
	),

	write_canvas: (
		<Screen
			lesson="1급 1과"
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrWriteTrace")} />
					<WriteCanvas guide="../handwriting/가.png" />
				</>
			}
			footer={<PrimaryButton label={T("player.confirm")} on={false} />}
		/>
	),

	write3_canvas: (
		<Screen
			lesson="1급 1과"
			progress={[0, 1]}
			body={
				<>
					<ProblemCard instruction={T("activity.instrWriteTrace")} />
					<WriteCanvas guide="../handwriting/산.png" />
				</>
			}
			footer={<PrimaryButton label={T("player.confirm")} on={false} />}
		/>
	),

	speak: (
		<Screen
			lesson="1급 1과"
			progress={[2, 6]}
			noFeedback
			body={
				<>
					<ProblemCard
						instruction={T("activity.instrSpeak")}
						stimulusStyle={{ gap: 16 }}
					>
						<MouthVideo>입모양 영상</MouthVideo>
						<AudioPair source="어" mine="" />
					</ProblemCard>
					<PracticeBrowser tabs={TABS} current="1">
						<WordCards
							words={JAMO_WORDS}
							current="어"
							done={(w) => JAMO_WORDS.indexOf(w) < 3}
						/>
					</PracticeBrowser>
				</>
			}
			dockRight={{ enabled: false }}
			footer={<RecordControl mode="idle" action="srec" />}
		/>
	),

	wordrep: (
		<Screen
			lesson="1급 1과"
			progress={[0, 6]}
			noFeedback
			body={
				<>
					<ProblemCard
						instruction={T("activity.instrWordRep")}
						stimulusStyle={{ gap: 20 }}
					>
						<WordPicture word="어머니" image={FAMILY[0].image} />
						<AudioPair source="어머니" mine="" />
					</ProblemCard>
					<PracticeBrowser tabs={TABS} current="1">
						<ThumbWordCards cards={FAMILY} current="어머니" />
					</PracticeBrowser>
				</>
			}
			dockRight={{ enabled: false }}
			footer={<RecordControl mode="idle" action="srec" />}
		/>
	),

	readwrite: (
		<Screen
			lesson="1급 1과"
			progress={[1, 6]}
			noFeedback
			body={
				<>
					<ProblemCard
						instruction={T("activity.instrReadWrite")}
						stimulusStyle={{ gap: 20 }}
					>
						<WordPicture word="바지" image={THINGS[0].image} small />
						<AudioBar label="바지" />
						<SyllableRow syllables={["바", "지"]} />
					</ProblemCard>
					<PracticeBrowser tabs={TABS} current="1">
						<ThumbWordCards cards={THINGS} current="바지" />
					</PracticeBrowser>
				</>
			}
			footer={NEXT}
		/>
	),

	flash: (
		<FlashcardScreen
			lesson={LESSON}
			index={0}
			total={3}
			card={{ word: "사과", meaning: "apple", kind: "명사" }}
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
		<RoleplayScreen
			lesson={LESSON}
			turns={ROLE_TURNS}
			current={1}
			direction="ai"
			recordMode="idle"
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
			aria-hidden="true"
		>
			<path d="M4 9v6h4l5 4V5L8 9H4zM17 9a4 4 0 010 6" />
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
	weeklyChart: { data: [3, 5, 2, 4, 0, 0, 0] },
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
SCREENS.vocashot__result = (
	<VocashotResultView
		level={2}
		mode="easy"
		best={0}
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
		levelMeta={{
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
		}}
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
		meta={{ color: "#4ade80", summary: "은/는 · 이/가 · 을/를 · 에 · 에서 · 하고 · 과/와 · 에게…" }}
		lessons={{
		"4과": { new_particles: ["은", "는"], questions: new Array(8).fill({}) },
		"6과": { new_particles: ["이", "가"], questions: new Array(8).fill({}) },
		"7과": { new_particles: ["에", "도"], questions: new Array(4).fill({}) },
		"8과": { new_particles: ["을", "를"], questions: new Array(4).fill({}) },
		"11과": { new_particles: ["하고"], questions: new Array(8).fill({}) },
		"12과": { new_particles: ["부터", "까지"], questions: new Array(8).fill({}) },
		"13과": { new_particles: ["에서"], questions: new Array(8).fill({}) },
		"14과": { new_particles: ["과", "와"], questions: new Array(8).fill({}) },
		"15과": { new_particles: ["에게"], questions: new Array(8).fill({}) },
		}}
		maxPerGame={20}
		onPick={() => {}}
		onBack={() => {}}
	/>
);

/* 조사 스나이퍼 플레이 — 값은 목업 캡처(game__ps_play)가 잡아 둔 상태 그대로. */
SCREENS.game__ps_play = (
	<ParticleSniperPlayView
		question={{
			sentence: "저는 한국어___공부해요",
			answer: "를",
			choices: ["을", "를", "이", "가"],
			sourceLesson: "8과",
		}}
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
				"1과": { new_categories: ["직업"], 직업: ["의사", "선생님", "경찰", "요리사"] },
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
		currentCard={{
			word: "아래",
			category: "위치",
			grade: "2급",
			lesson: "3과",
			isRare: false,
		}}
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
			friend: {
				id: "sol",
				face: "🐰",
				name: "솔이",
				bg: "#AFA9EC",
				cats: ["age", "price"],
				mission: "나이 · 가격",
				desc: "",
				desc2: "",
			},
			level: 1,
			// 나머지 아홉은 g-dots 진행 점만 그린다 — 내용은 안 읽으므로 빈 자리표다
			rounds: [
				{
					id: "q-age-19",
					cat: "age",
					level: 1,
					il: "🎂",
					hint: { en: "How old?" },
					num: "19살",
					tmpl: "오빠는 ___ 살이에요.",
					tts: "오빠는 열아홉 살이에요.",
					correct: "열아홉",
					wrong: ["스물", "십구"],
				},
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
 * 읽은 것과 src/components/main/game/data/seoul_puzzles.json 의 "홍대"
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
const SP_LOCATIONS = [
	{ id: "hongdae", name: "홍대", num: 1, x: 119, y: 97, unit: "4–5과", desc: "카페·음료 주문", grammar: ["이에요/예요", "은/는"], entryMessages: [] },
	{ id: "myeongdong", name: "명동", num: 2, x: 181, y: 92, unit: "5–6과", desc: "쇼핑·물건 고르기", grammar: ["이/가 아니에요", "이/그/저"], entryMessages: [] },
	{ id: "gyeongbokgung", name: "경복궁", num: 3, x: 0, y: 0, unit: "7과", desc: "한복 대여·위치 확인", grammar: ["에 있어요", "도"], entryMessages: [] },
	{ id: "hangang", name: "한강공원", num: 4, x: 0, y: 0, unit: "8과", desc: "치킨·자리 잡기", grammar: ["아요/어요/여요", "을/를"], entryMessages: [] },
	{ id: "gwangjang", name: "광장시장", num: 5, x: 0, y: 0, unit: "9과", desc: "음식 고르기", grammar: ["-지 않다", "ㅂ동사"], entryMessages: [] },
	{ id: "seongsu", name: "성수동", num: 6, x: 0, y: 0, unit: "10–11과", desc: "식당 주문", grammar: ["-을까요?", "하고"], entryMessages: [] },
	{ id: "museum", name: "국립중앙박물관", num: 7, x: 0, y: 0, unit: "11–12과", desc: "전시 관람", grammar: ["-으세요", "부터 까지"], entryMessages: [] },
	{ id: "bukchon", name: "북촌한옥마을", num: 8, x: 0, y: 0, unit: "13–14과", desc: "길 묻기", grammar: ["-고 싶다", "에서"], entryMessages: [] },
	{ id: "ddp", name: "DDP", num: 9, x: 0, y: 0, unit: "14–15과", desc: "야경·쇼핑", grammar: ["과/와", "에2"], entryMessages: [] },
	{ id: "bukhansan", name: "북한산", num: 10, x: 0, y: 0, unit: "15과", desc: "등산 대화", grammar: ["에게"], entryMessages: [] },
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
const SP_HONGDAE = {
	...SP_LOCATIONS[0],
	entryMessages: [
		{ type: "friend", text: "안녕하세요! 저는 김연세예요. 😊" },
		{ type: "self", text: "안녕하세요! 저는 [이름]이에요." },
		{ type: "friend", text: "반가워요! 같이 카페 가요!" },
	],
};

SCREENS.game__sp_entry = (
	<SpFrame>
		<SpEntryView
			loc={SP_HONGDAE as any}
			playerName="수현"
			completed={new Set()}
			currentLoc="hongdae"
			locations={SP_LOCATIONS as any}
			grammars={["이에요/예요", "은/는", "은/는, 이에요/예요", "이/가 아니에요"]}
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
			resolvedPuzzle={{
				friendMsg: "안녕하세요! 저는 김연세예요. 😊",
				friendMsgT: "Hello! I'm Kim Yonsei. 😊",
				selfMsg: null,
				selfMsgT: null,
				friendMsg2: "이름이 뭐예요?",
				friendMsg2T: "What is your name?",
				hintText: "처음 만난 자리에서 이름을 소개하는 상황이에요",
				answer: ["저는", "수현이에요."],
				distractors: ["저가", "수현예요.", "이름이에요."],
				grammar: "이에요/예요",
				tip: "<strong>저는 N이에요/예요</strong><br>자음 끝: 학생<strong>이에요</strong><br>모음 끝: 유리<strong>예요</strong>",
			}}
			slotWords={[]}
			shuffledChips={["이름이에요.", "저는", "저가", "수현예요.", "수현이에요."]}
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
	const html = renderToStaticMarkup(
		<I18nextProvider i18n={i18n}>{element}</I18nextProvider>,
	);
	/*
	 * 프레임은 목업 캡처에 없다 — 캡처는 프레임 안쪽만 담았다.
	 * activity-frame 은 활동 화면, vocashot-frame 은 VocaShot 이 쓴다.
	 * data-screen 처럼 프레임에 붙는 속성도 같이 벗긴다.
	 */
	const inner = html
		.replace(/^<div class="(?:activity|vocashot)-frame"[^>]*>/, "")
		// 게임은 game-frame 이 프레임이다. 캡처 쪽에서도 같은 층을 벗긴다
		.replace(/^<div class="game-frame[^"]*"[^>]*>/, "")
		.replace(/<\/div>$/, "");
	writeFileSync(join(outDir, `${name}.html`), inner);
}
console.log(`${Object.keys(SCREENS).length}개 화면을 ${outDir} 에 그렸다`);
