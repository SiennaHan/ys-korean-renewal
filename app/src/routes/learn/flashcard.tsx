import {
	createUserFlashcard,
	getUserFlashcard,
	listUserFlashcardWordByType,
	upsertUserFlashcardWord,
} from "@/api/flashcard";
import { useSharedAudio } from "@/components/audio/audio-provider";
import FlashcardResult from "@/components/learn/flashcard-result";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Dock,
	IconSpinner,
	IconVolume,
} from "@/components/main/activity";
import { env } from "@/config/env";
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
 * 구 경로 /book/chapter/unit/flashcard/$id 에서 옮겨 왔다. 그쪽은 리다이렉트만 남는다.
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

/**
 * 뒤집기가 되는 단어 카드(프레젠테이션 전용).
 * 드래그/스와이프는 바깥 motion.div가 담당하고, 여기서는 앞/뒤 3D 뒤집기만 처리한다.
 * 뒤 카드(다음 카드)와 앞 카드가 같은 컴포넌트를 써서 교체가 매끄럽다.
 */
function FlashcardCard({
	card,
	cardType,
	lang,
	isFlipped,
	isAudioPlaying,
	onPlay,
}: {
	card: FlashcardWord;
	cardType: string;
	lang: string;
	isFlipped: boolean;
	isAudioPlaying?: boolean;
	onPlay?: (e: ReactMouseEvent) => void;
}) {
	// 뜻은 화면 언어를 따른다 — 아직 안 채워진 언어는 영어로 되돌아간다
	const meaning = meaningFor(card, lang);
	/*
	 * 앞면은 문제, 뒷면은 **답이 크게**다 — 목업의 뒷면 <strong> 이 'apple'(뜻)이고
	 * 작은 줄이 부가 정보다. 전에는 backTop 이 앞면과 같은 값이라 뒤집어도 큰 글자가
	 * 그대로여서, 무엇이 답인지가 흐렸다. cardType 이 방향을 정한다:
	 *   wm = 한국어를 보고 뜻을 맞힌다 -> 뒷면 큰 글자는 뜻
	 *   mw = 뜻을 보고 한국어를 맞힌다 -> 뒷면 큰 글자는 한국어
	 */
	const frontText = cardType === "wm" ? card.word : meaning;
	const backTop = cardType === "wm" ? meaning : card.word;
	const backBottom = cardType === "wm" ? card.word : meaning;

	return (
		<div className={`flash-card ${isFlipped ? "flipped" : ""}`}>
			<div className="flash-face">
				<strong>{frontText}</strong>
				<button
					type="button"
					className="card-audio"
					onClick={onPlay}
					onPointerDown={(e) => e.stopPropagation()}
					disabled={isAudioPlaying}
					aria-label="발음 듣기"
				>
					{isAudioPlaying ? <IconSpinner /> : <IconVolume />}
				</button>
			</div>
			<div className="flash-face back">
				<strong>{backTop}</strong>
				<span className="kind">{backBottom}</span>
				{card.image && (
					<div className="flash-picture">
						<img src={`${env.RES_URL_ROOT}/${card.image}`} alt={card.word} />
					</div>
				)}
				<button
					type="button"
					className="card-audio"
					onClick={onPlay}
					onPointerDown={(e) => e.stopPropagation()}
					disabled={isAudioPlaying}
					aria-label="발음 듣기"
				>
					{isAudioPlaying ? <IconSpinner /> : <IconVolume />}
				</button>
			</div>
		</div>
	);
}

function RouteComponent() {
	const { i18n } = useTranslation();
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

	const currentCard = cardData[currentIndex];

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
				if (savedList.length > 0) setCurrentIndex(savedList.length);
				if (savedList.length >= _cardData.length) goResult();
			}
		};
		fetchData();
		// runKey 가 바뀌면 다시 읽는다 — 결과에서 "다시" 로 돌아온 경우다
	}, [runKey]);

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

	return (
		<ActivityFrame>
			<ActivityAppBar
				lesson={`${flashcardModule?.chapter ?? lesson}과 · ${flashcardModule?.title ?? "플래시카드"}`}
				onExit={onClose}
				onSkip={() => swipe(-1)}
			/>
			<ActivityProgress current={currentIndex} total={cardData.length} />
			<div className="flash-body">
				{/* 확인 목업처럼 다음 카드의 가장자리만 보여 주되, 현재 카드는 스와이프를 유지한다. */}
				<div className="flash-stage">
					<div className="flash-next" />
					{currentCard && (
						<motion.div
							className="flash-motion"
							style={{ x, rotate }}
							drag="x"
							dragDirectionLock
							onDragEnd={handleDragEnd}
							onTap={handleFlip}
							whileTap={{ cursor: "grabbing" }}
						>
							<FlashcardCard
								card={currentCard}
								cardType={cardType}
								lang={i18n.language}
								isFlipped={isFlipped}
								isAudioPlaying={isAudioPlaying}
								onPlay={(e) => {
									e.stopPropagation();
									playAudio();
								}}
							/>
						</motion.div>
					)}
				</div>
				<div className="flash-meta">
					{isFlipped
						? "다시 뒤집으려면 카드를 누르세요"
						: "카드를 눌러 뜻을 보세요"}
				</div>
			</div>
			<ActivityFooter>
				<Dock>
					<div className="judge">
						<button
							type="button"
							className="unknown"
							onClick={() => swipe(-1)}
							disabled={isSwiping}
						>
							<span className="badge">{unknownWords.length}</span>
							<span className="label">몰라요</span>
						</button>
						<button
							type="button"
							className="known"
							onClick={() => swipe(1)}
							disabled={isSwiping}
						>
							<span className="badge">{knownWords.length}</span>
							<span className="label">알아요</span>
						</button>
					</div>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}
