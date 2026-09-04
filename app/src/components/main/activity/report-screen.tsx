import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	Dock,
	PrimaryButton,
} from "./shell";

/**
 * 평가 축 넷. 레이더와 그 아래 총평이 같은 축을 가리키므로
 * 이름은 데이터가 아니라 여기서 나온다 — 서버가 "발음"이라는 글자를 보내면
 * 레이더는 번역되고 총평만 한국어로 남는다.
 */
export const REPORT_AXES = [
	"pronunciation",
	"grammar",
	"content",
	"vocabulary",
] as const;
export type ReportAxis = (typeof REPORT_AXES)[number];

/** 축 이름의 i18n 키. REPORT_AXES 순서를 따른다 */
const AXIS_KEY: Record<ReportAxis, string> = {
	pronunciation: "report.axisPronunciation",
	grammar: "report.axisGrammar",
	content: "report.axisContent",
	vocabulary: "report.axisVocabulary",
};

/** 네 축의 점수 (0~100). REPORT_AXES 순서다 */
export type RadarValues = [number, number, number, number];

/** 축마다 한 줄 총평. 문장은 서버가 만들고, 축 이름은 앱이 붙인다 */
export interface ReportRow {
	axis: ReportAxis;
	/** 학생에게 보일 문장. 이미 학생 언어로 온 것이어야 한다 */
	text: string;
}

export interface SentenceFeedback {
	id: string | number;
	sentence: string;
	feedback: string;
	/** 교정 예시 문장 — **한국어**. 서버 `recommend_example` 이다.
	 * 없을 수 있다(옛 대화는 이 값을 안 그리던 때에 쌓였다). */
	correction?: string;
}

const CX = 110;
const CY = 104;
const R = 74;
/** 12시에서 시작해 시계 방향 */
const angle = (i: number) => (Math.PI / 2) * i - Math.PI / 2;
const point = (i: number, r: number): [number, number] => [
	CX + Math.cos(angle(i)) * R * r,
	CY + Math.sin(angle(i)) * R * r,
];
const ring = (r: number) =>
	[0, 1, 2, 3].map((i) => point(i, r).map(Math.round).join(",")).join(" ");

/**
 * 네 축 레이더. 목업의 radar() 를 그대로 옮겼다 —
 * 차트 라이브러리를 쓰면 격자 색·글자 크기·라벨 위치가 다 달라진다.
 *
 * 색만 semantic 토큰으로 바꿨다. 목업은 SVG 속성에 --blue-500 처럼 원색을
 * 직접 적어 두는데, CSS 이관은 스타일시트만 옮기므로 이 이름들은 앱에 없다.
 */
function Radar({ values }: { values: RadarValues }) {
	const { t } = useTranslation();
	const shape = values
		.map((v, i) =>
			point(i, v / 100)
				.map((n) => n.toFixed(1))
				.join(","),
		)
		.join(" ");
	const labels = REPORT_AXES.map((axis) => t(AXIS_KEY[axis]));
	return (
		<svg
			// 목업은 220 폭이면 됐다 — 축 이름이 "발음" 두 글자였기 때문이다.
			// 이름을 번역하면 좌우로 넘쳐 잘린다(Từ vựng · Pronunciation).
			// 양옆에 30 씩 넓히고 max-width 를 같은 만큼 키워, 그려지는 크기는
			// 그대로 두고 글자가 앉을 자리만 만든다.
			viewBox="-30 0 280 210"
			style={{
				width: "100%",
				maxWidth: 280,
				height: "auto",
				display: "block",
				margin: "0 auto",
			}}
			aria-label={t("report.chartLabel")}
			role="img"
		>
			{[0.25, 0.5, 0.75, 1].map((r) => (
				<polygon
					key={r}
					points={ring(r)}
					fill="none"
					stroke="var(--color-line-normal)"
				/>
			))}
			{[0, 1, 2, 3].map((i) => {
				const [x, y] = point(i, 1);
				return (
					<line
						key={i}
						x1={CX}
						y1={CY}
						x2={x.toFixed(0)}
						y2={y.toFixed(0)}
						stroke="var(--color-line-normal)"
					/>
				);
			})}
			<polygon
				points={shape}
				fill="var(--color-fill-primary)"
				fillOpacity=".22"
				stroke="var(--color-fill-primary)"
				strokeWidth="2"
			/>
			{labels.map((label, i) => {
				const [x, y] = point(i, 1.32);
				return (
					<text
						key={label}
						x={x.toFixed(0)}
						y={(y + 4).toFixed(0)}
						textAnchor="middle"
						fontSize="12"
						fontWeight="600"
						fill="var(--color-text-sub)"
					>
						{label}
					</text>
				);
			})}
		</svg>
	);
}

/**
 * AI 대화 리포트.
 *
 * 결과 화면과 같은 자리(머리말 고정 + 스크롤 본문 + 버튼 둘)를 쓰되
 * 탭 줄이 하나 더 있다. 탭은 아직 화면을 바꾸지 않는다 —
 * "나의 문장 피드백"은 문장별 채점이 붙는 다음 단계다.
 */
export function ReportScreen({
	lesson,
	hits,
	missions,
	values,
	score,
	rows,
	sentenceFeedback = [],
	loading,
	retryLabel,
	nextLabel,
	onExit,
	onRetry,
	onNext,
}: {
	lesson: string;
	/** 달성한 미션 키워드 수 */
	hits: number;
	missions: number;
	values: RadarValues;
	/**
	 * 머리의 「점수」 — **네 축의 평균이다**(기획 확정 2026-09-04).
	 *
	 * 전에는 이 자리를 `hits / missions` 로 냈다. 그런데 바로 왼쪽이
	 * 「완료한 키워드 2 / 3」이라 **같은 값을 백분율로 한 번 더** 보여 주고 있었다
	 * (목업의 66% 가 2/3 다). 아래 레이더와 뜻이 다른 숫자가 머리에 있어야 한다.
	 *
	 * **측정되지 않은 축은 분모에서 뺀다** — 키보드로만 한 대화는 발음이 0 인데
	 * 그것을 평균에 넣으면 「발음이 나쁘다」가 아니라 **총점이 나쁘다**로 번진다.
	 * 그 판단은 부르는 쪽이 한다(`mission-report.tsx`).
	 *
	 * 안 넘기면 옛 계산(미션 달성률)으로 떨어진다 — Storybook 픽스처가 그 길이다.
	 */
	score?: number | null;
	rows: ReportRow[];
	sentenceFeedback?: SentenceFeedback[];
	loading?: boolean;
	retryLabel?: string;
	nextLabel?: string;
	onExit?: () => void;
	onRetry?: () => void;
	onNext?: () => void;
}) {
	const { t } = useTranslation();
	const [tab, setTab] = useState<"evaluation" | "sentences">("evaluation");
	const percent =
		typeof score === "number"
			? score
			: missions > 0
				? Math.floor((hits / missions) * 100)
				: 0;

	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} />
			<main className="activity-content" style={{ padding: 0 }}>
				<div className="rep-head">
					<h2>{t("report.title")}</h2>
					<p>{t("report.subtitle")}</p>
					<div className="stat-row" style={{ marginTop: 12 }}>
						<div>
							<span>{t("report.keywordsDone")}</span>
							<strong>
								{hits} / {missions}
							</strong>
						</div>
						<div>
							<span>{t("report.score")}</span>
							<strong>{percent}%</strong>
						</div>
					</div>
				</div>
				<div className="rep-tabs" role="tablist">
					<button
						type="button"
						className={tab === "evaluation" ? "on" : ""}
						aria-selected={tab === "evaluation"}
						onClick={() => setTab("evaluation")}
					>
						{t("report.tabEvaluation")}
					</button>
					<button
						type="button"
						className={tab === "sentences" ? "on" : ""}
						aria-selected={tab === "sentences"}
						onClick={() => setTab("sentences")}
					>
						{t("report.tabSentences")}
					</button>
				</div>
				<div className="scroll-area" style={{ padding: 12 }}>
					{tab === "evaluation" ? (
						<div className="report-card">
							<Radar values={values} />
							<div className="report-rows">
								{rows.map((row) => (
									<div className="as-row" key={row.axis}>
										<span className="k">{t(AXIS_KEY[row.axis])}</span>
										<p>{row.text}</p>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="report-feedback-list">
							{sentenceFeedback.length > 0 ? (
								sentenceFeedback.map((item, index) => (
									<div className="wrong-card" key={item.id}>
										<span className="tag w">
											{t("result.wrongItem", { index: index + 1 })}
										</span>
										<p className="report-sentence">{item.sentence}</p>
										{item.correction && (
											<>
												<span className="tag c">
													{t("missionChat.suggested")}
												</span>
												<p className="report-correction">{item.correction}</p>
											</>
										)}
										<span className="tag e">
											{t("result.explanation", { index: index + 1 })}
										</span>
										<p className="report-explanation">{item.feedback}</p>
									</div>
								))
							) : (
								<div className="report-empty">{t("report.emptySentences")}</div>
							)}
						</div>
					)}
				</div>
			</main>
			<ActivityFooter>
				<Dock mainStyle={{ gap: 12 }}>
					<PrimaryButton
						label={retryLabel ?? t("result.practiceAgain")}
						on
						onClick={onRetry}
					/>
					<PrimaryButton
						label={nextLabel ?? t("result.nextActivity")}
						on
						onClick={onNext}
					/>
				</Dock>
			</ActivityFooter>
			{loading && (
				<div className="report-loading" aria-live="polite">
					{t("report.loading")}
				</div>
			)}
		</ActivityFrame>
	);
}
