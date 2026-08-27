import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { evaluateSpeech } from "@/api/speech";
import { SpeakerIcon } from "@/assets/icons";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	ListenControl,
	PrimaryButton,
	RecordControl,
	type RoleTurn,
	RoleplayScreen,
} from "@/components/main/activity";
import AudioRecorder from "@/components/problem/audio-recorder";
import { useActivityState } from "@/hooks/use-activity-state";
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
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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

export default function AiRoleplay({
	bookId,
	chapterSeq,
	chapterLabel,
}: AiRoleplayProps) {
	const router = useRouter();
	const { t } = useTranslation();
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

	/*
	 * 활동 상태 — 진입 · 이동 저장 · 완료.
	 *
	 * **롤플레잉의 1문항은 "내 차례" 한 번이다** — shell_spec §1 · §3.4 · §28 이
	 * 세 곳에서 "문항 = 대화 턴" 이라고 적었고, 목업(`activity__role.html`)의
	 * 진행바 칸 둘도 그 대화의 "나" 줄이 둘인 것과 맞는다.
	 *
	 * **시나리오로 세면 안 된다** — 원장을 세어 보면 이 활동이 있는 117과 중
	 * 74과가 시나리오가 하나뿐이다. 그 과들은 분모가 1 이 되어 진행률이 뜻을 잃는다.
	 *
	 * 세는 기준은 시나리오의 `mode` 다(학습자가 고르는 방향 탭이 아니다). 탭을
	 * 뒤집으면 내 차례 수가 2 ↔ 3 으로 바뀌는데, 그때마다 분모가 흔들리면 안 된다.
	 */
	const practiceTurnsOf = useCallback((turnsOfScenario: RoleplayTurn[]) => {
		const userFirst = turnsOfScenario[0]?.mode === "user-first";
		return turnsOfScenario.filter((t) =>
			userFirst ? t.turn_seq % 2 === 1 : t.turn_seq % 2 === 0,
		).length;
	}, []);

	/** 시나리오마다 [시작 문항 번호, 문항 수] — 이어하기와 완료 수가 같은 표를 본다 */
	const spans = useMemo(() => {
		let at = 0;
		return scenarios.map((sc) => {
			const n = practiceTurnsOf(sc.turns);
			const span = { from: at, count: n };
			at += n;
			return span;
		});
	}, [scenarios, practiceTurnsOf]);
	const totalTurns = spans.reduce((sum, sp) => sum + sp.count, 0);

	const { startIndex, saveProgress, complete } = useActivityState({
		bookId,
		chapterSeq,
		menuType: "roleplay",
		totalItems: totalTurns || null,
	});

	/*
	 * 이어하기는 **시나리오 경계까지만** 되돌린다.
	 *
	 * 시나리오에 들어가면 첫 턴부터 TTS 가 순서대로 재생되므로 중간 턴은 되살릴
	 * 지점이 아니다 — 소리를 건너뛰고 세 번째 대사에 앉혀 놓으면 앞 맥락이 없다.
	 * 그래서 저장하는 값도 그 시나리오의 첫 문항 번호다. 문항 단위로 세는 것과
	 * 시나리오 단위로 되돌리는 것은 어긋나지 않는다 — 분모는 문항이고,
	 * 되돌리는 위치가 그 문항들 중 시나리오가 시작하는 자리일 뿐이다.
	 */
	const jumped = useRef(false);
	useEffect(() => {
		if (jumped.current || startIndex === null) return;
		jumped.current = true;
		if (startIndex <= 0) return;
		const at = spans.findIndex(
			(sp) => startIndex >= sp.from && startIndex < sp.from + sp.count,
		);
		if (at > 0) setScenarioIdx(at);
	}, [startIndex, spans]);

	useEffect(() => {
		const span = spans[scenarioIdx];
		if (span) saveProgress(span.from);
	}, [scenarioIdx, spans, saveProgress]);

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
		[turns, sharedAudio, isPracticeTurn, bookId, chapterSeq],
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

	/**
	 * 현재 연습 턴을 마치고 다음 대사로 이동한다.
	 * STT 판정은 진행을 막는 자격시험이 아니다. 정답이면 자동으로, 인식 결과가
	 * 다르면 학습자가 [다음 대사]를 눌렀을 때 이 길을 탄다.
	 */
	const advanceAfterTurn = useCallback(
		(turnIdx: number) => {
			const nextIdx = turnIdx + 1;
			if (nextIdx >= turns.length) {
				setCurrentTurnIdx(turnIdx);
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
				playModelTurn(nextIdx);
			} else {
				setCurrentTurnIdx(nextIdx);
				setPlayState("practice-turn");
			}
		},
		[turns, bookId, chapterSeq, isPracticeTurn, playModelTurn],
	);

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
				advanceAfterTurn(currentTurnIdx);
			} else {
				// 다르게 인식됨 → 다시 녹음 또는 다음 대사를 학습자가 고른다
				setPlayState("practice-turn");
			}
		},
		[currentTurnIdx, turns, sound, advanceAfterTurn],
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

	/*
	 * 마지막 시나리오를 끝냈을 때 한 번 완료를 알린다.
	 * `gradedCount` 는 0 이다 — STT 판정이 진행을 막지 않으므로 채점하지 않는다
	 * (§28: 롤플레잉·플래시카드·자모 발음은 정답률이 "—" 다). 그래서
	 * `correctCount` 도 0 이다. 세는 것은 "했나" 뿐이다.
	 */
	/*
	 * **한 번만 보내면 안 된다.** 끝내지 않은 시나리오가 남으면 서버가 완료로
	 * 치지 않고 `in_progress` 로 둔다(`repo_activity_state.complete` · shell_spec §1).
	 * 진행바로 그 시나리오에 돌아가 마치면 **그때 완료가 되어야 한다**.
	 * `reported` 불리언 하나로 막으면 돌아가 마쳐도 다시 안 보내서 영원히 미완료다.
	 *
	 * 그래서 보낸 **값**을 기억한다 — 마친 대사 수가 늘면 다시 보낸다.
	 */
	const sentAnswered = useRef<number | null>(null);
	useEffect(() => {
		if (playState !== "done" || hasNext) return;
		const answered = scenarios.reduce(
			(sum, sc, i) =>
				sc.turns[0] && completedScenarios.has(sc.turns[0].id)
					? sum + (spans[i]?.count ?? 0)
					: sum,
			0,
		);
		if (sentAnswered.current === answered) return;
		sentAnswered.current = answered;
		void complete({
			answeredCount: answered,
			gradedCount: 0,
			correctCount: 0,
		});
	}, [playState, hasNext, scenarios, spans, completedScenarios, complete]);

	if (!scenario) {
		return (
			<div className="flex h-full flex-col items-center justify-center bg-white">
				<p className="text-[#888] text-[14px]">데이터가 없습니다</p>
			</div>
		);
	}

	const activeRecord = userRecords[currentTurnIdx];
	const choosingAfterResult = Boolean(
		playState === "practice-turn" && activeRecord && !activeRecord.isCorrect,
	);
	const currentTurn = turns[currentTurnIdx];
	const currentIsPractice = currentTurn
		? isPracticeTurn(currentTurn.turn_seq)
		: false;

	/*
	 * 대본 줄과 도크 껍데기는 `RoleplayScreen` 이 그린다(2026-08-26). 전에는
	 * 여기 `TurnLine` 이라는 두 번째 판이 있었고, 목업 대조는 그 컴포넌트가 아니라
	 * 같은 이름의 다른 컴포넌트를 보고 있었다 — 학생이 보는 줄은 아무도 안 봤다.
	 * 여기 남는 것은 **어느 줄이 어떤 상태인지** 를 아는 일뿐이다.
	 */
	const scriptTurns: RoleTurn[] = turns.map((turn) => {
		const practice = isPracticeTurn(turn.turn_seq);
		return {
			id: turn.id,
			who: practice ? "나" : "AI",
			mine: practice,
			ko: turn.ko,
		};
	});

	/**
	 * 그 줄에 소리 버튼을 둘지.
	 * - AI 줄: 이미 나온 문장이면 다시 듣기 (안 나온 줄은 미리 안 들려준다)
	 * - 내 줄: 분석을 마친 녹음이 있을 때만. 지금 줄은 아래 결과 카드가 그 일을
	 *   하므로 한 화면에 같은 버튼을 두 번 두지 않는다
	 */
	const replayableAt = (idx: number) => {
		const turn = turns[idx];
		if (!turn || idx > currentTurnIdx) return false;
		if (!isPracticeTurn(turn.turn_seq)) return true;
		return idx !== currentTurnIdx && Boolean(userRecords[idx]?.audioUrl);
	};

	const control =
		playState === "done" ? (
			<PrimaryButton
				label={
					hasNext ? t("activity.roleNextDialogue") : t("activity.roleFinish")
				}
				on
				action="roleNext"
				onClick={hasNext ? handleNext : () => router.history.back()}
			/>
		) : choosingAfterResult ? null : currentIsPractice ? (
			evaluating ? (
				<RecordControl mode="sending" action="roleEvaluate" />
			) : (
				<AudioRecorder
					dock
					action="roleRecord"
					setResult={handleRecordResult}
					onSkipActivity={handleSkip}
					disabled={playState !== "practice-turn"}
				/>
			)
		) : (
			<ListenControl
				mode={audioBlocked ? "ready" : "playing"}
				onPlay={
					audioBlocked
						? () => {
								void sharedAudio.unlock();
							}
						: undefined
				}
			/>
		);

	return (
		<RoleplayScreen
			lesson={chapterLabel}
			turns={scriptTurns}
			current={currentTurnIdx}
			direction={activeTab === "ai-to-me" ? "ai" : "me"}
			currentScenario={scenarioIdx}
			totalScenarios={scenarios.length}
			speaking={playState === "model-speaking"}
			replayableAt={replayableAt}
			// AI 줄이 말하는 중이면 그 재생을 가로채지 않는다
			replayDisabled={playState === "model-speaking"}
			result={
				currentIsPractice && activeRecord
					? {
							index: currentTurnIdx,
							expected: currentTurn?.ko ?? "",
							recognized: activeRecord.sttText,
							matched: activeRecord.isCorrect,
							canChooseNext:
								!activeRecord.isCorrect && playState === "practice-turn",
							onReplay: () => handleReplayMyVoice(activeRecord.audioUrl),
							onRetry: () => handleClearRecord(currentTurnIdx),
							onContinue: () => advanceAfterTurn(currentTurnIdx),
						}
					: undefined
			}
			control={control}
			onExit={() => router.history.back()}
			onSkip={handleSkip}
			onScenarioJump={setScenarioIdx}
			onDirection={(direction) => {
				tabSwitchedRef.current = true;
				setActiveTab(direction === "ai" ? "ai-to-me" : "me-to-ai");
			}}
			onReplay={(idx) => {
				const turn = turns[idx];
				if (!turn) return;
				if (isPracticeTurn(turn.turn_seq)) {
					const url = userRecords[idx]?.audioUrl;
					if (url) handleReplayMyVoice(url);
				} else {
					handleReplayTurn(turn);
				}
			}}
		/>
	);
}
