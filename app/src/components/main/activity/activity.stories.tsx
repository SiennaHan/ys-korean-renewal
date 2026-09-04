import {
	AlertUserMsgBox,
	BotMsgBox,
	BotMsgProgress,
	CompletedMsgBox,
	TipUserMsgBox,
	UserMsgBox,
} from "@/components/chat/chat-text";
import { DialogInput } from "@/components/dialog/dialog-input";
import type { Meta, StoryObj } from "@storybook/react";
import type { ReactElement } from "react";
import { AudioRow } from "./audio";
import { BriefingScreen } from "./briefing-screen";
import { ChatScreen } from "./chat";
import { ChipOption, ChipWrap, Choice, ChoiceList } from "./choice";
import { FeedbackMessage } from "./feedback";
import { FlashcardScreen } from "./flashcard";
import { IconVolume } from "./icons";
import { JamoSection, WriteCanvas } from "./jamo-write";
import { PracticeBrowser, ThumbWordCards, WordCards } from "./practice-browser";
import { ProblemCard } from "./problem-card";
import { ListenControl, RecordControl } from "./record";
import { ReportScreen } from "./report-screen";
import { ResultScreen } from "./result-screen";
import { RoleplayScreen } from "./roleplay";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Dock,
	PrimaryButton,
} from "./shell";
import { FailedScreen, LoadingScreen, MicDeniedScreen } from "./state-screens";
import {
	AudioBar,
	AudioPair,
	ComboTarget,
	MouthVideo,
	Passage,
	QuestionText,
	SyllableRow,
	WordPicture,
} from "./stimulus";
import { WordPreviewList } from "./word-preview";

/**
 * 컴포넌트로 그린 활동 화면.
 *
 * 같은 이름의 "목업 대조" 스토리와 나란히 놓고 보면 된다 — 저쪽은 목업에서
 * 캡처한 마크업이고 이쪽은 컴포넌트다. 구조가 같은지는 사람 눈 말고
 * `npm run parity:activity` 가 판정한다. 여기서는 목업이 담지 못한 것,
 * 곧 상태가 바뀔 때(고르기·정오답·피드백) 어떻게 보이는지를 본다.
 */
const meta = {
	title: "활동 컴포넌트",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj;

const LESSON = "1급 4과";

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
	noFeedback?: boolean;
	dockRight?: { enabled: boolean };
}) {
	return (
		<ActivityFrame style={{ height: 720, width: "100%" }}>
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

const WORDS = ["apple", "grape", "peach", "pear"];

function wordQuiz(picked: number | null, correct: number) {
	return (
		<>
			<ProblemCard instruction="단어에 맞는 뜻을 고르세요.">
				<div className="word-focus">
					<strong>사과</strong>
					<button
						type="button"
						className="sound-icon"
						data-action="audio"
						aria-label="발음 듣기"
					>
						<IconVolume />
					</button>
				</div>
			</ProblemCard>
			<ChoiceList>
				{WORDS.map((x, i) => (
					<Choice
						key={x}
						index={i}
						state={picked === i ? (i === correct ? "correct" : "wrong") : ""}
					>
						{x}
					</Choice>
				))}
			</ChoiceList>
		</>
	);
}

/** 고르기 전 */
export const 어휘문제_풀기전: Story = {
	render: () => (
		<Screen
			progress={[0, 4]}
			body={wordQuiz(null, 0)}
			footer={<PrimaryButton label="다음" on={false} />}
		/>
	),
};

/** 맞게 고른 뒤 — 고른 것에만 ✓ 가 붙고 버튼이 켜진다 */
export const 어휘문제_정답: Story = {
	render: () => (
		<Screen
			progress={[0, 4]}
			body={wordQuiz(0, 0)}
			feedback={<FeedbackMessage kind="correct" />}
			footer={<PrimaryButton label="다음" on action="next" />}
		/>
	),
};

/** 틀리게 고른 뒤 — 정답을 같이 밝히지 않는다. 목업이 정한 방식이다 */
export const 어휘문제_오답: Story = {
	render: () => (
		<Screen
			progress={[0, 4]}
			body={wordQuiz(1, 0)}
			feedback={<FeedbackMessage kind="wrong" />}
			footer={<PrimaryButton label="다음" on action="next" />}
		/>
	),
};

/** 마지막 문항이면 버튼 글자가 바뀐다 */
export const 어휘문제_마지막문항: Story = {
	render: () => (
		<Screen
			progress={[3, 4]}
			body={wordQuiz(0, 0)}
			feedback={<FeedbackMessage kind="correct" />}
			footer={<PrimaryButton label="결과 보기" on action="next" />}
		/>
	),
};

const CHIPS = ["좋아서", "좋지만", "좋으면", "좋아도"];

function grammar(state: (x: string) => "" | "on" | "ok" | "no") {
	return (
		<>
			<ProblemCard instruction="빈칸에 알맞은 것을 고르세요.">
				<div className="blank-card">
					오늘 날씨가 <u>　</u> 밖에 나가고 싶어요.
				</div>
			</ProblemCard>
			<ChipWrap>
				{CHIPS.map((x) => (
					<ChipOption key={x} value={x} state={state(x)}>
						{x}
					</ChipOption>
				))}
			</ChipWrap>
		</>
	);
}

export const 문법빈칸_풀기전: Story = {
	render: () => (
		<Screen
			progress={[1, 5]}
			body={grammar(() => "")}
			footer={<PrimaryButton label="확인" on={false} />}
		/>
	),
};

/** 칩에는 목록형에 없는 중간 상태가 있다 — 골랐지만 아직 채점 전 */
export const 문법빈칸_고른상태: Story = {
	render: () => (
		<Screen
			progress={[1, 5]}
			body={grammar((x) => (x === "좋아서" ? "on" : ""))}
			footer={<PrimaryButton label="확인" on action="judge" />}
		/>
	),
};

export const 문법빈칸_채점후: Story = {
	render: () => (
		<Screen
			progress={[1, 5]}
			body={grammar((x) =>
				x === "좋아서" ? "no" : x === "좋지만" ? "ok" : "",
			)}
			feedback={<FeedbackMessage kind="wrong" />}
			footer={<PrimaryButton label="다음" on action="next" />}
		/>
	),
};

export const 듣기_OX: Story = {
	render: () => (
		<Screen
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction="들은 내용과 같으면 O, 다르면 X를 고르세요.">
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
						<Choice index={1} sub="내용이 같아요" state="correct">
							O
						</Choice>
					</ChoiceList>
				</>
			}
			feedback={<FeedbackMessage kind="correct" />}
			footer={<PrimaryButton label="다음" on action="next" />}
		/>
	),
};

export const 자모듣기: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[0, 4]}
			body={
				<>
					<ProblemCard instruction="듣고 맞는 것을 고르세요.">
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
			footer={<PrimaryButton label="다음" on={false} />}
		/>
	),
};

/** 16칸부터는 눈금을 포기하고 연속 막대 + n/total 이 된다 */
export const 진행막대_16칸이상: Story = {
	render: () => (
		<Screen
			progress={[7, 20]}
			body={wordQuiz(null, 0)}
			footer={<PrimaryButton label="다음" on={false} />}
		/>
	),
};

export const 결과: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<ResultScreen
				lesson={LESSON}
				total={4}
				answered={3}
				graded={3}
				correct={2}
				wrongs={[{ picked: "grape", explanation: "사과는 apple 이에요." }]}
			/>
		</div>
	),
};

/** 한 문항도 채점되지 않으면 정답률은 — 로 둔다 */
export const 결과_채점없음: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<ResultScreen
				lesson={LESSON}
				total={4}
				answered={0}
				graded={0}
				correct={0}
				wrongs={[]}
			/>
		</div>
	),
};

export const 대화리포트: Story = {
	render: () => (
		<div style={{ height: 720 }}>
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
		</div>
	),
};

export const 미션브리핑: Story = {
	render: () => (
		<div style={{ height: 720 }}>
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
					hints: [
						["따뜻한 커피 한 잔 주세요.", "One hot coffee, please."],
						["얼마예요?", "How much is it?"],
						["안녕히 계세요.", "Goodbye."],
					],
				}}
			/>
		</div>
	),
};

export const 로딩: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<LoadingScreen lesson={LESSON} current={0} total={4} />
		</div>
	),
};

export const 로드실패: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<FailedScreen lesson={LESSON} />
		</div>
	),
};

export const 마이크거부: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<MicDeniedScreen lesson={LESSON} />
		</div>
	),
};

const IMG = "../illust/images";
const FAMILY = [
	{ word: "어머니", image: `${IMG}/b1/b1_ch8_p85_13.png`, done: true },
	{ word: "아버지", image: `${IMG}/b1/b1_ch8_p85_12.png`, done: true },
	{ word: "형", image: `${IMG}/b1/b1_ch8_p85_15.png`, done: true },
	{ word: "누나", image: `${IMG}/b1/b1_ch8_p85_16.png`, done: false },
	{ word: "남동생", image: `${IMG}/b1/b1_ch8_p85_18.png`, done: false },
	{ word: "여동생", image: `${IMG}/b1/b1_ch8_p85_19.png`, done: false },
];
/** 미션대화 표본 */
const CHAT_MISSIONS = [
	{ id: 1, keyword: "주문하기", content: "마실 것을 골라 주문해요" },
	{ id: 2, keyword: "가격 묻기", content: "얼마인지 물어봐요" },
	{ id: 3, keyword: "인사하기", content: "헤어질 때 인사해요" },
];

/** 하단 입력의 기본 상태 — 녹음 전, 키보드 칸은 닫혀 있다 */
const CHAT_COMPOSE = {
	recordState: "idle" as const,
	recordedMsg: null,
	mediaRecorder: null,
	textareaValue: "",
	setTextareaValue: () => {},
	isShowInputBox: false,
	setIsShowInputBox: () => {},
	onRecord: () => {},
	onTerminate: () => {},
	onSendText: () => {},
	onRecordedMsgChange: () => {},
	stopRecording: () => {},
	unlock: () => {},
};

const ROLE_TURNS = [
	{
		who: "AI",
		mine: false,
		ko: "어서 오세요. 뭘 도와드릴까요?",
	},
	{
		who: "나",
		mine: true,
		ko: "커피 한 잔 주세요.",
	},
	{ who: "AI", mine: false, ko: "따뜻한 걸로 드릴까요?" },
	{ who: "나", mine: true, ko: "네, 따뜻한 걸로 주세요." },
	{ who: "AI", mine: false, ko: "삼천 원입니다." },
];

export const 읽기지문: Story = {
	render: () => (
		<Screen
			lesson="1급 6과"
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction="읽고 질문에 답하세요.">
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
								<Choice
									key={x}
									index={i}
									action="rpick"
									state={i === 1 ? "correct" : ""}
								>
									{x}
								</Choice>
							))}
						</ChoiceList>
					</div>
				</>
			}
			feedback={<FeedbackMessage kind="correct" />}
			footer={<PrimaryButton label="다음" on action="next" />}
		/>
	),
};

export const 어휘미리보기: Story = {
	render: () => (
		<Screen
			progress={[0, 1]}
			body={
				<>
					<ProblemCard instruction="이번 과의 단어를 먼저 살펴보세요." />
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
			footer={<PrimaryButton label="문제 풀기" on action="toQuiz" />}
		/>
	),
};

const CONSONANTS = "ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ ㅎ ㅋ ㅌ".split(" ");
const VOWELS = "ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ ㅐ ㅔ ㅚ ㅟ ㅑ ㅕ".split(" ");
const FINALS = "ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ".split(" ");

export const 자모조합_2단: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction="글자를 만들고 써 보세요.">
						<ComboTarget syllable="가" parts="ㄱ + ㅏ" />
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
			footer={<PrimaryButton label="확인" on action="toWrite" />}
		/>
	),
};

/** 받침이 붙으면 고르는 줄이 하나 더 는다 */
export const 자모조합_3단받침: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[0, 1]}
			body={
				<>
					<ProblemCard instruction="글자를 만들고 써 보세요.">
						<ComboTarget syllable="산" parts="ㅅ + ㅏ + ㄴ" />
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
			footer={<PrimaryButton label="확인" on action="toWrite" />}
		/>
	),
};

export const 따라쓰기_빈판: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction="글자를 순서에 맞게 써 보세요." />
					<WriteCanvas guide="../handwriting/가.png" />
				</>
			}
			footer={<PrimaryButton label="확인" on={false} />}
		/>
	),
};

export const 자모발음: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[2, 6]}
			noFeedback
			body={
				<>
					<ProblemCard
						instruction="듣고 따라 말해 보세요."
						stimulusStyle={{ gap: 16 }}
					>
						<MouthVideo>입모양 영상</MouthVideo>
						<AudioPair source="어" mine="" />
					</ProblemCard>
					<PracticeBrowser tabs={["1", "2", "3"]} current="1">
						<WordCards
							words={"아 어 오 우 으 이 애 에 외 위".split(" ")}
							current="어"
							done={(w) => "아 어 오".includes(w)}
						/>
					</PracticeBrowser>
				</>
			}
			dockRight={{ enabled: false }}
			footer={<RecordControl mode="idle" action="srec" />}
		/>
	),
};

/** 녹음을 마치면 버튼 모습과 옆 글자가 같이 바뀌고 오른쪽 다음이 열린다 */
export const 자모발음_녹음완료: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[2, 6]}
			noFeedback
			body={
				<>
					<ProblemCard
						instruction="듣고 따라 말해 보세요."
						stimulusStyle={{ gap: 16 }}
					>
						<MouthVideo>입모양 영상</MouthVideo>
						<AudioPair source="어" mine="ok" />
					</ProblemCard>
					<PracticeBrowser tabs={["1", "2", "3"]} current="1">
						<WordCards
							words={"아 어 오 우 으 이 애 에 외 위".split(" ")}
							current="어"
							done={(w) => "아 어 오".includes(w)}
						/>
					</PracticeBrowser>
				</>
			}
			dockRight={{ enabled: true }}
			footer={<RecordControl mode="done" action="srec" />}
		/>
	),
};

export const 녹음중: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[2, 6]}
			noFeedback
			body={
				<ProblemCard
					instruction="듣고 따라 말해 보세요."
					stimulusStyle={{ gap: 16 }}
				>
					<MouthVideo>입모양 영상</MouthVideo>
					<AudioPair source="어" mine="" />
				</ProblemCard>
			}
			dockRight={{ enabled: false }}
			footer={<RecordControl mode="recording" action="srec" />}
		/>
	),
};

export const 단어따라말하기: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[0, 6]}
			noFeedback
			body={
				<>
					<ProblemCard
						instruction="단어를 듣고 따라 말해 보세요."
						stimulusStyle={{ gap: 20 }}
					>
						<WordPicture word="어머니" image={FAMILY[0].image} />
						<AudioPair source="어머니" mine="" />
					</ProblemCard>
					<PracticeBrowser tabs={["1", "2", "3"]} current="1">
						<ThumbWordCards cards={FAMILY} current="어머니" />
					</PracticeBrowser>
				</>
			}
			dockRight={{ enabled: false }}
			footer={<RecordControl mode="idle" action="srec" />}
		/>
	),
};

export const 단어읽고쓰기: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[1, 6]}
			noFeedback
			body={
				<>
					<ProblemCard
						instruction="단어를 읽고 쓰세요."
						stimulusStyle={{ gap: 20 }}
					>
						<WordPicture word="바지" image={FAMILY[0].image} small />
						<AudioBar label="바지" />
						<SyllableRow syllables={["바", "지"]} />
					</ProblemCard>
					<PracticeBrowser tabs={["1", "2", "3"]} current="1">
						<ThumbWordCards cards={FAMILY} current="어머니" />
					</PracticeBrowser>
				</>
			}
			footer={<PrimaryButton label="다음" on={false} />}
		/>
	),
};

export const 플래시카드_앞면: Story = {
	render: () => (
		<div style={{ height: 720 }}>
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
		</div>
	),
};

/** 카드를 뒤집으면 뜻·품사·그림이 같이 나온다 */
export const 플래시카드_뒷면: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<FlashcardScreen
				lesson={LESSON}
				index={1}
				total={3}
				card={{ front: "사과", back: "apple", sub: "명사" }}
				flipped
				knownCount={1}
				unknownCount={0}
				onSkip={() => {}}
			/>
		</div>
	),
};

export const 미션대화: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<ChatScreen
				lesson={LESSON}
				scenario="카페에서 음료를 주문해 보세요"
				scenarioTranslated="Order a drink at the cafe"
				scenarioImgUrl=""
				missions={CHAT_MISSIONS}
				completed={["주문하기", "가격 묻기"]}
				compose={<DialogInput {...CHAT_COMPOSE} />}
				onSkip={() => {}}
			>
				<BotMsgBox msg="어서 오세요. 무엇을 드릴까요?" replayAudio={() => {}} />
				<UserMsgBox msg="커피 주세요." />
				<BotMsgBox
					msg="네, 아메리카노요? 따뜻한 걸로 드릴까요?"
					replayAudio={() => {}}
				/>
				<BotMsgProgress />
			</ChatScreen>
		</div>
	),
};

/** 고칠 곳이 있던 말에는 밑에 한 줄이 붙는다 */
export const 미션대화_고칠곳: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<ChatScreen
				lesson={LESSON}
				scenario="카페에서 음료를 주문해 보세요"
				scenarioTranslated="Order a drink at the cafe"
				scenarioImgUrl=""
				missions={CHAT_MISSIONS}
				completed={["주문하기"]}
				compose={<DialogInput {...CHAT_COMPOSE} />}
				onSkip={() => {}}
			>
				<BotMsgBox msg="어서 오세요. 무엇을 드릴까요?" replayAudio={() => {}} />
				{/* 두 줄이다 — 위가 교정 문장(한국어), 아래가 해설(학습자 모국어).
				    교정 문장은 서버가 매 발화마다 만드는데 2026-09-03 까지 앱이
				    한 번도 그리지 않았다(`recommend_example`) */}
				<TipUserMsgBox
					msg="따뜻한 거 주세요"
					alertMsg="'따뜻한 것으로 주세요' 가 더 자연스러워요."
					correction="따뜻한 것으로 주세요."
				/>
				<AlertUserMsgBox
					msg="커피 주다."
					alertMsg="'커피 주세요' 라고 해 보세요."
					correction="커피 주세요."
				/>
				{/* 해설만 있고 교정 문장이 없는 옛 대화 행 — 한 줄로 그려진다 */}
				<AlertUserMsgBox
					msg="얼마에요?"
					alertMsg="'얼마예요?' 가 맞아요."
				/>
			</ChatScreen>
		</div>
	),
};

/** 미션을 다 채우면 실 안에 마칠 수 있다는 안내가 붙는다 */
export const 미션대화_끝: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<ChatScreen
				lesson={LESSON}
				scenario="카페에서 음료를 주문해 보세요"
				scenarioTranslated="Order a drink at the cafe"
				scenarioImgUrl=""
				missions={CHAT_MISSIONS}
				completed={["주문하기", "가격 묻기", "인사하기"]}
				compose={<DialogInput {...CHAT_COMPOSE} />}
				onSkip={() => {}}
			>
				<BotMsgBox msg="어서 오세요. 무엇을 드릴까요?" replayAudio={() => {}} />
				<UserMsgBox msg="커피 주세요." />
				<BotMsgBox msg="삼천 원입니다." replayAudio={() => {}} />
				<UserMsgBox msg="안녕히 계세요." />
				<CompletedMsgBox closeDialog={() => {}} />
			</ChatScreen>
		</div>
	),
};

export const 롤플레잉: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<RoleplayScreen
				lesson={LESSON}
				turns={ROLE_TURNS}
				current={1}
				direction="ai"
				control={<RecordControl mode="idle" action="roleRecord" />}
				onSkip={() => {}}
			/>
		</div>
	),
};

/** 분석 결과 카드에서 내 녹음을 듣고, 다시 녹음하거나 다음 대사로 갈 수 있다 */
export const 롤플레잉_녹음완료: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<RoleplayScreen
				lesson={LESSON}
				turns={ROLE_TURNS}
				current={1}
				direction="ai"
				control={<RecordControl mode="idle" action="roleRecord" />}
				result={{
					index: 1,
					expected: "커피 한 잔 주세요.",
					recognized: "커피 한 잔 주새요",
					matched: false,
					canChooseNext: true,
				}}
				onSkip={() => {}}
			/>
		</div>
	),
};

/** AI 차례에는 같은 자리가 듣기 조작으로 바뀐다 */
export const 롤플레잉_AI차례: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<RoleplayScreen
				lesson={LESSON}
				turns={ROLE_TURNS}
				current={2}
				direction="ai"
				control={<ListenControl />}
				onSkip={() => {}}
			/>
		</div>
	),
};
