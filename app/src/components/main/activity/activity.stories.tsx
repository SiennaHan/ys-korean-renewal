import type { Meta, StoryObj } from "@storybook/react";
import type { ReactElement } from "react";
import { AudioRow } from "./audio";
import { BriefingScreen } from "./briefing-screen";
import { ChipOption, ChipWrap, Choice, ChoiceList } from "./choice";
import { FeedbackMessage } from "./feedback";
import { ProblemCard } from "./problem-card";
import { ReportScreen } from "./report-screen";
import { ResultScreen } from "./result-screen";
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
}: {
	lesson?: string;
	progress?: [number, number];
	body: ReactElement;
	footer: ReactElement;
	feedback?: ReactElement | null;
}) {
	return (
		<ActivityFrame style={{ height: 720, width: "100%" }}>
			<ActivityAppBar lesson={lesson} onExit={() => {}} onSkip={() => {}} />
			{progress && (
				<ActivityProgress current={progress[0]} total={progress[1]} />
			)}
			<ActivityBody feedback={feedback ?? null}>{body}</ActivityBody>
			<ActivityFooter>
				<Dock>{footer}</Dock>
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
					words: [
						["커피", "coffee"],
						["얼마", "how much"],
						["따뜻하다", "to be hot"],
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
