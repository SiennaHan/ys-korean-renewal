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

import { mkdirSync, writeFileSync } from "node:fs";
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
	ComboResult,
	ListenCopy,
	MouthVideo,
	Passage,
	QuestionText,
	SyllableRow,
	WordFocus,
	WordPicture,
} from "@/components/main/activity/stimulus";
import { WordPreviewList } from "@/components/main/activity/word-preview";
import i18n from "@/i18n";
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
						<ComboResult syllable="가" parts="ㄱ + ㅏ" word="가" />
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
						<ComboResult syllable="산" parts="ㅅ + ㅏ + ㄴ" word="산" />
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

const outDir = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	".parity-out",
);
mkdirSync(outDir, { recursive: true });

await i18n.changeLanguage("ko");
for (const [name, element] of Object.entries(SCREENS)) {
	const html = renderToStaticMarkup(
		<I18nextProvider i18n={i18n}>{element}</I18nextProvider>,
	);
	// 프레임은 목업 캡처에 없다 — 캡처는 프레임 안쪽만 담았다
	const inner = html
		.replace(/^<div class="activity-frame">/, "")
		.replace(/<\/div>$/, "");
	writeFileSync(join(outDir, `${name}.html`), inner);
}
console.log(`${Object.keys(SCREENS).length}개 화면을 ${outDir} 에 그렸다`);
