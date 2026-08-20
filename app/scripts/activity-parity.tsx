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
import {
	ChipOption,
	ChipWrap,
	Choice,
	ChoiceList,
} from "@/components/main/activity/choice";
import { ProblemCard } from "@/components/main/activity/problem-card";
import { ReportScreen } from "@/components/main/activity/report-screen";
import { ResultScreen } from "@/components/main/activity/result-screen";
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
import i18n from "@/i18n";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";

const LESSON = "1급 4과";

/** 문제 화면의 공통 껍데기 — 목업 gapFrame 과 같은 자리 */
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
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={() => {}} onSkip={() => {}} />
			{progress && (
				<ActivityProgress current={progress[0]} total={progress[1]} />
			)}
			<ActivityBody feedback={feedback === undefined ? null : feedback}>
				{body}
			</ActivityBody>
			<ActivityFooter>
				<Dock>{footer}</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}

const NEXT = <PrimaryButton label="다음" on={false} />;

const SCREENS: Record<string, ReactElement> = {
	grammar: (
		<Screen
			progress={[1, 5]}
			body={
				<>
					<ProblemCard instruction="빈칸에 알맞은 것을 고르세요.">
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
					<ProblemCard instruction="단어에 맞는 뜻을 고르세요.">
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
				["발음", "전반적으로 또렷해요. 커피의 받침을 조금 더 살려 보세요."],
				["문법", "어미가 대체로 정확해요. 높임 표현을 한 번 더 확인해 보세요."],
				["어휘", "주문에 필요한 말을 잘 썼어요."],
				["내용", "주문·가격·인사를 자연스럽게 다 다뤘어요."],
			]}
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
