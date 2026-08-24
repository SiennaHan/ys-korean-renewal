import { ArrowLeft } from "lucide-react";

/**
 * 조사 스나이퍼 — **표시만** 담당하는 화면들. 판을 굴리는 일은
 * particle-sniper.tsx 가 그대로 한다.
 *
 * 왜 갈랐나 — 목업 대조(scripts/activity-parity.tsx)가 화면마다 검사할 수 있게
 * 하려고. 통짜로 두면 정적으로 그릴 때 첫 화면(로딩)밖에 나오지 않는다.
 * home/view.tsx · game/{list-view,vocashot-view}.tsx 와 같은 꼴이다.
 */

export interface LevelMeta {
	color: string;
	summary: string;
}

export interface LevelSelectProps {
	/** 급 → 색·요약. 서버에서 온다(getParticleSniperLevels) */
	levelMeta: Record<string, LevelMeta>;
	onPick: (level: string) => void;
	onBack: () => void;
}

export function ParticleSniperLevelView({
	levelMeta,
	onPick,
	onBack,
}: LevelSelectProps) {
	return (
		<div className="ux-dark-stage relative z-10 flex min-h-full flex-col bg-[#060612] p-6 ps-level-shell ps-stage text-white">
			<div className="mb-1 flex items-center gap-3 ps-level-header">
				<button
					type="button"
					className="ux-control ps-back"
					onClick={() => onBack()}
					style={{
						width: 32,
						height: 32,
						borderRadius: "50%",
						background: "rgba(255,255,255,0.08)",
						border: "none",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						flexShrink: 0,
					}}
				>
					<ArrowLeft size={18} color="rgba(255,255,255,0.7)" />
				</button>
				{/* 목업은 이 화면에 Exo 2 를 쓰지 않는다 — .game-frame 의 Pretendard 를 물려받는다 */}
				<h1 className="ux-title font-bold text-3xl">조사 스나이퍼</h1>
			</div>
			<p
				className="mb-8 ps-level-subtitle text-[#7878A0] text-sm"
				style={{ fontFamily: "Pretendard, sans-serif" }}
			>
				급수를 선택하세요
			</p>
			<div className="grid grid-cols-2 gap-3 ps-level-grid">
				{Object.entries(levelMeta).map(([level, meta]) => (
					<button
						type="button"
						key={level}
						onClick={() => {
							onPick(level);
						}}
						className="ux-level-card ux-control rounded-xl p-4 text-left transition-all active:scale-95"
						style={{
							border: `2px solid ${meta.color}40`,
							background: `${meta.color}10`,
						}}
					>
						<div
							className="mb-1 font-bold text-xl"
							style={{ color: meta.color }}
						>
							{level}
						</div>
						<div
							className="text-xs leading-relaxed"
							style={{ color: "#9090B0", fontFamily: "Pretendard, sans-serif" }}
						>
							{meta.summary}
						</div>
					</button>
				))}
			</div>
		</div>
	);
}

export interface PsMistake {
	sentence: string;
	correct: string;
	userAnswer: string;
}

/** 과 선택에 필요한 한 과의 정보 — 서버에서 오는 LessonEntry 의 표시용 부분 */
export interface LessonInfo {
	new_particles: string[];
	questions: unknown[];
}

export interface LessonSelectProps {
	level: string;
	meta: LevelMeta;
	/** 과 키 → 그 과의 정보. 정렬과 누적 계산은 이 안에서 한다 */
	lessons: Record<string, LessonInfo>;
	/** 한 판의 문항 상한 — 누적이 이보다 크면 이 값을 보여 준다 */
	maxPerGame: number;
	onPick: (lesson: string) => void;
	onBack: () => void;
}

export function ParticleSniperLessonView({
	level,
	meta,
	lessons,
	maxPerGame,
	onPick,
	onBack,
}: LessonSelectProps) {
	const lessonKeys = Object.keys(lessons).sort((a, b) => {
		const an = Number.parseInt(a, 10);
		const bn = Number.parseInt(b, 10);
		if (Number.isNaN(an) || Number.isNaN(bn)) return a.localeCompare(b, "ko");
		return an - bn;
	});

	// 누적 문항 수 — 현재 과와 이전 과를 합친다
	let cumCount = 0;
	const cumCounts: Record<string, number> = {};
	for (const key of lessonKeys) {
		cumCount += lessons[key]?.questions?.length ?? 0;
		cumCounts[key] = cumCount;
	}

	return (
		// 목업(ps_lesson) 주입 클래스
		<div className="ux-dark-stage relative z-10 flex min-h-full flex-col bg-[#060612] p-6 ps-lesson-shell ps-stage text-white">
			<button
				type="button"
				onClick={() => onBack()}
				className="ux-back ux-control mb-4 flex items-center gap-1 text-sm"
				style={{ color: meta.color, fontFamily: "Pretendard, sans-serif" }}
			>
				← 급수 선택
			</button>
			{/* 목업은 이 제목에 Exo 2 를 쓰지 않는다 — .game-frame 의 Pretendard 를 물려받는다 */}
			<h2
				className="mb-1 ps-lesson-title font-bold text-2xl"
				style={{ color: meta.color }}
			>
				{level}
			</h2>
			<p
				className="mb-6 ps-lesson-note text-[#7878A0] text-sm"
				style={{ fontFamily: "Pretendard, sans-serif" }}
			>
				현재 과와 이전 과에서 최대 {maxPerGame}문제가 랜덤 출제됩니다
			</p>
			<div className="space-y-3 ps-lesson-list">
				{lessonKeys.map((lesson) => {
					const entry = lessons[lesson];
					return (
						<button
							key={lesson}
							type="button"
							onClick={() => onPick(lesson)}
							className="ux-lesson-card ux-control flex w-full items-center justify-between rounded-xl p-4 text-left transition-all active:scale-95"
							style={{
								border: `2px solid ${meta.color}30`,
								background: `${meta.color}08`,
							}}
						>
							<div>
								<div
									className="mb-1 font-bold"
									style={{ fontFamily: "Pretendard, sans-serif" }}
								>
									{lesson}
								</div>
								<div className="flex flex-wrap gap-1">
									{entry.new_particles.map((p) => (
										<span
											key={p}
											className="rounded px-2 py-0.5 font-bold text-xs"
											style={{
												background: `${meta.color}25`,
												color: meta.color,
											}}
										>
											{p}
										</span>
									))}
								</div>
							</div>
							<div className="ml-4 shrink-0 text-right">
								{/* 목업은 이 숫자에도 Exo 2 를 쓰지 않는다 */}
								<div
									className="font-bold text-lg"
									style={{ color: meta.color }}
								>
									{Math.min(maxPerGame, cumCounts[lesson])}
								</div>
								<div className="text-[#7878A0] text-xs">랜덤 문제</div>
							</div>
						</button>
					);
				})}
				{lessonKeys.length === 0 && (
					<div className="py-12 text-center text-[#7878A0] text-sm">
						아직 등록된 문제가 없습니다.
					</div>
				)}
			</div>
		</div>
	);
}

export interface PsQuestion {
	sentence: string;
	answer: string;
	choices: string[];
	sourceLesson: string;
}

export interface PlayViewProps {
	question: PsQuestion;
	questionIndex: number;
	totalQuestions: number;
	hp: number;
	combo: number;
	score: number;
	timerProgress: number;
	picked: string | null;
	shotResult: "hit" | "miss" | null;
	onAnswer: (choice: string) => void;
	onBack: () => void;
}

/**
 * 조사 스나이퍼 플레이 — 확정 목업(screens_uiux 게임 절 · game__ps_play)의 과녁 구조다.
 * 예전 판은 문항이 위에서 아래로 떨어지고 바닥에 GROUND 선이 있었는데, 낙하는 남은
 * 시간을 그리는 한 가지 방법일 뿐이었다. 지금은 ps-timer 가 그 일을 하고, 조준·명중·
 * 빗나감이 과녁에서 일어난다.
 */
export function ParticleSniperPlayView({
	question,
	questionIndex,
	totalQuestions,
	hp,
	combo,
	score,
	timerProgress,
	picked,
	shotResult,
	onAnswer,
	onBack,
}: PlayViewProps) {
	// 목업의 상태 클래스 — 쏘면 is-shot 이 붙고 결과에 따라 is-hit / is-miss 가 따라온다
	const shot = shotResult !== null;
	const targetState = shot ? `is-shot is-${shotResult}` : "";
	const [before, after] = question.sentence.split("___");

	return (
		<div className="ps-game-shell">
			<div className="ps-game-hud">
				<div className="ps-hud-left">
					<button
						type="button"
						className="ps-back"
						aria-label="나가기"
						onClick={onBack}
					>
						←
					</button>
					<div className="ps-hearts" aria-label={`남은 기회 ${hp}개`}>
						{Array.from({ length: 5 }, (_, i) => (
							<span key={i} style={i < hp ? undefined : { opacity: 0.18 }}>
								♥
							</span>
						))}
					</div>
					{combo > 1 && <div className="ps-combo">{combo}×</div>}
				</div>
				<div>
					<div className="ps-score">{score.toLocaleString("ko-KR")}</div>
					<div className="ps-progress">
						{questionIndex + 1} / {totalQuestions}
					</div>
				</div>
			</div>

			{/* 낙하가 하던 일 — 남은 시간 */}
			<div
				className="ps-timer"
				aria-label={`남은 시간 ${Math.round(timerProgress)}%`}
			>
				<i style={{ width: `${timerProgress}%` }} />
			</div>

			<div className="ps-range">
				<div className={`ps-target-question ${targetState}`}>
					<div className="ps-target-head">
						<span className="ps-lock-state">
							<i />
							TARGET LOCK
						</span>
						<span className="ps-target-index">
							{String(questionIndex + 1).padStart(2, "0")}
						</span>
					</div>
					<div className="ps-reticle" aria-hidden="true">
						<i />
					</div>
					<div className="ps-lesson-pill">{question.sourceLesson}</div>
					<div className="ps-sentence">
						{before}
						<span className="ps-blank">
							<span className="ps-blank-value">{picked ?? "?"}</span>
							<span className="ps-impact" aria-hidden="true">
								<i />
							</span>
						</span>
						{after ?? ""}
					</div>
					{/*
					 * biome 은 role="status" 대신 <output> 을 쓰라고 한다. 보조기술에는
					 * 차이가 없다 — <output> 의 암묵 role 이 곧 status 다. 얻는 것이 없는데
					 * 목업(game__ps_play)이 div 라 갈라야 하고, <output> 은 기본이 inline
					 * 이라 배치도 흔들린다. 목업을 따른다.
					 */}
					{/* biome-ignore lint/a11y/useSemanticElements: role="status" 로 이미 같은 뜻이다 — 위 주석 */}
					<div className="ps-target-guide" role="status" aria-live="polite">
						<span>＋</span>
						<b>
							{!shot
								? "조사를 선택해 조준하세요"
								: shotResult === "hit"
									? "명중"
									: "빗나감"}
						</b>
					</div>
				</div>
			</div>

			<div className="ps-answer-tray" aria-label="조사 선택지">
				{question.choices.map((choice) => (
					<button
						key={choice}
						type="button"
						className={`ps-answer ${
							shot && choice === picked
								? shotResult === "hit"
									? "is-correct"
									: "is-wrong"
								: ""
						}`}
						{...(shot ? { "aria-pressed": choice === picked } : {})}
						onPointerDown={() => onAnswer(choice)}
						onClick={(e) => {
							if (e.detail === 0) onAnswer(choice);
						}}
					>
						{choice}
					</button>
				))}
			</div>
		</div>
	);
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
							// key 에 idx 를 넣는 이유 — 같은 문장을 두 번 틀릴 수 있어
							// 순서가 신원의 일부다. 문장만으로는 열쇠가 겹친다.
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
