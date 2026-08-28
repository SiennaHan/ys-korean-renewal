import {
	createUserFlashcard,
	getUserFlashcard,
	listUserFlashcardWordByType,
	upsertUserFlashcardWord,
} from "@/api/flashcard";
import { useSharedAudio } from "@/components/audio/audio-provider";
import FlashcardResult from "@/components/learn/flashcard-result";
import { FlashcardScreen, LoadingScreen } from "@/components/main/activity";
import { env } from "@/config/env";
import { useActivityState } from "@/hooks/use-activity-state";
import { flashcards } from "@/shared/data/flashcard";
import {
	type FlashcardWord,
	flashcard_words,
	meaningFor,
} from "@/shared/data/flashcard_word";
import {
	useFlashcardBookIdStore,
	useSelectedCardTypeStore,
} from "@/shared/store/menu-store";
import { getWordTTSAudio } from "@/shared/tts-cache";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import {
	type PanInfo,
	animate,
	motion,
	useMotionValue,
	useTransform,
} from "framer-motion";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type LearnSearch, parseLearnSearch } from "./-search";

/**
 * 단어 플래시카드 — 명세 §4
 *
 * 구 경로 /book/chapter/unit/flashcard/$id 에서 옮겨 왔다.
 * 그 리다이렉트도 2026-08-28 에 지웠다 — 이제 /book 주소는 하나도 없다.
 * URL 에서 콘텐츠 ID 를 걷어내고 급·과만 받는다 — 세트는 여기서 찾는다.
 */
export const Route = createFileRoute("/learn/flashcard")({
	validateSearch: (search: Record<string, unknown>): LearnSearch =>
		parseLearnSearch(search),
	component: RouteComponent,
});

/** 스와이프로 판정하는 최소 이동 거리(px)와 속도(px/s) */
const SWIPE_OFFSET_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;
/** 카드가 화면 밖으로 날아가는 목표 거리(px) */
const FLY_OUT_DISTANCE = 500;

function RouteComponent() {
	const { t, i18n } = useTranslation();
	const { level, lesson } = Route.useSearch();
	const flashcardId = Number(
		flashcards.find((f) => f.book_id === level && f.chapter === lesson)?.id ??
			0,
	);

	const navigate = useNavigate();
	const [phase, setPhase] = useState<"cards" | "result">("cards");
	const [runKey, setRunKey] = useState(0);
	const router = useRouter();

	const { bookId } = useFlashcardBookIdStore();
	const { cardType } = useSelectedCardTypeStore();

	const sharedAudio = useSharedAudio();
	const [isAudioPlaying, setIsAudioPlaying] = useState(false);

	const goBack = () => {
		router.history.back();
	};

	const [repeatStatus, setRepeatStatus] = useState<
		"new" | "repeat" | "complete"
	>("new");
	const [cardData, setCardData] = useState<FlashcardWord[]>([]);

	const flashcardModule = flashcards.find((item) => item.id === flashcardId);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [knownWords, setKnownWords] = useState<string[]>([]);
	const [unknownWords, setUnknownWords] = useState<string[]>([]);
	const [isFlipped, setIsFlipped] = useState(false);
	const [isSwiping, setIsSwiping] = useState(false);

	/** 카드 가로 위치. 드래그와 날아가는 애니메이션이 공유한다. */
	const x = useMotionValue(0);
	/** 미는 방향으로 살짝 기울여 손맛을 준다. */
	const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
	/** 애니메이션 도중 중복 판정을 막는 동기 잠금 */
	const animatingRef = useRef(false);

	/*
	 * **분모는 전체 카드 수다.** `cardData` 는 "모르는 단어만 다시" 에서 부분집합으로
	 * 바뀌므로 그것을 `totalItems` 로 보내면 서버의 분모가 그때 줄어든다 —
	 * 진행률이 조용히 커진다. 그래서 갈라 둔다.
	 */
	const [deckSize, setDeckSize] = useState<number | null>(null);

	/*
	 * 활동 상태 — 진입 · 이동 저장 · 완료 (shell_spec §1 "플래시카드 그대로 적용",
	 * 문항 = 카드 1장).
	 *
	 * **전에는 위치를 카드 기록 수에서 유추했다** — `setCurrentIndex(savedList.length)`.
	 * `api/activity.ts` 머리가 적어 둔 바로 그 방식이고, 어긋나는 자리가 있다:
	 * 같은 카드를 두 번 넘기면 서버는 upsert 라 길이가 안 늘어 위치가 멈춘다.
	 * 이제 위치는 활동 상태가 쥐고, 카드 기록은 알아요/몰라요 자체만 쥔다.
	 *
	 * "모르는 단어만 다시" 는 문항 집합이 다른 별개 세션이라 `retry` 다 —
	 * 그 세션의 위치를 저장하면 다음에 엉뚱한 데서 시작한다.
	 */
	const { startIndex, saveProgress, complete } = useActivityState({
		bookId: level,
		chapterSeq: lesson,
		menuType: "flashcard",
		totalItems: deckSize,
		retry: repeatStatus === "repeat",
	});

	/** 서버가 준 위치로 한 번만 옮긴다. "다시" 로 돌아오면 다시 한 번 허용한다 */
	const jumpedFor = useRef<number | null>(null);
	useEffect(() => {
		if (jumpedFor.current === runKey || startIndex === null) return;
		if (cardData.length === 0) return;
		jumpedFor.current = runKey;
		if (startIndex > 0 && startIndex < cardData.length) {
			setCurrentIndex(startIndex);
		}
	}, [startIndex, runKey, cardData.length]);

	/** 카드를 넘기면 알린다. ✕ 로 나가도 이 값이 이미 저장돼 있다 */
	useEffect(() => {
		saveProgress(currentIndex);
	}, [currentIndex, saveProgress]);

	const currentCard = cardData[currentIndex];

	// 상단 바에 적히는 줄. 세트 제목이 원장에 없으면 활동 이름으로 대신한다
	const lessonLabel = t("player.chapterActivity", {
		seq: flashcardModule?.chapter ?? lesson,
		title: flashcardModule?.title ?? t("catalog.act.flashcard"),
	});

	const putData = async (cardId: string, status: "known" | "unknown") => {
		await upsertUserFlashcardWord({
			flashcardId,
			cardType,
			cardId,
			status,
		});
	};

	/*
	 * 결과는 라우트가 아니라 이 화면의 한 단계다 (명세 §4 — "결과는 셸 공통이라
	 * 별도 라우트 폐지"). runKey 를 올리면 카드 화면이 서버 상태를 다시 읽는다 —
	 * "모르는 단어만 다시" 가 repeat 를 심고 되돌아오기 때문이다.
	 */
	const goResult = () => setPhase("result");

	/** dir: 1 = 알아요(오른쪽), -1 = 몰라요(왼쪽) */
	const swipe = (dir: 1 | -1) => {
		if (!currentCard || animatingRef.current) return;
		animatingRef.current = true;
		setIsSwiping(true);

		const status = dir > 0 ? "known" : "unknown";
		putData(currentCard.id, status);
		if (dir > 0) {
			setKnownWords((prev) => [...prev, currentCard.id]);
		} else {
			setUnknownWords((prev) => [...prev, currentCard.id]);
		}

		const isLast = currentIndex >= cardData.length - 1;

		animate(x, dir * FLY_OUT_DISTANCE, {
			type: "tween",
			duration: 0.25,
			ease: "easeOut",
			onComplete: () => {
				if (isLast) {
					goResult();
					return;
				}
				// 다음 카드로 교체: 뒤에 깔려 있던 다음 카드와 동일한 내용이 중앙에
				// 그대로 나타나므로 튀지 않는다. x는 즉시 0으로 되돌린다.
				setIsFlipped(false);
				setCurrentIndex((i) => i + 1);
				x.set(0);
				animatingRef.current = false;
				setIsSwiping(false);
			},
		});
	};

	const handleDragEnd = (_e: unknown, info: PanInfo) => {
		if (animatingRef.current) return;
		const passed =
			Math.abs(info.offset.x) > SWIPE_OFFSET_THRESHOLD ||
			Math.abs(info.velocity.x) > SWIPE_VELOCITY_THRESHOLD;
		if (passed) {
			swipe(info.offset.x > 0 ? 1 : -1);
		} else {
			// 기준에 못 미치면 제자리로 튕겨 돌아온다.
			animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
		}
	};

	const handleFlip = () => {
		if (animatingRef.current) return;
		setIsFlipped((f) => !f);
	};

	const playAudio = useCallback(async () => {
		if (!currentCard || isAudioPlaying) return;
		sharedAudio.stop();
		setIsAudioPlaying(true);
		try {
			const audioUrl = await getWordTTSAudio(currentCard.word);
			if (audioUrl) {
				await sharedAudio.playUrl(audioUrl, { waitUntilEnd: true });
			}
		} finally {
			setIsAudioPlaying(false);
		}
	}, [currentCard, isAudioPlaying, sharedAudio]);

	const onClose = () => {
		sharedAudio.stop();
		goBack();
	};

	/** 카드 전환 시 재생 중단 */
	// currentIndex 가 방아쇠다 — 지우면 카드를 넘겨도 앞 카드 소리가 계속 난다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: 카드가 바뀔 때 소리를 끊으려고 넣은 방아쇠다
	useEffect(() => {
		sharedAudio.stop();
		setIsAudioPlaying(false);
	}, [currentIndex, sharedAudio]);

	/** 페이지 이탈 시 재생 중단 */
	useEffect(() => {
		return () => sharedAudio.stop();
	}, [sharedAudio]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 처음 한 번과 runKey 가 바뀔 때만 읽는다 — 나머지가 바뀌는 경우는 라우트 재마운트라 넣으면 같은 요청을 두 번 낸다
	useEffect(() => {
		const fetchData = async () => {
			const _cardData =
				flashcard_words.filter((item) => item.flashcard_id === flashcardId) ??
				[];
			setCardData(_cardData);
			setDeckSize(_cardData.length || null);

			// Ensure UserFlashcard record exists on server
			const existing = await getUserFlashcard(flashcardId, cardType);
			if (!existing) {
				await createUserFlashcard({
					bookId,
					flashcardId,
					cardType,
				});
			}
			const flashcardStatus = existing?.status ?? "new";
			setRepeatStatus(flashcardStatus as "new" | "repeat" | "complete");

			// Get saved words from server
			const savedList = await listUserFlashcardWordByType(
				flashcardId,
				cardType,
			);

			const unknowns = savedList
				.filter((item) => item.status === "unknown")
				.map((item) => item.card_id);
			setUnknownWords(unknowns);

			if (flashcardStatus === "repeat") {
				setKnownWords([]);
				setUnknownWords([]);
				const repeatCards = _cardData.filter((item) =>
					unknowns.includes(item.id),
				);
				setCardData(repeatCards);
				setCurrentIndex(0);
				if (repeatCards.length < 1) goResult();
			} else {
				const knowns = savedList
					.filter((item) => item.status === "known")
					.map((item) => item.card_id);
				setKnownWords(knowns);
				// 위치는 활동 상태가 쥔다 — 위 훅의 주석 참고. 여기서 세지 않는다
				if (savedList.length >= _cardData.length) goResult();
			}
		};
		fetchData();
		// runKey 가 바뀌면 다시 읽는다 — 결과에서 "다시" 로 돌아온 경우다
	}, [runKey]);

	/*
	 * 결과로 넘어갈 때 한 번 완료를 알린다.
	 * `gradedCount` 는 0 이다 — 자기 평가라 정오답이 없다(§28). "몰라요" 도 응답이므로
	 * 둘을 합쳐 센다. 한 바퀴 돌면 몰랐던 카드가 있어도 다 푼 것이다.
	 */
	const reported = useRef(false);
	useEffect(() => {
		if (phase !== "result" || reported.current) return;
		reported.current = true;
		void complete({
			answeredCount: knownWords.length + unknownWords.length,
			gradedCount: 0,
			correctCount: 0,
		});
	}, [phase, knownWords.length, unknownWords.length, complete]);

	if (phase === "result") {
		return (
			<FlashcardResult
				flashcardId={flashcardId}
				knownIds={knownWords}
				unknownIds={unknownWords}
				onClose={() => navigate({ to: "/main/textbook" })}
				onRetry={() => {
					setPhase("cards");
					setRunKey((n) => n + 1);
				}}
			/>
		);
	}

	// 카드가 아직 안 왔다 — 서버에 저장된 진행을 읽어 오는 동안이다.
	// 전에는 빈 카드 자리를 그대로 보여 줬다. 목업 정본에 기다리는 화면이 있다
	// (activity__loading) — 그 화면을 쓴다.
	if (!currentCard) {
		return (
			<LoadingScreen
				lesson={lessonLabel}
				current={currentIndex}
				total={cardData.length}
				onExit={onClose}
			/>
		);
	}

	/*
	 * 방향(cardType)을 여기서 푼다 — 화면은 앞 · 뒤 · 뒤의 작은 줄만 안다.
	 *   wm = 한국어를 보고 뜻을 맞힌다 -> 뒷면 큰 글자는 뜻
	 *   mw = 뜻을 보고 한국어를 맞힌다 -> 뒷면 큰 글자는 한국어
	 * 소리는 방향과 무관하게 늘 한국어 낱말을 읽는다.
	 */
	const meaning = meaningFor(currentCard, i18n.language);
	const isWordFirst = cardType === "wm";

	return (
		<FlashcardScreen
			lesson={lessonLabel}
			index={currentIndex}
			total={cardData.length}
			card={{
				front: isWordFirst ? currentCard.word : meaning,
				back: isWordFirst ? meaning : currentCard.word,
				sub: isWordFirst ? currentCard.word : meaning,
				spoken: currentCard.word,
				imageUrl: currentCard.image
					? `${env.RES_URL_ROOT}/${currentCard.image}`
					: undefined,
			}}
			flipped={isFlipped}
			knownCount={knownWords.length}
			unknownCount={unknownWords.length}
			audioBusy={isAudioPlaying}
			judgeDisabled={isSwiping}
			onExit={onClose}
			onSkip={() => swipe(-1)}
			// 뒤집기는 motion 의 onTap 이 맡는다 — 여기서도 받으면 끌고 놓을 때
			// 클릭이 뒤따라 와 카드가 한 번 더 뒤집힌다
			onAudio={(e) => {
				e.stopPropagation();
				playAudio();
			}}
			onAudioPointerDown={(e) => e.stopPropagation()}
			onKnown={() => swipe(1)}
			onUnknown={() => swipe(-1)}
			wrapCard={(cardNode) => (
				<motion.div
					className="flash-motion"
					style={{ x, rotate }}
					drag="x"
					dragDirectionLock
					onDragEnd={handleDragEnd}
					onTap={handleFlip}
					whileTap={{ cursor: "grabbing" }}
				>
					{cardNode}
				</motion.div>
			)}
		/>
	);
}
