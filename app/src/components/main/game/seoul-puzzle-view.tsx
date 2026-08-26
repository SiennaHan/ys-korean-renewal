import {
	C,
	type Location,
	MapSvg,
	type NavDir,
	type Puzzle,
	SP_KEYFRAMES_CSS,
	isUnlocked,
	resolveToken,
} from "@/components/main/game/seoul-puzzle";
import { ArrowLeft } from "lucide-react";
import type React from "react";

/**
 * 서울 퍼즐 — **표시만** 담당하는 화면들. 상태·로직(useState/useEffect/타이머)은
 * seoul-puzzle.tsx 가 그대로 한다.
 *
 * 왜 갈랐나 — 목업 대조(scripts/activity-parity.tsx)가 화면마다 검사할 수 있게
 * 하려고. particle-sniper.tsx ↔ particle-sniper-view.tsx 와 같은 꼴이다.
 *
 * `name` 화면(목업 대응 파일 없음)은 여기 없다 — seoul-puzzle.tsx 안에 그대로
 * 남아 있다. `MapSvg` · `C`(색 토큰) · `isUnlocked` · `resolveToken` 은
 * seoul-puzzle.tsx 의 공유 자원이라 그쪽에서 그대로 두고 여기서 import 만 한다.
 */

// ── 공유 상단 바 ──────────────────────────────────────────────────────────────
// map · entry · puzzle(그리고 손대지 않는 name) 화면이 그대로 반복해 쓰는
// 뒤로가기 · XP · "서울 여행" 바. seoul-puzzle.tsx 의 return 에서도 같이 쓴다.
export interface SpTravelHeaderProps {
	totalXp: number;
	onBack: () => void;
}

export function SpTravelHeader({ totalXp, onBack }: SpTravelHeaderProps) {
	return (
		<div
			className="ux-travel-header"
			style={{
				background: C.navy,
				padding: "10px 20px 8px",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexShrink: 0,
				zIndex: 10,
			}}
		>
			<button
				type="button"
				className="ux-control ux-top-back"
				onPointerDown={onBack}
				onClick={(e) => {
					if (e.detail === 0) onBack();
				}}
				style={{
					width: 28,
					height: 28,
					borderRadius: "50%",
					background: "rgba(255,255,255,.12)",
					border: "none",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
				}}
			>
				<ArrowLeft size={16} color="rgba(255,255,255,.85)" />
			</button>
			<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
				<span style={{ color: "#f0c060", fontSize: 11, fontWeight: 700 }}>
					{totalXp} XP
				</span>
				<span
					style={{
						color: "rgba(255,255,255,.55)",
						fontSize: 11,
						letterSpacing: ".4px",
					}}
				>
					서울 여행
				</span>
			</div>
		</div>
	);
}

// ── MAP ──────────────────────────────────────────────────────────────────────
const RIVER_MAIN =
	"M0,178 C25,174 50,181 80,176 C108,171 125,179 155,174 C178,169 200,176 228,171 C255,166 278,174 308,169 C332,165 358,171 390,168";

export interface SpMapViewProps {
	playerName: string;
	totalXp: number;
	completed: Set<string>;
	currentLoc: string | null;
	locations: Location[];
	navDir: NavDir;
	/** 장소 카드·지도 핀 탭 — 잠금 여부는 이 컴포넌트가 스스로 가린다 */
	onSelectLocation: (locId: string) => void;
}

export function SpMapView({
	playerName,
	totalXp,
	completed,
	currentLoc,
	locations,
	navDir,
	onSelectLocation,
}: SpMapViewProps) {
	return (
		<div
			className="scrollbar-hide"
			style={{
				flex: "1 1 0%",
				display: "flex",
				flexDirection: "column",
				overflowY: "auto",
				animation:
					navDir === "forward"
						? "sp-slideUp .28s ease both"
						: "sp-slideDown .28s ease both",
			}}
		>
			{/* Header */}
			<div
				className="ux-travel-header"
				style={{ background: C.navy, padding: "14px 20px 16px", flexShrink: 0 }}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 12,
					}}
				>
					<div
						style={{
							color: "#fff",
							fontSize: 17,
							fontWeight: 700,
							letterSpacing: "-.3px",
						}}
					>
						{playerName} 씨의 서울 여행 🗺️
					</div>
					<div
						style={{
							background: "rgba(255,255,255,.1)",
							border: "1px solid rgba(255,255,255,.15)",
							borderRadius: 20,
							padding: "5px 12px",
							color: "#f0c060",
							fontSize: 12,
							fontWeight: 700,
						}}
					>
						{totalXp} XP
					</div>
				</div>
				<div style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>
					{completed.size} / 10 장소 완료
				</div>
			</div>

			{/* SVG Map */}
			<div
				className="ux-seoul-map"
				style={{
					height: 240,
					flexShrink: 0,
					overflow: "hidden",
					background: "#e4eef6",
					position: "relative",
				}}
			>
				<MapSvg
					viewBox="50 22 280 170"
					height={240}
					completed={completed}
					currentLoc={currentLoc}
					riverPath={RIVER_MAIN}
					showAllLines={true}
					locations={locations}
					onPinTap={(locId) => onSelectLocation(locId)}
				/>
			</div>

			{/* Location list */}
			<div
				style={{
					padding: "16px 16px 24px",
					display: "flex",
					flexDirection: "column",
					gap: 10,
				}}
			>
				{locations.map((l) => {
					const isDone = completed.has(l.id);
					const unlocked = isUnlocked(locations, l.id, completed);
					const isActive = !isDone && unlocked;
					const isLocked = !isDone && !unlocked;
					const stateClass = isDone ? "done" : isActive ? "active" : "locked";
					const statusText = isDone
						? "복습하기 →"
						: isActive
							? "도전 가능"
							: "잠금";
					return (
						/*
						 * 장소 카드가 이 게임에서 장소로 들어가는 **유일한 경로**다.
						 * 지도 핀도 눌리지만 SVG <g> 라 초점을 못 받는다 — 그래서 이 카드가
						 * div 였을 때 게임 전체가 키보드로 닿지 않았다. 목업도 div 였는데
						 * 목업 쪽을 고쳤다(app/src/screens_ref/game__sp_map.html · TWIN_ALLOW).
						 * 잠긴 장소는 disabled 로 막는다 — CSS 의 pointer-events:none 만으로는
						 * 버튼이 여전히 초점을 받아 "누를 수 있는 것처럼" 읽힌다.
						 */
						<button
							type="button"
							key={l.id}
							className={`sp-loc-card ${stateClass}`}
							disabled={isLocked}
							onPointerDown={
								!isLocked ? () => onSelectLocation(l.id) : undefined
							}
							onClick={
								!isLocked
									? (e) => {
											if (e.detail === 0) onSelectLocation(l.id);
										}
									: undefined
							}
						>
							<div
								style={{
									width: 36,
									height: 36,
									borderRadius: "50%",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: 13,
									fontWeight: 700,
									flexShrink: 0,
									background: isDone ? C.tealL : isActive ? C.redL : C.bg,
									color: isDone ? C.teal : isActive ? C.red : C.text3,
								}}
							>
								{l.num}
							</div>
							<div style={{ flex: "1 1 0%" }}>
								<div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
									{l.name}
								</div>
								<div style={{ fontSize: 11.5, color: C.text2, marginTop: 2 }}>
									{l.desc}
								</div>
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: 4,
										marginTop: 6,
									}}
								>
									<span
										style={{
											fontSize: 10,
											fontWeight: 600,
											padding: "2px 7px",
											borderRadius: 20,
											background: "#eef2ff",
											color: "#3730a3",
											border: "1px solid rgba(99,102,241,.2)",
										}}
									>
										연세 1권 {l.unit}
									</span>
									{l.grammar.map((g) => (
										<span
											key={g}
											style={{
												fontSize: 10,
												fontWeight: 600,
												padding: "2px 7px",
												borderRadius: 20,
												background: C.amberL,
												color: "#92400e",
												border: "1px solid rgba(245,158,11,.2)",
											}}
										>
											{g}
										</span>
									))}
								</div>
							</div>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									flexShrink: 0,
									color: isDone ? C.teal : isActive ? C.red : C.text3,
								}}
							>
								{statusText}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ── ENTRY ────────────────────────────────────────────────────────────────────
const RIVER_ENTRY =
	"M0,118 C25,114 50,121 80,116 C108,111 125,119 155,114 C178,109 200,116 228,111 C255,106 278,114 308,109 C332,105 358,111 390,108";

export interface SpEntryViewProps {
	loc: Location;
	playerName: string;
	completed: Set<string>;
	currentLoc: string | null;
	locations: Location[];
	/** 이 장소의 퍼즐들이 가르치는 문법 — 중복은 부모가 이미 걸러서 넘긴다 */
	grammars: string[];
	navDir: NavDir;
	onMapBack: () => void;
	onStart: () => void;
}

export function SpEntryView({
	loc,
	playerName,
	completed,
	currentLoc,
	locations,
	grammars,
	navDir,
	onMapBack,
	onStart,
}: SpEntryViewProps) {
	return (
		<div
			style={{
				flex: "1 1 0%",
				display: "flex",
				flexDirection: "column",
				background: C.bg,
				overflow: "hidden",
				animation:
					navDir === "forward"
						? "sp-slideUp .28s ease both"
						: "sp-slideDown .28s ease both",
			}}
		>
			{/* Scrollable area */}
			<div
				className="scrollbar-hide"
				style={{ flex: "1 1 0%", overflowY: "auto" }}
			>
				{/* Mini map */}
				<div
					className="ux-seoul-map"
					style={{
						height: 160,
						flexShrink: 0,
						overflow: "hidden",
						background: "#e4eef6",
						position: "relative",
					}}
				>
					<div style={{ pointerEvents: "none", width: "100%", height: "100%" }}>
						<MapSvg
							viewBox="65 5 270 112"
							height={160}
							completed={completed}
							currentLoc={currentLoc}
							riverPath={RIVER_ENTRY}
							locations={locations}
						/>
					</div>
					<button
						type="button"
						className="ux-control ux-map-nav"
						onPointerDown={onMapBack}
						onClick={(e) => {
							if (e.detail === 0) onMapBack();
						}}
						style={{
							position: "absolute",
							top: 10,
							left: 12,
							background: "rgba(255,255,255,.88)",
							border: "0.5px solid rgba(0,0,0,.1)",
							borderRadius: 20,
							padding: "5px 12px 5px 8px",
							fontSize: 12,
							fontWeight: 600,
							color: C.navy,
							cursor: "pointer",
							fontFamily: "inherit",
							backdropFilter: "blur(4px)",
							display: "flex",
							alignItems: "center",
							gap: 3,
							zIndex: 10,
						}}
					>
						← 지도
					</button>
				</div>

				{/* Body */}
				<div
					style={{
						padding: "20px 20px 16px",
						display: "flex",
						flexDirection: "column",
						gap: 14,
					}}
				>
					{/* Place header */}
					<div style={{ animation: "sp-fadeUp .22s ease both" }}>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<div
								style={{
									width: 28,
									height: 28,
									borderRadius: "50%",
									background: C.redL,
									color: C.red,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: 11,
									fontWeight: 700,
									flexShrink: 0,
								}}
							>
								{loc.num}
							</div>
							<div>
								<div
									style={{
										fontSize: 20,
										fontWeight: 700,
										letterSpacing: "-.5px",
										color: C.text,
									}}
								>
									{loc.name}
								</div>
								<div style={{ fontSize: 13, color: C.text2, marginTop: 3 }}>
									{loc.desc}
								</div>
							</div>
						</div>
					</div>

					{/* Entry chat */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 10,
							animation: "sp-fadeUp .22s ease both",
						}}
					>
						{loc.entryMessages.map((m, i) => {
							const txt = resolveToken(m.text, playerName);
							if (m.type === "friend") {
								return (
									<div
										key={i}
										style={{
											display: "flex",
											gap: 8,
											alignItems: "flex-start",
										}}
									>
										<div
											style={{
												width: 28,
												height: 28,
												borderRadius: "50%",
												background: C.navy,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: 10,
												fontWeight: 700,
												color: "rgba(255,255,255,.75)",
												flexShrink: 0,
											}}
										>
											친
										</div>
										<div
											style={{
												background: "#f0f2f5",
												borderRadius: "14px 14px 14px 4px",
												padding: "10px 13px",
												fontSize: 13.5,
												lineHeight: 1.55,
												color: C.text,
												maxWidth: 240,
											}}
											dangerouslySetInnerHTML={{ __html: txt }}
										/>
									</div>
								);
							}
							return (
								<div
									key={i}
									style={{ display: "flex", justifyContent: "flex-end" }}
								>
									<div
										className="ux-travel-header"
										style={{
											background: C.navy,
											borderRadius: "14px 14px 4px",
											padding: "10px 13px",
											fontSize: 13.5,
											lineHeight: 1.55,
											color: "#fff",
											maxWidth: 240,
										}}
									>
										{txt}
									</div>
								</div>
							);
						})}
					</div>

					{/* Grammar preview */}
					<div
						style={{
							background: C.surf,
							borderRadius: 14,
							border: `1px solid ${C.bdr}`,
							padding: "14px 16px",
							animation: "sp-fadeUp .22s ease both",
						}}
					>
						<div
							style={{
								fontSize: 10,
								fontWeight: 700,
								letterSpacing: ".8px",
								textTransform: "uppercase",
								color: C.text3,
								marginBottom: 10,
							}}
						>
							이번 장소에서 배울 문법
						</div>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
							{grammars.map((g) => (
								<div
									key={g}
									style={{
										background: C.amberL,
										color: "#92400e",
										fontSize: 12,
										fontWeight: 600,
										padding: "5px 12px",
										borderRadius: 20,
										border: "1px solid rgba(245,158,11,.25)",
									}}
								>
									{g}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Start button — fixed at bottom */}
			<div
				style={{
					paddingTop: "12px",
					paddingRight: "20px",
					paddingBottom: "max(16px, env(safe-area-inset-bottom))",
					paddingLeft: "20px",
					flexShrink: 0,
					background: C.bg,
					borderTop: `1px solid ${C.bdr}`,
				}}
			>
				<button
					type="button"
					className="ux-control ux-primary"
					onPointerDown={onStart}
					onClick={(e) => {
						if (e.detail === 0) onStart();
					}}
					style={{
						width: "100%",
						padding: 15,
						background: C.navy,
						color: "#fff",
						border: "none",
						borderRadius: 14,
						fontFamily: "inherit",
						fontSize: 15,
						fontWeight: 700,
						cursor: "pointer",
						letterSpacing: "-.2px",
					}}
				>
					시작하기 →
				</button>
			</div>
		</div>
	);
}

// ── PUZZLE ───────────────────────────────────────────────────────────────────
const RIVER_PUZZLE =
	"M0,100 C25,96 50,103 80,98 C108,93 125,101 155,96 C178,91 200,98 228,93 C255,88 278,96 308,91 C332,87 358,93 390,90";

export interface SpPuzzleViewProps {
	loc: Location;
	totalXp: number;
	streak: number;
	puzzleIdx: number;
	totalPuzzles: number;
	/** playerName 이 이미 반영된, 표시용으로 다 풀어 놓은 문제 */
	resolvedPuzzle: Puzzle;
	slotWords: string[];
	shuffledChips: string[];
	trayUsed: Set<number>;
	answered: "correct" | "wrong" | null;
	hintsLeft: number;
	grammarOpen: boolean;
	transVisible: Set<number>;
	completed: Set<string>;
	currentLoc: string | null;
	locations: Location[];
	navDir: NavDir;
	scrollAreaRef: React.RefObject<HTMLDivElement>;
	onMapBack: () => void;
	onToggleGrammar: () => void;
	onToggleTrans: (idx: number) => void;
	onTapTray: (index: number) => void;
	onRemoveSlot: (i: number) => void;
	onUseHint: () => void;
	onCheckAnswer: () => void;
	onRetry: () => void;
	onNext: () => void;
}

export function SpPuzzleView({
	loc,
	totalXp,
	streak,
	puzzleIdx,
	totalPuzzles,
	resolvedPuzzle,
	slotWords,
	shuffledChips,
	trayUsed,
	answered,
	hintsLeft,
	grammarOpen,
	transVisible,
	completed,
	currentLoc,
	locations,
	navDir,
	scrollAreaRef,
	onMapBack,
	onToggleGrammar,
	onToggleTrans,
	onTapTray,
	onRemoveSlot,
	onUseHint,
	onCheckAnswer,
	onRetry,
	onNext,
}: SpPuzzleViewProps) {
	return (
		<div
			style={{
				flex: "1 1 0%",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				animation:
					navDir === "forward"
						? "sp-slideUp .28s ease both"
						: "sp-slideDown .28s ease both",
			}}
		>
			{/* Mini map */}
			<div
				className="ux-seoul-map"
				style={{
					height: 140,
					flexShrink: 0,
					overflow: "hidden",
					background: "#e4eef6",
					position: "relative",
				}}
			>
				<div style={{ pointerEvents: "none", width: "100%", height: "100%" }}>
					<MapSvg
						viewBox="65 5 270 98"
						height={140}
						completed={completed}
						currentLoc={currentLoc}
						riverPath={RIVER_PUZZLE}
						locations={locations}
					/>
				</div>
				<button
					type="button"
					className="ux-control ux-map-nav"
					onPointerDown={onMapBack}
					onClick={(e) => {
						if (e.detail === 0) onMapBack();
					}}
					style={{
						position: "absolute",
						top: 10,
						left: 12,
						background: "rgba(255,255,255,.88)",
						border: "0.5px solid rgba(0,0,0,.1)",
						borderRadius: 20,
						padding: "5px 12px 5px 8px",
						fontSize: 12,
						fontWeight: 600,
						color: C.navy,
						cursor: "pointer",
						fontFamily: "inherit",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						gap: 3,
						zIndex: 10,
					}}
				>
					← 장소 정보
				</button>
			</div>

			{/* Stage bar */}
			<div
				style={{
					background: C.surf,
					borderBottom: `1px solid ${C.bdr}`,
					padding: "9px 16px 7px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexShrink: 0,
				}}
			>
				<div>
					<div
						style={{
							fontSize: 13,
							fontWeight: 600,
							color: C.text,
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
					>
						{loc.num}번째 장소 — {loc.name}
						{streak >= 2 && (
							<span
								style={{
									fontSize: 11,
									fontWeight: 700,
									color: C.red,
									animation: "sp-streakPop .4s ease",
								}}
							>
								🔥{streak}연속
							</span>
						)}
					</div>
					<div style={{ fontSize: 11, color: C.text2, marginTop: 1 }}>
						{loc.desc}
					</div>
				</div>
				<div
					style={{
						background: C.amberL,
						color: "#92400e",
						fontSize: 11,
						fontWeight: 700,
						padding: "4px 10px",
						borderRadius: 20,
						border: "1px solid rgba(245,158,11,.25)",
						whiteSpace: "nowrap",
					}}
				>
					{totalXp} XP
				</div>
			</div>

			{/* Progress segments */}
			<div
				style={{
					display: "flex",
					gap: 3,
					padding: "0px 16px 8px",
					background: C.surf,
					flexShrink: 0,
				}}
			>
				{Array.from({ length: totalPuzzles }, (_, i) => (
					<div
						key={i}
						style={{
							flex: "1 1 0%",
							height: 3,
							borderRadius: 2,
							background:
								i < puzzleIdx ? C.teal : i === puzzleIdx ? C.navy : C.bdr,
							transition: "background .4s",
						}}
					/>
				))}
			</div>

			{/* Scroll area */}
			<div
				ref={scrollAreaRef}
				className="scrollbar-hide"
				style={{
					flex: "1 1 0%",
					overflowY: "auto",
					padding: "12px 14px 0px",
					display: "flex",
					flexDirection: "column",
					gap: 10,
				}}
			>
				{/* Bubble 0: friendMsg */}
				<ChatBubble
					type="friend"
					text={resolvedPuzzle.friendMsg}
					translation={resolvedPuzzle.friendMsgT}
					idx={0}
					transVisible={transVisible}
					toggleTrans={onToggleTrans}
				/>
				{/* Bubble 1: selfMsg (if any) */}
				{resolvedPuzzle.selfMsg && (
					<ChatBubble
						type="self"
						text={resolvedPuzzle.selfMsg}
						translation={resolvedPuzzle.selfMsgT || ""}
						idx={1}
						transVisible={transVisible}
						toggleTrans={onToggleTrans}
					/>
				)}
				{/* Bubble 2: friendMsg2 (if any) */}
				{resolvedPuzzle.friendMsg2 && (
					<ChatBubble
						type="friend"
						text={resolvedPuzzle.friendMsg2}
						translation={resolvedPuzzle.friendMsg2T || ""}
						idx={2}
						transVisible={transVisible}
						toggleTrans={onToggleTrans}
					/>
				)}

				{/* Puzzle card */}
				<div
					style={{
						background: C.surf,
						borderRadius: 14,
						border: `1px solid ${C.bdr}`,
						overflow: "hidden",
						flexShrink: 0,
						animation: "sp-fadeUp .22s ease both",
					}}
				>
					{/* Card header */}
					<div
						style={{
							padding: "9px 13px 7px",
							borderBottom: `1px solid ${C.bdr}`,
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<span
							style={{
								fontSize: 10,
								fontWeight: 700,
								color: C.text3,
								letterSpacing: ".8px",
								textTransform: "uppercase",
							}}
						>
							문장 완성하기
						</span>
						<button
							type="button"
							className="ux-control"
							onPointerDown={onToggleGrammar}
							onClick={(e) => {
								if (e.detail === 0) onToggleGrammar();
							}}
							style={{
								background: C.amberL,
								color: "#92400e",
								fontSize: 10,
								fontWeight: 700,
								padding: "2px 8px",
								borderRadius: 20,
								border: "1px solid rgba(245,158,11,.2)",
								cursor: "pointer",
								fontFamily: "inherit",
							}}
						>
							{resolvedPuzzle.grammar} {grammarOpen ? "▾" : "▸"}
						</button>
					</div>
					<div
						style={{ fontSize: 11.5, color: C.text2, padding: "7px 13px 0px" }}
					>
						{resolvedPuzzle.hintText}
					</div>
					{/* Slot area */}
					<div style={{ padding: "7px 10px 10px" }}>
						<div
							style={{
								minHeight: 44,
								border: `1.5px dashed ${answered === "correct" ? C.teal : answered === "wrong" ? C.red : C.bdr}`,
								borderRadius: 10,
								padding: "6px 8px",
								display: "flex",
								flexWrap: "wrap",
								gap: 5,
								alignItems: "center",
								background:
									answered === "correct"
										? C.tealL
										: answered === "wrong"
											? C.redL
											: C.bg,
								transition: "border-color .25s, background .25s",
							}}
						>
							{slotWords.length === 0 ? (
								<span
									style={{ fontSize: 12, color: C.text3, padding: "2px 4px" }}
								>
									카드를 탭해서 여기에 놓으세요
								</span>
							) : (
								slotWords.map((w, i) => {
									const isCorrectPos =
										answered && resolvedPuzzle.answer[i] === w;
									const isMisplaced =
										answered === "wrong" &&
										resolvedPuzzle.answer[i] !== w &&
										resolvedPuzzle.answer.includes(w);
									const isWrongPos =
										answered === "wrong" &&
										resolvedPuzzle.answer[i] !== w &&
										!resolvedPuzzle.answer.includes(w);
									return (
										<button
											key={i}
											type="button"
											className={`sp-chip-slot ux-control${answered === "correct" ? " cor" : isWrongPos ? " wrg" : isCorrectPos ? " cor" : ""}`}
											onPointerDown={() => onRemoveSlot(i)}
											onClick={(e) => {
												if (e.detail === 0) onRemoveSlot(i);
											}}
											style={{
												padding: "6px 12px",
												borderRadius: 20,
												fontSize: 13,
												fontWeight: 500,
												cursor: "pointer",
												fontFamily: "inherit",
												whiteSpace: "nowrap",
												border: "none",
												background:
													answered === "correct"
														? C.teal
														: isWrongPos
															? "#fdf0f0"
															: isMisplaced
																? "#fef3c7"
																: isCorrectPos
																	? C.teal
																	: C.navy,
												color:
													answered === "correct"
														? "#fff"
														: isWrongPos
															? C.red
															: isMisplaced
																? "#92400e"
																: "#fff",
												textDecoration: isWrongPos ? "line-through" : "none",
												animation:
													answered === "correct"
														? "sp-chipBounce .3s ease"
														: answered === "wrong" && isWrongPos
															? "sp-chipShake .35s ease"
															: undefined,
											}}
										>
											{w}
										</button>
									);
								})
							)}
						</div>
					</div>
					{/* Grammar tip (expandable) */}
					{grammarOpen && (
						<div style={{ padding: "0px 13px 12px" }}>
							<div
								style={{
									fontSize: 12,
									color: C.text2,
									background: "rgba(255,255,255,.75)",
									borderRadius: 8,
									padding: "7px 9px",
									lineHeight: 1.65,
								}}
								dangerouslySetInnerHTML={{ __html: resolvedPuzzle.tip }}
							/>
						</div>
					)}
				</div>

				{/* Answer result bubble */}
				{answered && (
					<div
						style={{
							display: "flex",
							gap: 8,
							alignItems: "flex-end",
							animation: "sp-fadeUp .22s ease both",
						}}
					>
						<div
							style={{
								width: 28,
								height: 28,
								borderRadius: "50%",
								background: C.navy,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 10,
								fontWeight: 700,
								color: "rgba(255,255,255,.75)",
								flexShrink: 0,
							}}
						>
							친
						</div>
						{answered === "correct" ? (
							<div
								style={{
									background: C.tealL,
									border: "1px solid #7ecfc3",
									borderRadius: "14px 14px 14px 4px",
									padding: "10px 13px",
									fontSize: 13,
									lineHeight: 1.6,
									color: C.text,
									maxWidth: 260,
								}}
							>
								<div
									style={{
										fontSize: 12,
										fontWeight: 700,
										color: C.teal,
										marginBottom: 4,
									}}
								>
									잘했어요! 👍
								</div>
								<div
									style={{
										fontSize: 12,
										color: C.text2,
										background: "rgba(255,255,255,.75)",
										borderRadius: 8,
										padding: "7px 9px",
										lineHeight: 1.65,
									}}
									dangerouslySetInnerHTML={{ __html: resolvedPuzzle.tip }}
								/>
							</div>
						) : (
							<div
								style={{
									background: C.redL,
									border: "1px solid #f0a8a8",
									borderRadius: "14px 14px 14px 4px",
									padding: "10px 13px",
									fontSize: 13,
									lineHeight: 1.6,
									color: C.text,
									maxWidth: 260,
								}}
							>
								<div
									style={{
										fontSize: 12,
										fontWeight: 700,
										color: C.red,
										marginBottom: 4,
									}}
								>
									다시 확인해봐요
								</div>
								<div
									style={{
										fontSize: 13,
										fontWeight: 600,
										color: C.teal,
										fontFamily: "inherit",
										marginBottom: 6,
									}}
								>
									{resolvedPuzzle.answer.join(" ")}
								</div>
								<div
									style={{
										fontSize: 12,
										color: C.text2,
										background: "rgba(255,255,255,.75)",
										borderRadius: 8,
										padding: "7px 9px",
										lineHeight: 1.65,
									}}
									dangerouslySetInnerHTML={{ __html: resolvedPuzzle.tip }}
								/>
							</div>
						)}
					</div>
				)}

				<div style={{ height: 8, flexShrink: 0 }} />

				{/* Tray — sticky inside scroll area */}
				<div style={{ position: "sticky", bottom: "0px", zIndex: 5 }}>
					<div
						style={{
							background: "rgba(255,255,255,.4)",
							backdropFilter: "blur(4px)",
							borderTop: `1px solid ${C.bdr}`,
							padding: "10px 14px 12px",
						}}
					>
						<div
							style={{
								fontSize: 10,
								fontWeight: 700,
								color: C.text3,
								letterSpacing: ".6px",
								marginBottom: 8,
							}}
						>
							순서대로 클릭하세요
						</div>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
							{shuffledChips.map((chip, i) => (
								<button
									key={i}
									type="button"
									className={`sp-chip-tray ux-control${trayUsed.has(i) ? " used" : ""}`}
									onPointerDown={() => onTapTray(i)}
									onClick={(e) => {
										if (e.detail === 0) onTapTray(i);
									}}
									style={{
										padding: "6px 12px",
										borderRadius: 20,
										fontSize: 13,
										fontWeight: 500,
										cursor: "pointer",
										fontFamily: "inherit",
										whiteSpace: "nowrap",
										userSelect: "none",
									}}
								>
									{chip}
								</button>
							))}
						</div>
					</div>

					{/* Button bar */}
					<div
						style={{
							background: C.surf,
							borderTop: `1px solid ${C.bdr}`,
							paddingTop: "10px",
							paddingRight: "14px",
							paddingBottom: "max(14px, env(safe-area-inset-bottom))",
							paddingLeft: "14px",
							display: "flex",
							gap: 8,
						}}
					>
						{answered === null && (
							<>
								<button
									type="button"
									className="ux-control ux-secondary"
									disabled={hintsLeft === 0}
									onPointerDown={onUseHint}
									onClick={(e) => {
										if (e.detail === 0) onUseHint();
									}}
									style={{
										flex: "1 1 0%",
										background: C.bg,
										color: C.text2,
										border: `1.5px solid ${C.bdr}`,
										borderRadius: 12,
										fontFamily: "inherit",
										fontSize: 13,
										fontWeight: 600,
										cursor: hintsLeft > 0 ? "pointer" : "default",
										padding: 13,
										opacity: hintsLeft === 0 ? 0.35 : 1,
									}}
								>
									힌트 ({hintsLeft})
								</button>
								<button
									type="button"
									className="ux-control ux-primary"
									disabled={slotWords.length === 0}
									onPointerDown={onCheckAnswer}
									onClick={(e) => {
										if (e.detail === 0) onCheckAnswer();
									}}
									style={{
										flex: "2 1 0%",
										background: slotWords.length > 0 ? C.navy : `${C.navy}4d`,
										color: "#fff",
										border: "none",
										borderRadius: 12,
										fontFamily: "inherit",
										fontSize: 14,
										fontWeight: 600,
										cursor: slotWords.length > 0 ? "pointer" : "default",
										padding: 13,
									}}
								>
									확인하기
								</button>
							</>
						)}
						{answered === "correct" && (
							<button
								type="button"
								className="ux-control ux-primary"
								onPointerDown={onNext}
								onClick={(e) => {
									if (e.detail === 0) onNext();
								}}
								style={{
									flex: "1 1 0%",
									background: C.teal,
									color: "#fff",
									border: "none",
									borderRadius: 12,
									fontFamily: "inherit",
									fontSize: 14,
									fontWeight: 600,
									cursor: "pointer",
									padding: 13,
								}}
							>
								다음 문장 →
							</button>
						)}
						{answered === "wrong" && (
							<>
								<button
									type="button"
									className="ux-control ux-secondary"
									onPointerDown={onRetry}
									onClick={(e) => {
										if (e.detail === 0) onRetry();
									}}
									style={{
										flex: "1 1 0%",
										background: C.bg,
										color: C.text2,
										border: `1.5px solid ${C.bdr}`,
										borderRadius: 12,
										fontFamily: "inherit",
										fontSize: 13,
										fontWeight: 600,
										cursor: "pointer",
										padding: 13,
									}}
								>
									다시 풀기
								</button>
								<button
									type="button"
									className="ux-control ux-primary"
									onPointerDown={onNext}
									onClick={(e) => {
										if (e.detail === 0) onNext();
									}}
									style={{
										flex: "1 1 0%",
										background: C.teal,
										color: "#fff",
										border: "none",
										borderRadius: 12,
										fontFamily: "inherit",
										fontSize: 14,
										fontWeight: 600,
										cursor: "pointer",
										padding: 13,
									}}
								>
									다음으로 →
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Chat Bubble Sub-component (puzzle 화면 전용) ──────────────────────────────
interface ChatBubbleProps {
	type: "friend" | "self";
	text: string;
	translation: string;
	idx: number;
	transVisible: Set<number>;
	toggleTrans: (idx: number) => void;
}

function ChatBubble({
	type,
	text,
	translation,
	idx,
	transVisible,
	toggleTrans,
}: ChatBubbleProps) {
	const bubbleC = {
		navy: "#16213e",
		bg2: "#f0f2f5",
		text: "#111827",
	};
	const showTrans = transVisible.has(idx);

	const inner = (
		<div>
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 6,
				}}
			>
				<span style={{ flex: "1 1 0%" }}>{text}</span>
				{translation && (
					<button
						type="button"
						className="ux-control"
						onPointerDown={() => toggleTrans(idx)}
						onClick={(e) => {
							if (e.detail === 0) toggleTrans(idx);
						}}
						style={{
							flexShrink: 0,
							background: "none",
							border: "none",
							padding: "0px",
							fontSize: 12,
							cursor: "pointer",
							opacity: showTrans ? 1 : 0.35,
							lineHeight: 1,
							marginTop: 1,
						}}
					>
						🌐
					</button>
				)}
			</div>
			{showTrans && translation && (
				<div
					style={{
						borderTop:
							type === "friend"
								? "1px solid rgba(0,0,0,.08)"
								: "1px solid rgba(255,255,255,.18)",
						marginTop: 6,
						paddingTop: 6,
						fontSize: 11.5,
						lineHeight: 1.5,
						color:
							type === "friend" ? "rgba(0,0,0,.42)" : "rgba(255,255,255,.55)",
					}}
				>
					{translation}
				</div>
			)}
		</div>
	);

	if (type === "friend") {
		return (
			<div
				style={{
					display: "flex",
					gap: 8,
					alignItems: "flex-start",
					animation: "sp-fadeUp .22s ease both",
				}}
			>
				<div
					style={{
						width: 28,
						height: 28,
						borderRadius: "50%",
						background: bubbleC.navy,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 10,
						fontWeight: 700,
						color: "rgba(255,255,255,.75)",
						flexShrink: 0,
					}}
				>
					친
				</div>
				<div style={{ maxWidth: 240 }}>
					<div
						style={{
							background: bubbleC.bg2,
							borderRadius: "14px 14px 14px 4px",
							padding: "10px 13px",
							fontSize: 13.5,
							lineHeight: 1.55,
							color: bubbleC.text,
						}}
					>
						{inner}
					</div>
				</div>
			</div>
		);
	}
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "flex-end",
				animation: "sp-fadeUp .22s ease both",
			}}
		>
			<div style={{ maxWidth: 240 }}>
				<div
					style={{
						background: bubbleC.navy,
						borderRadius: "14px 14px 4px",
						padding: "10px 13px",
						fontSize: 13.5,
						lineHeight: 1.55,
						color: "#fff",
					}}
				>
					{inner}
				</div>
			</div>
		</div>
	);
}

// ── COMPLETE ─────────────────────────────────────────────────────────────────
// 확정 목업(game__sp_complete)은 인라인 style 이 하나도 없다 — game.css 가 이관해
// 둔 .sp-complete-* 클래스만으로 그려진다. 이전 판(인라인 style 뭉치)은 그 클래스를
// 심지 않아 CSS 가 죽어 있었다 — 목업을 기준으로 다시 짰다.
export interface CompleteSnap {
	locName: string;
	sx: number;
	sc: number;
	sh: number;
	tx: number;
	puzzleCount: number;
	grammars: string[];
}

export interface SpCompleteViewProps {
	completeSnap: CompleteSnap;
	onBackToMap: () => void;
	onRetry: () => void;
}

export function SpCompleteView({
	completeSnap,
	onBackToMap,
	onRetry,
}: SpCompleteViewProps) {
	return (
		<div className="result-screen sp-complete">
			<div className="sp-complete-scroll">
				<div className="sp-complete-hero">
					<div className="sp-complete-check">✓</div>
					<div className="sp-complete-title">{completeSnap.locName} 완료!</div>
					<div className="sp-complete-copy">모든 문장을 완성했어요!</div>
					<div className="sp-complete-xp">
						{completeSnap.sx} <span>XP</span>
					</div>
				</div>
				<div className="sp-complete-body">
					<div className="sp-complete-stats">
						<div className="sp-complete-stat">
							<b>
								{completeSnap.sc} / {completeSnap.puzzleCount}
							</b>
							<span>정답</span>
						</div>
						<div className="sp-complete-stat">
							<b>{completeSnap.sh}</b>
							<span>힌트 사용</span>
						</div>
						<div className="sp-complete-stat">
							<b>{completeSnap.tx} XP</b>
							<span>누적 XP</span>
						</div>
					</div>
					<div className="sp-grammar-review">
						<div className="sp-grammar-title">이 장소에서 배운 문법</div>
						<div className="sp-grammar-chips">
							{completeSnap.grammars.map((g) => (
								<span key={g} className="sp-grammar-chip">
									{g}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>
			<div className="sp-complete-actions">
				<button
					type="button"
					className="sp-complete-map ux-control"
					onPointerDown={onBackToMap}
					onClick={(e) => {
						if (e.detail === 0) onBackToMap();
					}}
				>
					지도로 돌아가기 →
				</button>
				<button
					type="button"
					className="sp-complete-replay ux-control"
					onPointerDown={onRetry}
					onClick={(e) => {
						if (e.detail === 0) onRetry();
					}}
				>
					다시 풀기
				</button>
			</div>
		</div>
	);
}
