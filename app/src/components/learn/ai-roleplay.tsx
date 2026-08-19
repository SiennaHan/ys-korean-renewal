import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { evaluateSpeech } from "@/api/speech";
import { SpeakerIcon } from "@/assets/icons";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import AudioRecorder from "@/components/problem/audio-recorder";
import { type RoleplayTurn, getScenarios } from "@/shared/data/roleplay";
import { getTTSAudio, prefetchTTSAudio } from "@/shared/tts-cache";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Loader2,
	RotateCcw,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface AiRoleplayProps {
	bookId?: number;
	chapterSeq?: number;
	chapterLabel: string;
}

type PlayState = "idle" | "model-speaking" | "practice-turn" | "done";

/** 탭 모드: 누가 먼저 대화를 시작하는지 */
type TabMode = "ai-to-me" | "me-to-ai";

/** 유저 녹음 결과 */
interface UserRecordResult {
	turnIdx: number;
	sttText: string;
	audioUrl: string;
	isCorrect: boolean;
}

/** 두 문자열 비교 → 글자별 맞음/틀림 배열 */
function diffChars(
	expected: string,
	actual: string,
): { char: string; correct: boolean }[] {
	const result: { char: string; correct: boolean }[] = [];
	for (let i = 0; i < actual.length; i++) {
		result.push({
			char: actual[i],
			correct: i < expected.length && actual[i] === expected[i],
		});
	}
	return result;
}

/** i18n 언어에 맞는 번역 텍스트 반환 */
function getMeaning(turn: RoleplayTurn, lang: string): string {
	switch (lang) {
		case "ja":
			return turn.jp || turn.en;
		case "zh":
			return turn.cn || turn.en;
		case "vi":
			return turn.vi || turn.en;
		case "ko":
			return turn.ko;
		default:
			return turn.en;
	}
}

export default function AiRoleplay({
	bookId,
	chapterSeq,
	chapterLabel,
}: AiRoleplayProps) {
	const router = useRouter();
	const { i18n } = useTranslation();
	const sharedAudio = useSharedAudio();
	const sound = useSoundEffects();

	/** 페이지 이탈 시 음원 중단 */
	useEffect(() => {
		return () => sharedAudio.stop();
	}, [sharedAudio]);

	const scenarios = useMemo(
		() => (bookId && chapterSeq ? getScenarios(bookId, chapterSeq) : []),
		[bookId, chapterSeq],
	);

	const [scenarioIdx, setScenarioIdx] = useState(0);
	/** Set of completed scenario questionIds (first turn id) */
	const [completedScenarios, setCompletedScenarios] = useState<Set<number>>(
		new Set(),
	);

	/** Fetch existing records on mount */
	useEffect(() => {
		if (!bookId || !chapterSeq) return;
		getLearningRecords(bookId, chapterSeq, "roleplay").then((records) => {
			const set = new Set<number>();
			for (const r of records) {
				if (r.is_correct) {
					set.add(r.question_id);
				}
			}
			setCompletedScenarios(set);
		});
	}, [bookId, chapterSeq]);

	const scenario = scenarios[scenarioIdx];
	const turns: RoleplayTurn[] = scenario?.turns ?? [];

	const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
	const [playState, setPlayState] = useState<PlayState>("idle");
	/** 자동재생 차단 상태 — 사용자 탭을 기다리는 중임을 안내 */
	const [audioBlocked, setAudioBlocked] = useState(false);

	/** mode 에 따라 기본 탭 결정 */
	const defaultTab: TabMode =
		scenario?.turns[0]?.mode === "user-first" ? "me-to-ai" : "ai-to-me";
	const [activeTab, setActiveTab] = useState<TabMode>(defaultTab);

	const [userRecords, setUserRecords] = useState<
		Record<number, UserRecordResult>
	>({});
	const mountedRef = useRef(true);
	/** 탭 전환으로 인한 재시작인지 추적 */
	const tabSwitchedRef = useRef(false);
	/** 세션 ID: 탭/시나리오 변경 시 이전 비동기 체인을 무효화 */
	const sessionIdRef = useRef(0);
	/** ref로 최신 activeTab을 콜백에서 참조 */
	const activeTabRef = useRef(activeTab);
	activeTabRef.current = activeTab;

	/**
	 * turn_seq + 탭 모드로 해당 턴이 "연습(녹음)" 턴인지 판별
	 * - "ai-to-me" 탭: AI 먼저 → 홀수 turn_seq = AI(모델), 짝수 = 나(연습)
	 * - "me-to-ai" 탭: 나 먼저 → 홀수 turn_seq = 나(연습), 짝수 = AI(모델)
	 */
	const isPracticeTurn = useCallback((turnSeq: number) => {
		const isOdd = turnSeq % 2 === 1;
		return activeTabRef.current === "ai-to-me" ? !isOdd : isOdd;
	}, []);

	/** 모델 턴 TTS 자동 재생 (연습 대상이 아닌 턴) */
	const playModelTurn = useCallback(
		async (turnIdx: number) => {
			const sid = sessionIdRef.current;
			const turn = turns[turnIdx];
			if (!turn || isPracticeTurn(turn.turn_seq)) return;

			setCurrentTurnIdx(turnIdx);
			setPlayState("model-speaking");

			const speakText = turn.ko;

			const voice = turn.gender === "남" ? "male" : "female";
			const audioUrl = await getTTSAudio(speakText, voice);
			if (sessionIdRef.current !== sid) return;

			if (audioUrl) {
				// waitUntilEnd: 추정 시간이 아니라 실제 재생 종료(ended)를 기다린다.
				// 릴로드 직후처럼 자동재생이 차단된 경우에도, 사용자 제스처로 재생이
				// 풀려 끝날 때까지 여기서 대기 → 소리 없이 다음 턴으로 넘어가지 않는다.
				await sharedAudio.playUrl(audioUrl, {
					waitUntilEnd: true,
					onBlocked: () => {
						if (sessionIdRef.current === sid) setAudioBlocked(true);
					},
					onPlaying: () => {
						if (sessionIdRef.current === sid) setAudioBlocked(false);
					},
				});
				setAudioBlocked(false);
			}

			if (sessionIdRef.current !== sid) return;

			// 재생 완료 → 다음 턴 확인
			const nextIdx = turnIdx + 1;
			if (nextIdx >= turns.length) {
				setPlayState("done");
				if (bookId && chapterSeq && turns.length > 0) {
					saveLearningRecord({
						bookId,
						chapterSeq,
						menuType: "roleplay",
						questionId: turns[0].id,
						selectedAnswer: "completed",
						isCorrect: true,
					});
					setCompletedScenarios((prev) => new Set(prev).add(turns[0].id));
				}
				return;
			}

			const nextTurn = turns[nextIdx];
			if (isPracticeTurn(nextTurn.turn_seq)) {
				// 다음 턴은 연습 턴 → 녹음 대기
				setCurrentTurnIdx(nextIdx);
				setPlayState("practice-turn");
			} else {
				// 연속 모델 턴
				await playModelTurn(nextIdx);
			}
		},
		[turns, sharedAudio, isPracticeTurn],
	);

	/** 시나리오 시작 (탭 변경 시에도 호출) — 가변 턴 사전 생성 후 대화 시작 */
	const startScenario = useCallback(async () => {
		// 이전 playModelTurn 체인 무효화
		const sid = ++sessionIdRef.current;
		mountedRef.current = true;
		setUserRecords({});
		setCurrentTurnIdx(0);
		setPlayState("idle");
		setEvaluating(false);
		setAudioBlocked(false);

		const isTabSwitch = tabSwitchedRef.current;
		tabSwitchedRef.current = false;

		// 탭 전환이 아닌 경우에만, 이미 완료된 시나리오면 done 상태
		if (
			!isTabSwitch &&
			turns.length > 0 &&
			completedScenarios.has(turns[0].id)
		) {
			setCurrentTurnIdx(turns.length - 1);
			setPlayState("done");
			return;
		}

		if (turns.length === 0) return;

		// 탭 전환이 아닐 때만 가변 문장 생성 (탭 전환 시 기존 생성 결과 재사용)

		if (sessionIdRef.current !== sid) return;

		const firstTurn = turns[0];
		if (isPracticeTurn(firstTurn.turn_seq)) {
			// 첫 턴이 연습 턴 → 바로 녹음 대기
			setPlayState("practice-turn");
		} else {
			// 첫 턴이 모델 턴 → TTS 재생
			setTimeout(() => {
				if (mountedRef.current && sessionIdRef.current === sid) {
					playModelTurn(0);
				}
			}, 500);
		}
	}, [turns, completedScenarios, isPracticeTurn, playModelTurn]);

	/**
	 * 현재 시나리오의 모델 턴 음원을 미리 받아둔다.
	 * 첫 턴은 곧바로 재생되므로 순서대로, 한 번에 하나씩만 요청한다
	 * (미생성 문장은 서버에서 합성이 일어나므로 동시 요청을 피한다).
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: isPracticeTurn 이 activeTab 을 ref 로 읽으므로, 탭 전환 시 다시 프리페치하려면 activeTab 이 필요
	useEffect(() => {
		let cancelled = false;
		(async () => {
			for (const turn of turns) {
				if (cancelled) return;
				if (isPracticeTurn(turn.turn_seq)) continue;
				await prefetchTTSAudio(
					turn.ko,
					turn.gender === "남" ? "male" : "female",
				);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [turns, activeTab, isPracticeTurn]);

	/** 시나리오 변경 시 mode에 따라 기본 탭 설정 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-run on scenario change
	useEffect(() => {
		const mode = turns.length > 0 ? turns[0].mode : "ai-first";
		setActiveTab(mode === "user-first" ? "me-to-ai" : "ai-to-me");
	}, [scenario?.scenarioId]);

	/** 탭 변경 또는 시나리오 변경 시 플로우 재시작 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: restart flow on tab/scenario change
	useEffect(() => {
		startScenario();
		return () => {
			mountedRef.current = false;
		};
	}, [activeTab, scenario?.scenarioId, completedScenarios]);

	const [evaluating, setEvaluating] = useState(false);

	/** 사용자 녹음 완료 → OpenAI API로 발화 판정 */
	const handleRecordResult = useCallback(
		async (_isCorrect: boolean, resultWord: string, audioUrl: string) => {
			const currentTurn = turns[currentTurnIdx];
			if (!currentTurn) return;

			// 평가 중 상태 표시
			setEvaluating(true);
			setPlayState("idle");

			const result = await evaluateSpeech(currentTurn.ko, resultWord);
			const correct = result.pass;

			if (!mountedRef.current) return;
			setEvaluating(false);

			setUserRecords((prev) => ({
				...prev,
				[currentTurnIdx]: {
					turnIdx: currentTurnIdx,
					sttText: resultWord,
					audioUrl,
					isCorrect: correct,
				},
			}));

			if (correct) {
				// 정답 효과음 + 애니메이션
				sound.playCorrect();
				// 정상 → 다음 턴으로
				const nextIdx = currentTurnIdx + 1;
				if (nextIdx >= turns.length) {
					setPlayState("done");
					if (bookId && chapterSeq && turns.length > 0) {
						saveLearningRecord({
							bookId,
							chapterSeq,
							menuType: "roleplay",
							questionId: turns[0].id,
							selectedAnswer: "completed",
							isCorrect: true,
						});
						setCompletedScenarios((prev) => new Set(prev).add(turns[0].id));
					}
					return;
				}
				const nextTurn = turns[nextIdx];
				if (!isPracticeTurn(nextTurn.turn_seq)) {
					// 다음은 모델 턴 → TTS 재생
					playModelTurn(nextIdx);
				} else {
					// 다음도 연습 턴
					setCurrentTurnIdx(nextIdx);
					setPlayState("practice-turn");
				}
			} else {
				// 틀림 → 다시 녹음 가능
				setPlayState("practice-turn");
			}
		},
		[currentTurnIdx, turns, playModelTurn, isPracticeTurn, sound],
	);

	/**
	 * 이미 발화가 끝난 AI 문장 다시 듣기.
	 * 진행 중인 모델 턴이 있으면 무시한다 — 재생을 가로채면 그 턴의 waitUntilEnd 가
	 * 종료로 간주돼 다음 턴으로 넘어가 버린다.
	 */
	const handleReplayTurn = useCallback(
		async (turn: RoleplayTurn) => {
			if (playState === "model-speaking") return;
			const audioUrl = await getTTSAudio(
				turn.ko,
				turn.gender === "남" ? "male" : "female",
			);
			if (audioUrl) await sharedAudio.playUrl(audioUrl);
		},
		[playState, sharedAudio],
	);

	/** 정답 처리된 내 녹음 다시 듣기 (AI 턴 재생 중이면 무시 — 위와 같은 이유) */
	const handleReplayMyVoice = useCallback(
		async (audioUrl: string) => {
			if (playState === "model-speaking") return;
			await sharedAudio.playUrl(audioUrl);
		},
		[playState, sharedAudio],
	);

	/** X 버튼: 녹음 결과 삭제 (다시 시도) */
	const handleClearRecord = useCallback((turnIdx: number) => {
		setUserRecords((prev) => {
			const next = { ...prev };
			delete next[turnIdx];
			return next;
		});
	}, []);

	const handleSkip = useCallback(() => {
		router.history.back();
	}, [router]);

	/** 완료된 시나리오 다시하기 */
	const handleRetry = useCallback(() => {
		if (turns.length === 0) return;
		setCompletedScenarios((prev) => {
			const next = new Set(prev);
			next.delete(turns[0].id);
			return next;
		});
	}, [turns]);

	/** 이전 시나리오 */
	const handlePrev = useCallback(() => {
		if (scenarioIdx > 0) {
			setScenarioIdx(scenarioIdx - 1);
		}
	}, [scenarioIdx]);

	/** 다음 시나리오 */
	const handleNext = useCallback(() => {
		if (scenarioIdx < scenarios.length - 1) {
			setScenarioIdx(scenarioIdx + 1);
		}
	}, [scenarioIdx, scenarios.length]);

	const hasPrev = scenarioIdx > 0;
	const hasNext = scenarioIdx < scenarios.length - 1;

	/** 상태 메시지 */
	const statusMessage = useMemo(() => {
		if (evaluating) return "발화를 평가하는 중입니다...";
		if (playState === "model-speaking") {
			// 자동재생이 막힌 상태 — 아무 곳이나 탭하면 unlock 되어 재생된다
			if (audioBlocked) return "화면을 탭하면 음성이 재생됩니다";
			return "AI가 말하는 중입니다";
		}
		if (playState === "practice-turn") {
			const record = userRecords[currentTurnIdx];
			if (record && !record.isCorrect) return "다시 말해 보세요";
			return "지금 말하세요.";
		}
		if (playState === "done") return "대화가 완료되었습니다";
		return "대화를 시작합니다";
	}, [playState, evaluating, userRecords, currentTurnIdx, audioBlocked]);

	if (!scenario) {
		return (
			<div className="flex h-full flex-col items-center justify-center bg-white">
				<p className="text-[#888] text-[14px]">데이터가 없습니다</p>
			</div>
		);
	}

	return (
		<div className="relative flex h-full flex-col bg-white">
			{/* Header */}
			<div className="sticky top-0 z-10 border-[#F6F7F8] border-b bg-white">
				<div className="flex h-[48px] items-center justify-between px-[16px]">
					<button
						type="button"
						onClick={() => router.history.back()}
						className="flex cursor-pointer items-center justify-center"
					>
						<X className="size-[20px] text-[#383A3F]" />
					</button>
					<p className="text-[#878787] text-[14px]">{chapterLabel}</p>
					<button
						type="button"
						onClick={handleSkip}
						className="flex cursor-pointer items-center gap-[2px]"
					>
						<span className="text-[#8d8d8d] text-[12px]">skip</span>
						<ChevronRight className="size-[12px] text-[#8d8d8d]" />
					</button>
				</div>
			</div>

			{/* Title */}
			<div className="px-[20px] pt-[16px]">
				<h1 className="font-semibold text-[24px] text-black leading-[32px]">
					AI와 함께 대화를 연습해 보세요.
				</h1>
				<p className="mt-[2px] text-[#555] text-[18px] leading-[23px]">
					Practice having conversations with AI.
				</p>
			</div>

			{/* Tab buttons — [AI > 나] [나 > AI] */}
			<div className="flex items-center gap-[8px] px-[20px] pt-[20px] pb-[16px]">
				<button
					type="button"
					onClick={() => {
						tabSwitchedRef.current = true;
						setActiveTab("ai-to-me");
					}}
					className={clsx(
						"cursor-pointer rounded-[8px] px-[16px] py-[8px] font-semibold text-[14px] transition-colors",
						activeTab === "ai-to-me"
							? "bg-[#383A3F] text-white"
							: "bg-[#F6F7F8] text-[#7F848D]",
					)}
				>
					AI &gt; 나
				</button>
				<button
					type="button"
					onClick={() => {
						tabSwitchedRef.current = true;
						setActiveTab("me-to-ai");
					}}
					className={clsx(
						"cursor-pointer rounded-[8px] px-[16px] py-[8px] font-semibold text-[14px] transition-colors",
						activeTab === "me-to-ai"
							? "bg-[#383A3F] text-white"
							: "bg-[#F6F7F8] text-[#7F848D]",
					)}
				>
					나 &gt; AI
				</button>
				<div className="flex-1" />
				{turns.length > 0 && completedScenarios.has(turns[0].id) && (
					<>
						<button
							type="button"
							onClick={handleRetry}
							className="flex size-[28px] cursor-pointer items-center justify-center rounded-full bg-[#F6F7F8] text-[#7F848D] transition-colors hover:bg-[#E5E8EC]"
						>
							<RotateCcw className="size-[14px]" />
						</button>
						<div className="flex size-[28px] items-center justify-center rounded-full bg-[#22C55E]">
							<Check className="size-[16px] text-white" />
						</div>
					</>
				)}
			</div>

			{/* Dialog lines */}
			<div className="scrollbar-hide flex-1 overflow-y-auto px-[20px] pb-[180px]">
				<div className="flex flex-col gap-[8px]">
					{turns.map((turn, idx) => {
						const isCurrent = idx === currentTurnIdx;
						const isPast = idx < currentTurnIdx;
						const isFuture = idx > currentTurnIdx;
						const record = userRecords[idx];
						const isPractice = isPracticeTurn(turn.turn_seq);
						// 정답 처리된 녹음만 다시 듣기 대상 (교정 중인 오답은 제외)
						const myRecordUrl =
							record?.isCorrect && record.audioUrl
								? record.audioUrl
								: undefined;

						return (
							<div key={turn.id}>
								{/* Turn line */}
								<TurnLine
									turn={turn}
									isCurrent={isCurrent}
									isPast={isPast}
									isFuture={isFuture}
									playState={playState}
									isPractice={isPractice}
									myRecordUrl={myRecordUrl}
									onReplay={() =>
										isPractice
											? myRecordUrl && handleReplayMyVoice(myRecordUrl)
											: handleReplayTurn(turn)
									}
								/>

								{/* 연습 턴에서 녹음 결과가 있으면 교정 카드 표시 */}
								{isPractice && record && isCurrent && (
									<UserRecordCard
										turn={turn}
										record={record}
										onClear={() => handleClearRecord(idx)}
										lang={i18n.language}
									/>
								)}
							</div>
						);
					})}
				</div>

				{/* Status message */}
				<div className="mt-[32px] flex justify-center">
					<div className="flex items-center gap-[6px] rounded-[20px] bg-[#F6F7F8] px-[16px] py-[8px]">
						{evaluating && (
							<Loader2 className="size-[14px] animate-spin text-[#979DA8]" />
						)}
						<p className="text-[#979DA8] text-[13px]">{statusMessage}</p>
					</div>
				</div>
			</div>

			{/* Bottom bar with recording + navigation arrows */}
			<div className="absolute right-0 bottom-0 left-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0)0%,#FFF_50%)] pt-[40px]">
				<div className="relative flex items-center justify-center px-[16px]">
					{/* Left arrow */}
					<button
						type="button"
						onClick={handlePrev}
						disabled={!hasPrev}
						className={clsx(
							"absolute left-[16px] flex size-[36px] shrink-0 items-center justify-center",
							hasPrev
								? "cursor-pointer text-[#0180FF]"
								: "cursor-default text-[#E5E8EC]",
						)}
					>
						<ChevronLeft className="size-[24px]" />
					</button>

					{/* Recorder — always centered */}
					<AudioRecorder
						setResult={handleRecordResult}
						disabled={playState !== "practice-turn" || evaluating}
					/>

					{/* Right arrow / 완료 */}
					{!hasNext ? (
						<button
							type="button"
							onClick={() => router.history.back()}
							disabled={
								scenarios.length === 0 ||
								!scenarios.every(
									(s) =>
										s.turns.length > 0 && completedScenarios.has(s.turns[0].id),
								)
							}
							className={clsx(
								"absolute right-[16px] flex h-[36px] shrink-0 items-center justify-center gap-[4px] rounded-full px-[14px] font-semibold text-[14px]",
								scenarios.length > 0 &&
									scenarios.every(
										(s) =>
											s.turns.length > 0 &&
											completedScenarios.has(s.turns[0].id),
									)
									? "cursor-pointer bg-[#0180FF] text-white"
									: "bg-[#E5E8EC] text-[#ADB3BE]",
							)}
						>
							<Check className="size-[16px]" />
							완료
						</button>
					) : (
						<button
							type="button"
							onClick={handleNext}
							className="absolute right-[16px] flex size-[36px] shrink-0 cursor-pointer items-center justify-center text-[#0180FF]"
						>
							<ChevronRight className="size-[24px]" />
						</button>
					)}
				</div>

				{/* Progress dots */}
				{scenarios.length > 1 && (
					<div className="flex items-center justify-center gap-[4px] pt-[4px] pb-[8px]">
						{scenarios.map((_, i) => (
							<div
								key={scenarios[i].scenarioId}
								className={clsx(
									"rounded-full",
									i === scenarioIdx
										? "h-[5px] w-[16px] bg-[#0180FF]"
										: "size-[5px] bg-[#E5E8EC]",
								)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

/** 개별 대화 라인 */
function TurnLine({
	turn,
	isCurrent,
	isPast,
	isFuture,
	playState,
	isPractice,
	myRecordUrl,
	onReplay,
}: {
	turn: RoleplayTurn;
	isCurrent: boolean;
	isPast: boolean;
	isFuture: boolean;
	playState: PlayState;
	isPractice: boolean;
	/** 정답 처리된 내 녹음 URL — 있을 때만 연습 턴에 스피커를 노출 */
	myRecordUrl?: string;
	onReplay: () => void;
}) {
	const label = isPractice ? "나" : "AI";
	const displayText = turn.ko;

	// 현재 턴만 하이라이트: 모델 턴 → 옅은 노란색, 연습 턴 → 옅은 파란색
	const isHighlighted = isCurrent;
	const bgColor = isHighlighted
		? isPractice
			? "bg-[#E9F2FC]"
			: "bg-[#FFF9E0]"
		: "";

	// 현재 모델 턴이고 재생 중이면 스피커 아이콘 표시
	const showSpeakerIcon =
		isCurrent && !isPractice && playState === "model-speaking";

	// 스피커 버튼 노출 규칙
	// - AI 턴: 발화가 끝난 문장에 회색 → 그 문장 다시 듣기
	//          (아직 안 나온 턴은 미리 들려주지 않는다)
	// - 연습 턴: 정답 처리된 녹음이 있을 때만 파란색 → 내 목소리 다시 듣기
	//          (녹음 전·교정 중에는 들려줄 게 없으므로 숨긴다)
	const showAiReplay = !isPractice && !isFuture && !showSpeakerIcon;
	const showMyReplay = isPractice && !isFuture && Boolean(myRecordUrl);
	const showReplay = showAiReplay || showMyReplay;
	// AI 턴이 말하는 중이면 그 재생을 가로채지 않도록 비활성화
	const replayDisabled = playState === "model-speaking";

	return (
		<div className="flex items-start gap-[12px] py-[8px]">
			<div
				className={clsx(
					"w-[24px] shrink-0 pt-[8px] font-bold text-[14px]",
					isFuture ? "text-[#C8CCD3]" : "text-[#383A3F]",
				)}
			>
				{showSpeakerIcon ? <SpeakerIcon color="#4396F4" size={14} /> : label}
			</div>
			<div
				className={clsx(
					"flex-1 whitespace-pre-line rounded-[8px] px-[10px] py-[6px] text-[16px] leading-relaxed",
					bgColor,
					isFuture ? "text-[#C8CCD3]" : "font-medium text-[#383A3F]",
				)}
			>
				{showReplay ? (
					<div className="flex items-center justify-between">
						<span>{displayText}</span>
						<button
							type="button"
							onClick={onReplay}
							disabled={replayDisabled}
							aria-label={showMyReplay ? "내 발음 다시 듣기" : "다시 듣기"}
							className={clsx(
								"flex shrink-0 items-center justify-center",
								replayDisabled
									? "cursor-default"
									: "cursor-pointer transition-opacity hover:opacity-60",
							)}
						>
							<SpeakerIcon
								color={
									replayDisabled
										? "#D9DDE3"
										: showMyReplay
											? "#4396F4"
											: "#B0B0B0"
								}
								size={14}
							/>
						</button>
					</div>
				) : (
					displayText
				)}
			</div>
		</div>
	);
}

/** 유저 녹음 결과 카드 (Figma: 3101-30881) */
function UserRecordCard({
	turn,
	record,
	onClear,
	lang,
}: {
	turn: RoleplayTurn;
	record: UserRecordResult;
	onClear: () => void;
	lang: string;
}) {
	const charDiff = diffChars(turn.ko, record.sttText);

	return (
		<div className="mb-[4px] ml-[36px] rounded-[8px] border border-[#E5E8EC] bg-white px-[12px] py-[10px]">
			{/* 영어 뜻 + 발음 */}
			<div className="flex items-center justify-between">
				<span className="text-[#878787] text-[13px]">
					{getMeaning(turn, lang)}
				</span>
				<span className="text-[#B0B0B0] text-[13px]">[{turn.ko}]</span>
			</div>

			{/* 나의 발음 */}
			<div className="mt-[8px]">
				<span className="text-[#878787] text-[12px]">나의 발음</span>
			</div>

			{/* STT 결과 */}
			<div className="mt-[4px] flex items-center justify-between">
				<p className="text-[16px]">
					{charDiff.map((c, i) => (
						<span
							key={`${i}-${c.char}`}
							className={c.correct ? "text-[#383A3F]" : "text-[#FF4444]"}
						>
							{c.char}
						</span>
					))}
				</p>

				{/* X 버튼: 녹음 결과 삭제 */}
				{!record.isCorrect && (
					<button
						type="button"
						onClick={onClear}
						className="flex size-[24px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#E5E8EC]"
					>
						<X className="size-[12px] text-[#878787]" />
					</button>
				)}
			</div>
		</div>
	);
}
