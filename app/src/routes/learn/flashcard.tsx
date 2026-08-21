import {
	createUserFlashcard,
	getUserFlashcard,
	listUserFlashcardWordByType,
	upsertUserFlashcardWord,
} from "@/api/flashcard";
import { SpeakerIcon } from "@/assets/icons";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { env } from "@/config/env";
import { flashcards } from "@/shared/data/flashcard";
import { flashcard_words } from "@/shared/data/flashcard_word";
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
import { Loader2, X } from "lucide-react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react"
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

interface FlashcardData {
	flashcard_id: number;
	module_code: string;
	id: string;
	word: string;
	meaning: string;
	image: string;
	sound_kor: string;
	sound_eng: string;
}

/** 스와이프로 판정하는 최소 이동 거리(px)와 속도(px/s) */
const SWIPE_OFFSET_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;
/** 카드가 화면 밖으로 날아가는 목표 거리(px) */
const FLY_OUT_DISTANCE = 500;

/** 발음듣기 버튼. 미리보기/앞면/뒷면이 픽셀 단위로 동일해야 카드 교체 시 흔들림이 없다. */
function SpeakerButton({
	isPlaying = false,
	onPlay,
}: {
	isPlaying?: boolean;
	onPlay?: (e: ReactMouseEvent) => void;
}) {
	return (
		<div className="flex h-[60px] items-center justify-center">
			<button
				type="button"
				onClick={onPlay}
				// 버튼을 눌러도 카드 드래그/뒤집기가 시작되지 않도록 이벤트 전파를 막는다.
				onPointerDown={(e) => e.stopPropagation()}
				disabled={isPlaying}
				className="mb-6 flex h-[48px] w-[122px] cursor-pointer items-center justify-center gap-2 rounded-full bg-[#f6f7f8] text-[16px] text-black hover:text-gray-600 disabled:cursor-not-allowed"
			>
				<span className="flex size-[16px] items-center justify-center">
					{isPlaying ? (
						<Loader2 className="size-[16px] animate-spin text-[#24425F]" />
					) : (
						<SpeakerIcon color="#24425F" />
					)}
				</span>
				<span className="font-semibold text-[#24425F] text-[16px]">
					발음듣기
				</span>
			</button>
		</div>
	)
}

/**
 * 뒤집기가 되는 단어 카드(프레젠테이션 전용).
 * 드래그/스와이프는 바깥 motion.div가 담당하고, 여기서는 앞/뒤 3D 뒤집기만 처리한다.
 * 뒤 카드(다음 카드)와 앞 카드가 같은 컴포넌트를 써서 교체가 매끄럽다.
 */
function FlashcardCard({
	card,
	cardType,
	isFlipped,
	isAudioPlaying,
	onPlay,
}: {
	card: FlashcardData;
	cardType: string;
	isFlipped: boolean;
	isAudioPlaying?: boolean;
	onPlay?: (e: ReactMouseEvent) => void;
}) {
	const frontText = cardType === "wm" ? card.word : card.meaning;
	const backTop = cardType === "wm" ? card.word : card.meaning;
	const backBottom = cardType === "wm" ? card.meaning : card.word;

	return (
		<div className="px-5 pt-2" style={{ perspective: "2000px" }}>
			<div
				className="relative top-0 left-0 h-full w-full transition-transform duration-300"
				style={{
					transformStyle: "preserve-3d",
					transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
				}}
			>
				<div
					className="h-full rounded-2xl border-2 border-gray-100 bg-white px-8"
					style={{
						backfaceVisibility: "hidden",
						WebkitBackfaceVisibility: "hidden",
					}}
				>
					<div className="flex h-[360px] items-center justify-center">
						<h1 className="text-center font-bold text-[#383A3F] text-[36px]">
							{frontText}
						</h1>
					</div>
					<SpeakerButton isPlaying={isAudioPlaying} onPlay={onPlay} />
				</div>

				<div
					className="absolute top-0 left-0 h-full w-full rounded-2xl border-2 border-gray-100 bg-white"
					style={{
						backfaceVisibility: "hidden",
						WebkitBackfaceVisibility: "hidden",
						transform: "rotateY(180deg)",
					}}
				>
					<div className="h-[360px] px-[28px] pt-[40px]">
						<h1 className="text-center font-bold text-[#383A3F] text-[36px]">
							{backTop}
						</h1>
						<p className="text-center font-semibold text-[#666B73] text-[20px] text-gray-700">
							{backBottom}
						</p>
						{card.image && (
							<div className="mt-[35px] flex h-[160px] w-full justify-center overflow-hidden rounded-xl">
								<img
									src={`${env.RES_URL_ROOT}/${card.image}`}
									alt={card.word}
									className="h-full w-full object-contain"
								/>
							</div>
						)}
					</div>
					<SpeakerButton isPlaying={isAudioPlaying} onPlay={onPlay} />
				</div>
			</div>
		</div>
	)
}

function RouteComponent() {
	const { level, lesson } = Route.useSearch();
	const flashcardId = Number(
		flashcards.find((f) => f.book_id === level && f.chapter === lesson)?.id ?? 0,
	);

	const navigate = useNavigate();
	const router = useRouter();

	const { bookId } = useFlashcardBookIdStore();
	const { cardType } = useSelectedCardTypeStore();

	const sound = useSoundEffects();
	const sharedAudio = useSharedAudio();
	const [isAudioPlaying, setIsAudioPlaying] = useState(false);

	const goBack = () => {
		router.history.back();
	}

	const [repeatStatus, setRepeatStatus] = useState<
		"new" | "repeat" | "complete"
	>("new");
	const [cardData, setCardData] = useState<FlashcardData[]>([]);

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
	const nextCard = cardData[currentIndex + 1];

	const putData = async (cardId: string, status: "known" | "unknown") => {
		await upsertUserFlashcardWord({
			flashcardId,
			cardType,
			cardId,
			status,
		})
	}

	const goResult = () => {
		navigate({
			// 결과는 아직 구 경로다 — 명세 §4 는 셸 공통으로 접으라고 한다(이관 2단계)
			to: `/book/chapter/unit/flashcard/result/${flashcardId}`,
		})
	}

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
					goResult()
					return
				}
				// 다음 카드로 교체: 뒤에 깔려 있던 다음 카드와 동일한 내용이 중앙에
				// 그대로 나타나므로 튀지 않는다. x는 즉시 0으로 되돌린다.
				setIsFlipped(false);
				setCurrentIndex((i) => i + 1);
				x.set(0)
				animatingRef.current = false;
				setIsSwiping(false);
			},
		})
	}

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
	}

	const handleFlip = () => {
		if (animatingRef.current) return;
		setIsFlipped((f) => !f);
	}

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
	}

	/** 카드 전환 시 재생 중단 */
	useEffect(() => {
		sharedAudio.stop();
		setIsAudioPlaying(false);
	}, [currentIndex, sharedAudio]);

	/** 페이지 이탈 시 재생 중단 */
	useEffect(() => {
		return () => sharedAudio.stop();
	}, [sharedAudio]);

	useEffect(() => {
		const fetchData = async () => {
			const _cardData =
				flashcard_words.filter((item) => item.flashcard_id === flashcardId) ??
				[]
			setCardData(_cardData);

			// Ensure UserFlashcard record exists on server
			const existing = await getUserFlashcard(flashcardId, cardType);
			if (!existing) {
				await createUserFlashcard({
					bookId,
					flashcardId,
					cardType,
				})
			}
			const flashcardStatus = existing?.status ?? "new";
			setRepeatStatus(flashcardStatus as "new" | "repeat" | "complete");

			// Get saved words from server
			const savedList = await listUserFlashcardWordByType(
				flashcardId,
				cardType,
			)

			const unknowns = savedList
				.filter((item) => item.status === "unknown")
				.map((item) => item.card_id);
			setUnknownWords(unknowns);

			if (flashcardStatus === "repeat") {
				setKnownWords([]);
				setUnknownWords([]);
				const repeatCards = _cardData.filter((item) =>
					unknowns.includes(item.id),
				)
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
		}
		fetchData();
	}, []);

	return (
		<div className="flex h-full flex-col bg-[#efefef]">
			<div className="sticky top-0 z-10 items-center">
				<div className="flex h-[48px] justify-between">
					<div
						onClick={onClose}
						className="flex h-[48px] w-[48px] cursor-pointer items-center justify-center hover:bg-gray-200 active:bg-gray-300"
					>
						<X />
					</div>
					<div className="flex items-center text-[#888] text-[14px]">
						{flashcardModule?.chapter}
						{"과 - "}
						{flashcardModule?.title}
					</div>
					<div className="w-[48px]" />
				</div>
			</div>

			<div className="relative h-full flex-1">
				{/* 다음 카드(뒤에 깔려 드래그 중 자연스럽게 드러난다) */}
				{nextCard && (
					<div
						className="pointer-events-none absolute inset-x-0 top-0"
						style={{ zIndex: 1 }}
					>
						<FlashcardCard
							card={nextCard}
							cardType={cardType}
							isFlipped={false}
						/>
					</div>
				)}

				{/* 현재 카드(드래그 + 뒤집기) */}
				{currentCard && (
					<motion.div
						className="relative cursor-grab active:cursor-grabbing"
						style={{ x, rotate, zIndex: 2 }}
						drag="x"
						dragDirectionLock
						onDragEnd={handleDragEnd}
						onTap={handleFlip}
						whileTap={{ cursor: "grabbing" }}
					>
						<FlashcardCard
							card={currentCard}
							cardType={cardType}
							isFlipped={isFlipped}
							isAudioPlaying={isAudioPlaying}
							onPlay={(e) => {
								e.stopPropagation()
								playAudio()
							}}
						/>
					</motion.div>
				)}

				<div>
					<p className="mt-[12px] px-[30px] text-right font-semibold text-[14px] text-gray-400">
						{currentIndex + 1}/{cardData.length}
					</p>
				</div>
			</div>

			<div className="sticky bottom-0 grid h-[96px] grid-cols-2 gap-[16px] p-[20px]">
				<button
					type="button"
					onClick={() => swipe(-1)}
					disabled={isSwiping}
					className="flex h-[56px] cursor-pointer items-center rounded-full bg-[#FFDB5C] p-[8px] transition-colors hover:bg-yellow-400"
				>
					<div className="flex size-[40px] items-center justify-center rounded-full bg-[#FFF8E1] text-[#383A3F] text-[14px]">
						{unknownWords.length}
					</div>
					<div className="flex-1 items-center justify-center font-bold text-[#383A3F] text-[16px] text-black">
						몰라요
					</div>
				</button>
				<button
					type="button"
					onClick={() => swipe(1)}
					disabled={isSwiping}
					className="flex h-[56px] cursor-pointer items-center rounded-full bg-[#0180FF] p-[8px] transition-colors hover:bg-blue-600"
				>
					<div className="flex size-[40px] items-center justify-center rounded-full bg-[#DBEDFF] text-[#383A3F] text-[14px]">
						{knownWords.length}
					</div>
					<div className="flex-1 items-center justify-center font-bold text-[16px] text-white">
						알아요
					</div>
				</button>
			</div>
		</div>
	)
}
