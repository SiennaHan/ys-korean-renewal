import type { CardSortVocab } from "@/api/game-content";
import { ArrowLeft } from "lucide-react";

/**
 * 어휘 카드 마스터 — **표시만** 담당하는 화면들. 판을 굴리는 일은
 * card-sort.tsx 가 그대로 한다.
 *
 * 왜 갈랐나 — 목업 대조(scripts/activity-parity.tsx)가 화면마다 검사할 수 있게
 * 하려고. 통짜로 두면 정적으로 그릴 때 첫 화면(로딩)밖에 나오지 않는다.
 * game/particle-sniper-view.tsx 와 같은 꼴이다.
 */

export type Grade = "2급" | "3급" | "4급" | "5급";

export const GRADES: Grade[] = ["2급", "3급", "4급", "5급"];

export interface CardSortCard {
	word: string;
	category: string;
	grade: Grade;
	lesson: string;
	isRare: boolean;
}

/**
 * 급·과까지 누적된, 4단어 이상인 카테고리만 남긴다. 레벨 선택의 미리보기와
 * 실제 덱 구성(card-sort.tsx 의 startGame)이 같은 기준을 써야 하므로
 * 이 화면 모듈에 하나만 두고 앱이 가져다 쓴다.
 */
export function getCumulativeCategories(
	vocab: CardSortVocab,
	grade: Grade,
	upToLesson: number,
): Record<string, string[]> {
	const gradeData = vocab[grade];
	const result: Record<string, string[]> = {};
	if (!gradeData) return result;
	for (let i = 1; i <= upToLesson; i++) {
		const lessonKey = `${i}과`;
		const lesson = gradeData[lessonKey];
		if (!lesson) continue;
		for (const catName of lesson.new_categories) {
			const words = lesson[catName] as string[] | undefined;
			if (words && words.length >= 4) {
				result[catName] = words;
			}
		}
	}
	return result;
}

// ─── 레벨 선택 ──────────────────────────────────────────
export interface CardSortLevelViewProps {
	vocab: CardSortVocab;
	categoryColors: Record<string, string>;
	selectedGrade: Grade;
	selectedLesson: number;
	onGradeSelect: (grade: Grade) => void;
	onLessonSelect: (lesson: number) => void;
	onStart: () => void;
	onBack: () => void;
}

export function CardSortLevelView({
	vocab,
	categoryColors,
	selectedGrade,
	selectedLesson,
	onGradeSelect,
	onLessonSelect,
	onStart,
	onBack,
}: CardSortLevelViewProps) {
	const previewCategories = getCumulativeCategories(
		vocab,
		selectedGrade,
		selectedLesson,
	);
	const previewKeys = Object.keys(previewCategories).slice(0, 4);

	return (
		<div
			className="cs-level-shell"
			style={{
				position: "relative",
				zIndex: 5,
				height: "100%",
				display: "flex",
				flexDirection: "column",
				padding: "20px 16px",
				gap: 16,
			}}
		>
			{/* 뒤로가기 + 타이틀 */}
			<div
				className="cs-level-header"
				style={{
					display: "flex",
					alignItems: "center",
					gap: 10,
					paddingTop: 8,
				}}
			>
				<button
					type="button"
					className="cs-back ux-control"
					onClick={onBack}
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
				<div
					className="ux-title"
					style={{
						fontFamily: "'Exo 2', sans-serif",
						fontSize: 22,
						fontWeight: 900,
						background: "linear-gradient(90deg, #FFE500, #FF9E4A)",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
						letterSpacing: 1,
					}}
				>
					어휘 카드 마스터
				</div>
			</div>
			<div className="cs-level-subtitle" style={{ textAlign: "center" }}>
				{/* 목업이 문구도 바꾼다 — 무엇을 하는 게임인지 말해 준다 */}
				<div style={{ fontSize: 12, color: "#7878A0", marginTop: 4 }}>
					카드를 알맞은 카테고리로 분류해 보세요.
				</div>
			</div>

			{/* 목업은 급·과 섹션을 cs-config-panel 하나로 묶는다 */}
			<div className="cs-config-panel">
				{/* 급 선택 */}
				<div className="cs-grade-section">
					<div
						className="cs-section-label"
						style={{ fontSize: 12, color: "#7878A0", marginBottom: 8 }}
					>
						급 선택
					</div>
					<div style={{ display: "flex", gap: 8 }}>
						{GRADES.map((g) => (
							<button
								key={g}
								type="button"
								className={`cs-grade ux-control${selectedGrade === g ? " is-selected" : ""}`}
								onClick={() => onGradeSelect(g)}
								style={{
									flex: "1 1 0%",
									padding: "10px 0px",
									borderRadius: 10,
									border: `2px solid ${selectedGrade === g ? "#FFE500" : "#2a2a40"}`,
									background:
										selectedGrade === g
											? "rgba(255,229,0,0.15)"
											: "rgba(255,255,255,0.04)",
									color: selectedGrade === g ? "#FFE500" : "#7878A0",
									fontFamily: "'Pretendard', sans-serif",
									fontWeight: 700,
									fontSize: 15,
									cursor: "pointer",
									transition: "0.2s",
								}}
							>
								{g}
							</button>
						))}
					</div>
				</div>

				{/* 과 선택 */}
				<div className="cs-lesson-section" style={{ flex: "1 1 0%" }}>
					<div
						className="cs-section-label"
						style={{ fontSize: 12, color: "#7878A0", marginBottom: 8 }}
					>
						과 선택 —{" "}
						<span style={{ color: "#FFE500" }}>{selectedLesson}과까지</span>{" "}
						배운 카테고리 누적 출제
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(5, 1fr)",
							gap: 6,
						}}
					>
						{Array.from({ length: 15 }, (_, i) => i + 1).map((n) => {
							const lessonData = vocab[selectedGrade]?.[`${n}과`];
							const hasNew = (lessonData?.new_categories?.length ?? 0) > 0;
							const isSelected = n === selectedLesson;
							const isPast = n <= selectedLesson;

							return (
								<button
									key={n}
									type="button"
									className={`cs-lesson ux-control${isSelected ? " is-selected" : ""}${
										!isPast ? " is-locked" : ""
									}`}
									onClick={() => onLessonSelect(n)}
									style={{
										padding: "8px 4px",
										borderRadius: 8,
										border: `2px solid ${isSelected ? "#FFE500" : isPast ? "#2a2a60" : "#1a1a30"}`,
										background: isSelected
											? "rgba(255,229,0,0.15)"
											: isPast
												? "rgba(74,158,255,0.08)"
												: "rgba(255,255,255,0.03)",
										color: isSelected ? "#FFE500" : isPast ? "#aaa" : "#444",
										fontFamily: "'Exo 2', sans-serif",
										fontWeight: 700,
										fontSize: 13,
										cursor: "pointer",
										position: "relative",
									}}
								>
									{n}과
									{hasNew && (
										<span
											style={{
												position: "absolute",
												top: -4,
												right: -4,
												width: 8,
												height: 8,
												borderRadius: "50%",
												background: "#FFE500",
											}}
										/>
									)}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* 카테고리 미리보기 */}
			<div className="cs-preview-section">
				<div
					className="cs-section-label"
					style={{ fontSize: 12, color: "#7878A0", marginBottom: 8 }}
				>
					이번 라운드 카테고리 미리보기
				</div>
				<div
					className="cs-preview-row"
					style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
				>
					{previewKeys.length === 0 ? (
						<div style={{ fontSize: 13, color: "#444" }}>
							해당 과까지 카테고리 없음
						</div>
					) : (
						previewKeys.map((cat) => {
							const color = categoryColors[cat] ?? "#fff";
							return (
								<div
									key={cat}
									className="cs-preview-chip"
									style={{
										padding: "6px 12px",
										borderRadius: 8,
										border: `1.5px solid ${color}44`,
										background: `${color}11`,
										color,
										fontSize: 13,
										fontWeight: 600,
									}}
								>
									{cat}
								</div>
							);
						})
					)}
				</div>
			</div>

			{/* 시작 버튼 */}
			<button
				type="button"
				className="ux-primary ux-control"
				onClick={onStart}
				disabled={previewKeys.length === 0}
				style={{
					padding: "16px 0px",
					borderRadius: 14,
					border: "none",
					background:
						previewKeys.length === 0
							? "#2a2a40"
							: "linear-gradient(90deg, #FFE500, #FF9E4A)",
					color: previewKeys.length === 0 ? "#444" : "#000",
					fontFamily: "'Exo 2', sans-serif",
					fontWeight: 900,
					fontSize: 18,
					cursor: previewKeys.length === 0 ? "not-allowed" : "pointer",
					letterSpacing: 1,
				}}
			>
				START
			</button>
		</div>
	);
}

// ─── 인트로 ────────────────────────────────────────────
export interface CardSortIntroViewProps {
	activeCategories: string[];
	categoryColors: Record<string, string>;
	introCountdown: number;
}

export function CardSortIntroView({
	activeCategories,
	categoryColors,
	introCountdown,
}: CardSortIntroViewProps) {
	return (
		<div
			className="cs-intro-shell"
			style={{
				position: "relative",
				zIndex: 5,
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: 24,
				padding: "0px 24px",
			}}
		>
			{/* 목업은 인트로 내용을 cs-intro-panel 하나로 묶는다 */}
			<div className="cs-intro-panel">
				<div
					className="cs-intro-label"
					style={{ fontSize: 13, color: "#7878A0" }}
				>
					이번 라운드 카테고리
				</div>
				<div
					className="cs-intro-categories"
					style={{
						display: "flex",
						gap: 12,
						flexWrap: "wrap",
						justifyContent: "center",
					}}
				>
					{activeCategories.map((cat) => {
						const color = categoryColors[cat] ?? "#fff";
						return (
							<div
								key={cat}
								className="cs-intro-chip"
								style={{
									padding: "10px 20px",
									borderRadius: 12,
									border: `2px solid ${color}`,
									background: `${color}18`,
									color,
									fontSize: 16,
									fontWeight: 700,
									animation: "introScale 0.4s ease-out",
								}}
							>
								{cat}
							</div>
						);
					})}
				</div>
				<div
					className="cs-countdown"
					style={{
						fontFamily: "'Exo 2', sans-serif",
						fontSize: 64,
						fontWeight: 900,
						color: "#FFE500",
						animation: "introScale 0.3s ease-out",
					}}
				>
					{introCountdown === 0 ? "GO!" : introCountdown}
				</div>
			</div>
		</div>
	);
}

// ─── 게임플레이 ────────────────────────────────────────
export interface CardSortScorePopup {
	text: string;
	color: string;
	key: number;
}

export interface CardSortPlayViewProps {
	categoryColors: Record<string, string>;
	activeCategories: string[];
	currentCard: CardSortCard | undefined;
	cardIndex: number;
	deckLength: number;
	timeLeft: number;
	hp: number;
	combo: number;
	score: number;
	scorePopup: CardSortScorePopup | null;
	cardShake: boolean;
	cardDismiss: boolean;
	slotFlash: string | null;
	activeSlot: string | null;
	onSlotDown: (category: string) => void;
	onSlotUp: (category: string) => void;
	onSlotLeave: () => void;
	onAnswer: (category: string) => void;
	onFinish: () => void;
	onBack: () => void;
}

export function CardSortPlayView({
	categoryColors,
	activeCategories,
	currentCard,
	cardIndex,
	deckLength,
	timeLeft,
	hp,
	combo,
	score,
	scorePopup,
	cardShake,
	cardDismiss,
	slotFlash,
	activeSlot,
	onSlotDown,
	onSlotUp,
	onSlotLeave,
	onAnswer,
	onFinish,
	onBack,
}: CardSortPlayViewProps) {
	return (
		<div
			className="cs-play-shell"
			style={{
				position: "relative",
				zIndex: 5,
				height: "100%",
				display: "flex",
				flexDirection: "column",
				padding: "0px 0px 16px",
			}}
		>
			{/* 타이머 바 (상단) */}
			<div
				className="cs-time-track"
				style={{
					height: 4,
					background: "#1a1a30",
					position: "relative",
				}}
			>
				<div
					style={{
						height: "100%",
						width: `${(timeLeft / 60) * 100}%`,
						background:
							timeLeft <= 10
								? "#FF4060"
								: "linear-gradient(90deg, #FFE500, #FF9E4A)",
						transition: "width 1s linear, background 0.3s",
						animation: timeLeft <= 10 ? "pulse 0.5s infinite" : "none",
					}}
				/>
			</div>

			{/* HUD */}
			<div
				className="cs-hud"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "10px 16px",
				}}
			>
				{/* 뒤로가기 + HP */}
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<button
						type="button"
						className="cs-back ux-control"
						onClick={onBack}
						style={{
							width: 28,
							height: 28,
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
						<ArrowLeft size={16} color="rgba(255,255,255,0.7)" />
					</button>
					<div className="cs-life" style={{ display: "flex", gap: 4 }}>
						{Array.from({ length: 5 }, (_, i) => (
							<span
								key={i}
								style={{
									fontSize: 16,
									opacity: i < hp ? 1 : 0.2,
									filter: i < hp ? "drop-shadow(#FF4060 0px 0px 4px)" : "none",
									transition: "opacity 0.3s",
								}}
							>
								♥
							</span>
						))}
					</div>
				</div>

				{/* 콤보 */}
				<div
					style={{
						fontFamily: "'Exo 2', sans-serif",
						fontSize: 14,
						fontWeight: 700,
						color: combo >= 3 ? "#FFE500" : "#333",
						transition: "color 0.2s",
					}}
				>
					{combo >= 3 ? `×${combo} COMBO` : ""}
				</div>

				{/* 점수 */}
				<div
					className="cs-score"
					style={{
						fontFamily: "'Exo 2', sans-serif",
						fontSize: 18,
						fontWeight: 900,
						color: "#fff",
					}}
				>
					{score.toLocaleString()}
				</div>
			</div>

			{/* 타이머 숫자 */}
			<div
				className="cs-timer"
				style={{
					textAlign: "center",
					fontFamily: "'Exo 2', sans-serif",
					fontSize: 13,
					fontWeight: 700,
					color: timeLeft <= 10 ? "#FF4060" : "#7878A0",
					marginBottom: 8,
				}}
			>
				{timeLeft}s
			</div>

			{/* 활성 카드 영역 */}
			<div
				className="cs-card-stage"
				style={{
					flex: "1 1 0%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
				}}
			>
				{currentCard && cardIndex < deckLength ? (
					<div className="cs-card-stack" style={{ position: "relative" }}>
						{/* 점수/MISS 팝업 */}
						{scorePopup && (
							<div
								key={scorePopup.key}
								style={{
									position: "absolute",
									top: -24,
									left: "50%",
									transform: "translateX(-50%)",
									fontFamily: "'Exo 2', sans-serif",
									fontSize: scorePopup.text === "MISS" ? 26 : 22,
									fontWeight: 900,
									color: scorePopup.color,
									animation: "scoreAscend 0.8s ease-out forwards",
									pointerEvents: "none",
									zIndex: 20,
									whiteSpace: "nowrap",
									textShadow: `${scorePopup.color}88 0px 0px 12px`,
								}}
							>
								{scorePopup.text}
							</div>
						)}

						{/* 카드 */}
						<div
							className="cs-vocab-card"
							style={{
								width: 220,
								minHeight: 160,
								borderRadius: 16,
								border: currentCard.isRare
									? "2px solid transparent"
									: `2px solid ${`${categoryColors[currentCard.category] ?? "#fff"}66`}`,
								background: currentCard.isRare
									? "linear-gradient(135deg, #1a1a40, #2a1a30)"
									: "rgba(255,255,255,0.05)",
								backdropFilter: "blur(8px)",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: 12,
								padding: "24px 20px",
								animation: cardShake
									? "cardShake 0.4s ease-out"
									: cardDismiss
										? "cardDismiss 0.35s ease-in forwards"
										: "cardFloat 1.5s ease-in-out infinite",
								position: "relative",
								overflow: "hidden",
								boxShadow: currentCard.isRare
									? "rgba(180,74,255,0.3) 0px 0px 30px"
									: `${`${categoryColors[currentCard.category] ?? "#fff"}22`} 0px 0px 20px`,
							}}
						>
							{/* 홀로그램 레어 효과 */}
							{currentCard.isRare && (
								<div
									style={{
										position: "absolute",
										inset: 0,
										background:
											"linear-gradient(135deg, #4A9EFF33, #B44AFF33, #FF4AEC33, #FFE50033)",
										backgroundSize: "300% 300%",
										animation: "holographic 3s ease infinite",
										borderRadius: 14,
										pointerEvents: "none",
									}}
								/>
							)}

							{/* 레어 뱃지 */}
							{currentCard.isRare && (
								<div
									style={{
										position: "absolute",
										top: 8,
										right: 10,
										fontSize: 10,
										fontWeight: 700,
										fontFamily: "'Exo 2', sans-serif",
										color: "#FFE500",
										letterSpacing: 1,
									}}
								>
									✦ RARE
								</div>
							)}

							{/* 급/과 */}
							<div
								className="cs-card-meta"
								style={{
									fontSize: 11,
									color: "#7878A0",
									fontWeight: 600,
									letterSpacing: 1,
								}}
							>
								{currentCard.grade} · {currentCard.lesson}
							</div>

							{/* 단어 */}
							<div
								className="cs-card-word"
								style={{
									fontSize: 36,
									fontWeight: 700,
									letterSpacing: -1,
									textShadow: `${categoryColors[currentCard.category] ?? "#fff"}88 0px 0px 20px`,
								}}
							>
								{currentCard.word}
							</div>

							{/* 카드 번호 */}
							<div
								className="cs-card-count"
								style={{
									fontSize: 11,
									color: "#333",
									fontFamily: "'Exo 2', sans-serif",
								}}
							>
								{cardIndex + 1} / {deckLength}
							</div>
						</div>
					</div>
				) : (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 16,
						}}
					>
						<div style={{ color: "#7878A0", fontSize: 16 }}>
							모든 카드를 처리했어요!
						</div>
						<button
							type="button"
							onClick={onFinish}
							style={{
								padding: "14px 32px",
								borderRadius: 12,
								border: "none",
								background: "linear-gradient(90deg, #FFE500, #FF9E4A)",
								color: "#000",
								fontFamily: "'Exo 2', sans-serif",
								fontWeight: 900,
								fontSize: 16,
								cursor: "pointer",
							}}
						>
							결과 보기
						</button>
					</div>
				)}
			</div>

			{/* 덱 슬롯 */}
			<div
				className="cs-category-tray"
				style={{
					padding: "0px 12px",
					display: "grid",
					gridTemplateColumns: `repeat(${activeCategories.length}, 1fr)`,
					gap: 8,
				}}
			>
				{activeCategories.map((cat) => {
					const color = categoryColors[cat] ?? "#fff";
					const isFlashing = slotFlash === cat;
					const isPressed = activeSlot === cat;
					return (
						<button
							key={cat}
							type="button"
							className="ux-category ux-control"
							onPointerDown={() => onSlotDown(cat)}
							onPointerUp={() => onSlotUp(cat)}
							onPointerLeave={onSlotLeave}
							onClick={(e) => {
								if (e.detail === 0) onAnswer(cat);
							}}
							style={{
								padding: "14px 4px",
								borderRadius: 12,
								border: `2px solid ${isFlashing ? color : `${color}44`}`,
								background: isFlashing
									? `${color}22`
									: isPressed
										? `${color}18`
										: `${color}0a`,
								color: isFlashing || isPressed ? color : `${color}cc`,
								fontFamily: "'Pretendard', sans-serif",
								fontWeight: 700,
								fontSize: activeCategories.length >= 4 ? 11 : 13,
								cursor: "pointer",
								transition:
									"transform 0.1s, box-shadow 0.15s, background 0.15s",
								transform: isPressed ? "scale(0.95)" : "scale(1)",
								lineHeight: 1.3,
								minHeight: 64,
								boxShadow: isFlashing
									? `${color}55 0px 0px 20px`
									: isPressed
										? `${color}33 0px 0px 10px`
										: "none",
								wordBreak: "keep-all",
								textAlign: "center",
							}}
						>
							{cat}
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ─── 결과 화면 ─────────────────────────────────────────
function gradeLabel(accuracy: number): string {
	if (accuracy >= 0.9) return "S";
	if (accuracy >= 0.75) return "A";
	if (accuracy >= 0.6) return "B";
	return "C";
}

export interface CardSortResultStats {
	score: number;
	correct: number;
	total: number;
	maxCombo: number;
	rareCorrect: number;
	rareTotal: number;
}

export interface CardSortResultViewProps {
	selectedGrade: Grade;
	selectedLesson: number;
	stats: CardSortResultStats;
	bestScore: number | null;
	onRetry: () => void;
	onLevelSelect: () => void;
	onExit: () => void;
}

export function CardSortResultView({
	selectedGrade,
	selectedLesson,
	stats,
	bestScore,
	onRetry,
	onLevelSelect,
	onExit,
}: CardSortResultViewProps) {
	return (
		<div
			className="cs-result-shell"
			style={{
				position: "relative",
				zIndex: 5,
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "24px 20px",
				gap: 20,
			}}
		>
			{/* 목업은 등급·점수·스탯을 cs-result-panel 로, 등급·점수를 cs-result-hero 로 묶는다 */}
			<div className="cs-result-panel">
				<div className="cs-result-hero">
					{/* 등급 */}
					<div className="cs-rank">
						<div
							className="cs-grade"
							style={{
								fontFamily: "'Exo 2', sans-serif",
								fontSize: 80,
								fontWeight: 900,
								lineHeight: 1,
								background: "linear-gradient(135deg, #FFE500, #FF9E4A)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								textAlign: "center",
								filter: "drop-shadow(rgba(255,229,0,0.5) 0px 0px 20px)",
							}}
						>
							{gradeLabel(stats.total > 0 ? stats.correct / stats.total : 0)}
						</div>
						<div
							style={{
								textAlign: "center",
								fontSize: 12,
								color: "#7878A0",
								marginTop: 4,
							}}
						>
							{selectedGrade} · {selectedLesson}과까지
						</div>
					</div>

					{/* 점수 */}
					<div
						className="cs-score-block"
						style={{
							fontFamily: "'Exo 2', sans-serif",
							fontSize: 40,
							fontWeight: 900,
							color: "#fff",
							textAlign: "center",
						}}
					>
						{stats.score.toLocaleString()}
						<span style={{ fontSize: 16, color: "#7878A0", marginLeft: 4 }}>
							점
						</span>
						{/* 목업이 넣은 자리 — 최고 점수 */}
						{bestScore !== null && (
							<div className="cs-best-score">
								최고 점수 {bestScore.toLocaleString("ko-KR")}점
							</div>
						)}
					</div>
				</div>

				{/* 스탯 */}
				<div
					className="cs-stats"
					style={{
						width: "85%",
						maxWidth: 280,
						background: "rgba(255,255,255,0.04)",
						borderRadius: 16,
						padding: "16px 20px",
						display: "flex",
						flexDirection: "column",
						gap: 10,
					}}
				>
					{[
						[
							"정확도",
							`${stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%`,
						],
						// 목업이 정확도 다음에 끼워 넣는 행이다
						["맞힌 카드", `${stats.correct}장`],
						["최대 콤보", `×${stats.maxCombo}`],
						["처리 카드", `${stats.total}장`],
						["레어 카드", `${stats.rareCorrect} / ${stats.rareTotal}`],
					].map(([label, value]) => (
						<div
							key={label}
							className="cs-stat-row"
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<span style={{ fontSize: 14, color: "#7878A0" }}>{label}</span>
							<span
								style={{
									fontFamily: "'Exo 2', sans-serif",
									fontSize: 16,
									fontWeight: 700,
									color: "#fff",
								}}
							>
								{value}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* 버튼 */}
			<div
				className="cs-result-actions"
				style={{ display: "flex", gap: 12, width: "100%", maxWidth: 280 }}
			>
				<button
					type="button"
					className="ux-primary ux-control"
					onClick={onRetry}
					style={{
						flex: "1 1 0%",
						padding: "14px 0px",
						borderRadius: 12,
						border: "none",
						background: "linear-gradient(90deg, #FFE500, #FF9E4A)",
						color: "#000",
						fontFamily: "'Exo 2', sans-serif",
						fontWeight: 900,
						fontSize: 15,
						cursor: "pointer",
					}}
				>
					다시 도전
				</button>
				<button
					type="button"
					className="ux-secondary ux-control"
					onClick={onLevelSelect}
					style={{
						flex: "1 1 0%",
						padding: "14px 0px",
						borderRadius: 12,
						border: "2px solid #2a2a40",
						background: "transparent",
						color: "#7878A0",
						fontFamily: "'Exo 2', sans-serif",
						fontWeight: 700,
						fontSize: 15,
						cursor: "pointer",
					}}
				>
					레벨 선택
				</button>
			</div>
			<button
				type="button"
				className="ux-tertiary ux-control"
				onClick={onExit}
				style={{
					width: "100%",
					maxWidth: 280,
					padding: "12px 0px",
					borderRadius: 12,
					border: "none",
					background: "transparent",
					color: "#555",
					fontFamily: "'Pretendard', sans-serif",
					fontWeight: 600,
					fontSize: 13,
					cursor: "pointer",
				}}
			>
				나가기
			</button>
		</div>
	);
}
