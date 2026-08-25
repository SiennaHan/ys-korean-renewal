import type { Meta, StoryObj } from "@storybook/react";
import type { ReactElement } from "react";
import { AudioRow } from "./audio";
import { ChatScreen } from "./chat";
import { Choice, ChoiceList } from "./choice";
import { FeedbackMessage } from "./feedback";
import { JamoSection, WriteCanvas } from "./jamo-write";
import { ProblemCard } from "./problem-card";
import { RecordControl } from "./record";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Dock,
	PrimaryButton,
} from "./shell";
import { AudioPair, ComboTarget, Passage, QuestionText } from "./stimulus";

/**
 * **상태 감사 전용 스토리다. 디자인 정본이 아니다.**
 *
 * `phase1/state_audit/` 작업에서, 확정 목업 캡처에도 기존 스토리에도 없는
 * 상호작용 상태를 눈으로 확인하려고 만들었다. 그래서 —
 *
 *   · **제품 컴포넌트에 props 를 새로 만들지 않았다.** 여기 쓰는 것은 전부
 *     이미 있던 props 다(`Choice.state` · `RecordControl.mode` ·
 *     `WriteCanvas.strokes` · `ChatScreen.recordMode`).
 *   · 값은 기존 `activity.stories.tsx` 의 같은 화면에서 그대로 가져왔다.
 *     상태만 바꿨으니 무엇이 달라지는지가 곧 그 상태의 디자인이다.
 *   · **여기서 나온 그림을 목업 정본으로 승격하지 마라.** 승격은 디자인 검토
 *     뒤에 하는 일이고, 감사 자료는 `phase1/state_audit/activity/` 에 있다.
 */
const meta = {
	title: "상태 감사(정본 아님)",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj;

/** `activity.stories.tsx` 의 Screen 과 같은 껍데기 — 감사분이 같은 틀에서 나오게 */
function Screen({
	lesson = "1급 4과",
	progress,
	body,
	footer,
	feedback,
	noFeedback,
}: {
	lesson?: string;
	progress?: [number, number];
	body: ReactElement;
	footer: ReactElement;
	feedback?: ReactElement | null;
	noFeedback?: boolean;
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
				<Dock>{footer}</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}

// ─── 듣기 문제 ────────────────────────────────────────────────────────
// 기존 스토리(듣기 OX)는 **정답** 상태만 담고 있다. 오답 쪽을 본다.

function listenBody(state: "correct" | "wrong") {
	return (
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
				<Choice
					index={0}
					sub="내용이 달라요"
					state={state === "wrong" ? "wrong" : ""}
				>
					X
				</Choice>
				<Choice
					index={1}
					sub="내용이 같아요"
					state={state === "correct" ? "correct" : ""}
				>
					O
				</Choice>
			</ChoiceList>
		</>
	);
}

export const 듣기_오답: Story = {
	render: () => (
		<Screen
			progress={[0, 3]}
			body={listenBody("wrong")}
			feedback={<FeedbackMessage kind="wrong" />}
			footer={<PrimaryButton label="다음" on action="next" />}
		/>
	),
};

// ─── 읽기 문제 ────────────────────────────────────────────────────────

const READ_PASSAGE = `저는 마이클입니다. 미국 사람이에요.
지금 한국에서 한국어를 배웁니다.
학교는 신촌에 있어요. 매일 아침 아홉 시에 갑니다.`;

function readBody(
	passage: string,
	question: string,
	options: string[],
	pick: number | null,
	answer: number,
) {
	return (
		<>
			<ProblemCard instruction="읽고 질문에 답하세요.">
				<Passage>{passage}</Passage>
			</ProblemCard>
			<div className="response-area">
				<QuestionText>{question}</QuestionText>
				<ChoiceList inResponseArea={false}>
					{options.map((x, i) => (
						<Choice
							key={x}
							index={i}
							action="rpick"
							state={pick === i ? (i === answer ? "correct" : "wrong") : ""}
						>
							{x}
						</Choice>
					))}
				</ChoiceList>
			</div>
		</>
	);
}

export const 읽기_오답: Story = {
	render: () => (
		<Screen
			lesson="1급 6과"
			progress={[0, 3]}
			body={readBody(
				READ_PASSAGE,
				"마이클은 어디에서 한국어를 배웁니까?",
				["미국", "신촌", "도쿄", "부산"],
				0,
				1,
			)}
			feedback={<FeedbackMessage kind="wrong" />}
			footer={<PrimaryButton label="다음" on action="next" />}
		/>
	),
};

/** 긴 지문 + 두 줄 넘는 긴 선택지 — 정렬과 도크 가림을 본다 */
export const 읽기_긴선택지: Story = {
	render: () => (
		<Screen
			lesson="3급 9과"
			progress={[2, 5]}
			body={readBody(
				`요즘 한국에서는 혼자 밥을 먹는 사람이 많아졌습니다. 예전에는 여럿이 모여
먹는 것이 보통이었지만, 일하는 시간이 서로 다르고 혼자 사는 사람도 늘면서
식당들도 한 사람이 앉을 수 있는 자리를 따로 만들기 시작했습니다.
편의점에서 간단히 끼니를 해결하는 사람도 적지 않습니다.`,
				"이 글의 내용과 같은 것을 고르십시오.",
				[
					"혼자 밥을 먹는 사람이 늘면서 식당도 한 사람용 자리를 만들기 시작했다",
					"예전부터 한국 사람들은 대부분 혼자 밥을 먹는 것을 더 좋아했다",
					"편의점에서 끼니를 해결하는 사람은 거의 없다",
					"일하는 시간이 같아져서 여럿이 모여 먹기 쉬워졌다",
				],
				null,
				0,
			)}
			footer={<PrimaryButton label="다음" on={false} />}
		/>
	),
};

// ─── 자모 듣고 고르기 ─────────────────────────────────────────────────

function jamoListenBody(pick: number | null, answer: number) {
	return (
		<>
			<ProblemCard instruction="듣고 맞는 것을 고르세요.">
				<AudioRow label="발음 듣기" sub="자모 음성" />
			</ProblemCard>
			<ChoiceList variant="jamo">
				{["어", "오"].map((x, i) => (
					<Choice
						key={x}
						index={i}
						state={pick === i ? (i === answer ? "correct" : "wrong") : ""}
					>
						{x}
					</Choice>
				))}
			</ChoiceList>
		</>
	);
}

export const 자모듣기_정답: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[0, 4]}
			body={jamoListenBody(0, 0)}
			feedback={<FeedbackMessage kind="correct" />}
			footer={<PrimaryButton label="다음" on action="next" />}
		/>
	),
};

export const 자모듣기_오답: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[0, 4]}
			body={jamoListenBody(1, 0)}
			feedback={<FeedbackMessage kind="wrong" />}
			footer={<PrimaryButton label="다음" on action="next" />}
		/>
	),
};

// ─── 자모 조합 · 따라쓰기 ─────────────────────────────────────────────

const CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ"];
const VOWELS = ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ"];
const FINALS = ["ㄱ", "ㄴ", "ㄹ", "ㅁ", "ㅂ", "ㅇ"];

/** 첫 줄만 고른 상태 — 아직 글자가 안 만들어졌다 */
export const 자모조합_일부만고름: Story = {
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
					<JamoSection step={2} slot="vowel" options={VOWELS} picked="" />
				</>
			}
			footer={<PrimaryButton label="확인" on={false} />}
		/>
	),
};

/** 3단에서 받침만 아직 안 고른 상태 */
export const 자모조합3단_받침전: Story = {
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
					<JamoSection step={3} slot="final" options={FINALS} picked="" />
				</>
			}
			footer={<PrimaryButton label="확인" on={false} />}
		/>
	),
};

/** 획이 있는 판 — `strokes` 는 이미 있던 props 다 */
export const 따라쓰기_그린판: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction="글자를 순서에 맞게 써 보세요." />
					<WriteCanvas
						guide="../handwriting/가.png"
						strokes={[
							"M 40 60 L 150 60 L 150 90",
							"M 190 40 L 190 170",
							"M 190 110 L 250 110",
						]}
					/>
				</>
			}
			footer={<PrimaryButton label="확인" on action="check" />}
		/>
	),
};

export const 따라쓰기_틀린판: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[0, 3]}
			body={
				<>
					<ProblemCard instruction="글자를 순서에 맞게 써 보세요." />
					<WriteCanvas
						guide="../handwriting/가.png"
						strokes={["M 60 140 L 240 70"]}
						judge="wrong"
					/>
				</>
			}
			feedback={<FeedbackMessage kind="wrong" />}
			footer={<PrimaryButton label="확인" on action="check" />}
		/>
	),
};

// ─── 녹음 경로 ① AudioRecorder 계열 ───────────────────────────────────
// `RecordControl.mode` 여섯 가지 중 기존 스토리에 없는 셋을 본다.

function speakBody(mine: "" | "ok") {
	return (
		<>
			<ProblemCard instruction="듣고 따라 말해 보세요.">
				<AudioPair source="어" mine={mine} />
			</ProblemCard>
		</>
	);
}

export const 녹음_준비중: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[2, 6]}
			noFeedback
			body={speakBody("")}
			footer={<RecordControl mode="preparing" action="srec" />}
		/>
	),
};

export const 녹음_마무리중: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[2, 6]}
			noFeedback
			body={speakBody("")}
			footer={<RecordControl mode="finishing" action="srec" />}
		/>
	),
};

export const 녹음_보내는중: Story = {
	render: () => (
		<Screen
			lesson="1급 1과"
			progress={[2, 6]}
			noFeedback
			body={speakBody("ok")}
			footer={<RecordControl mode="sending" action="srec" />}
		/>
	),
};

// ─── 녹음 경로 ② 미션대화 ─────────────────────────────────────────────
// ChatScreen 도 같은 `RecordMode` 를 받는다. 훅(useRecording)의 상태 이름과
// 다른데(ready·converting·recorded), 그 어긋남은 보고서에 적었다.

const CHAT = {
	lesson: "1급 4과",
	scenario: "카페에서 음료를 주문해 보세요",
	scenarioTranslated: "Order a drink at the cafe",
	missions: ["주문하기", "가격 묻기", "인사하기"],
	hits: new Set([0, 1]),
	turns: [
		{ who: "bot" as const, text: "어서 오세요. 무엇을 드릴까요?" },
		{ who: "me" as const, text: "커피 주세요." },
		{ who: "bot" as const, text: "네, 아메리카노요? 따뜻한 걸로 드릴까요?" },
	],
};

export const 미션대화_녹음중: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<ChatScreen {...CHAT} recordMode="recording" onSkip={() => {}} />
		</div>
	),
};

export const 미션대화_보내는중: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<ChatScreen {...CHAT} recordMode="sending" onSkip={() => {}} />
		</div>
	),
};

export const 미션대화_녹음완료: Story = {
	render: () => (
		<div style={{ height: 720 }}>
			<ChatScreen {...CHAT} recordMode="done" onSkip={() => {}} />
		</div>
	),
};
