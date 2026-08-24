/**
 * 조사 스나이퍼 결과 화면 — **표시만** 담당한다.
 *
 * 왜 갈랐나 — 목업 대조(scripts/activity-parity.tsx)가 이 화면을 검사할 수 있게
 * 하려고. 판을 굴리는 일은 particle-sniper.tsx 가 그대로 한다.
 * home/view.tsx · game/{list-view,vocashot-view}.tsx 와 같은 꼴이다.
 */

export interface PsMistake {
	sentence: string;
	correct: string;
	userAnswer: string;
}

export interface ParticleSniperResultProps {
	/** "1급" 처럼 이미 만들어진 문자열 */
	level: string;
	/** "13과" */
	lesson: string;
	score: number;
	best: number | null;
	/** 맞힌 수 · 낸 수 — 정확도와 등급은 여기서 만든다 */
	correct: number;
	answered: number;
	maxCombo: number;
	mistakes: PsMistake[];
	onRetry: () => void;
	onLesson: () => void;
	onLevel: () => void;
}

export function ParticleSniperResultView({
	level,
	lesson,
	score,
	best,
	correct,
	answered,
	maxCombo,
	mistakes,
	onRetry,
	onLesson,
	onLevel,
}: ParticleSniperResultProps) {
	const acc = answered > 0 ? Math.round((correct / answered) * 100) : 0;
	const grade = acc >= 90 ? "S" : acc >= 75 ? "A" : acc >= 60 ? "B" : "C";

	return (
		<div className="result-screen ux-dark-stage ps-result">
			<div className="ps-result-scroll">
				<div className="ps-result-hero">
					<div className="ps-result-grade">{grade}</div>
					<div className="ps-result-stage">
						{level} · {lesson}
					</div>
					<div className="ps-result-score">
						{score.toLocaleString("ko-KR")}점
					</div>
					{best !== null && (
						<div className="ps-result-best">
							최고 점수 <b>{best.toLocaleString("ko-KR")}점</b>
						</div>
					)}
				</div>

				<div className="ps-result-stats">
					<div className="ps-result-stat">
						<b>{acc}%</b>
						<span>정확도</span>
					</div>
					<div className="ps-result-stat">
						<b>{maxCombo}×</b>
						<span>최고 콤보</span>
					</div>
					<div className="ps-result-stat">
						<b>
							{correct} / {answered}
						</b>
						<span>맞힌 문항</span>
					</div>
					<div className="ps-result-stat">
						<b>{mistakes.length}</b>
						<span>오답</span>
					</div>
				</div>

				{mistakes.length > 0 && (
					<div className="ps-mistakes">
						<h3>틀린 문제</h3>
						{mistakes.map((m, idx) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: 같은 문장을 두 번 틀릴 수 있어 순서가 신원의 일부다
							<div key={`${m.sentence}-${idx}`} className="ps-mistake">
								<p className="sentence">{m.sentence}</p>
								<p className="mine">나의 선택: {m.userAnswer}</p>
								<p className="answer">정답: {m.correct}</p>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="ps-result-actions">
				<button
					type="button"
					className="ux-control ps-result-retry"
					onClick={onRetry}
				>
					다시하기
				</button>
				<div className="ps-result-links">
					<button type="button" className="ux-control" onClick={onLesson}>
						과 선택
					</button>
					<button type="button" className="ux-control" onClick={onLevel}>
						급수 선택
					</button>
				</div>
			</div>
		</div>
	);
}
