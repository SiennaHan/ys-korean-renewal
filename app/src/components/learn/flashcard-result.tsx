import {
	listUserFlashcardWordByType,
	updateUserFlashcardStatus,
} from "@/api/flashcard";
import BottomSheet from "@/components/bottom-sheet";
import { flashcards } from "@/shared/data/flashcard";
import {
	type FlashcardWord,
	flashcard_words,
} from "@/shared/data/flashcard_word";
import { useSelectedCardTypeStore } from "@/shared/store/menu-store";
import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const buttonBase =
	"flex items-center h-[56px] rounded-full p-[8px] cursor-pointer hover:opacity-[0.8] active:opacity-[0.9]";

/**
 * 플래시카드 결과 — 명세 §4
 *
 * 구 경로 /book/chapter/unit/flashcard/result/$id 에 라우트로 있던 것을
 * 컴포넌트로 떼어냈다. "결과는 셸 공통이라 별도 라우트 폐지" 라는 명세대로,
 * 이제 /learn/flashcard 가 자기 상태로 이 화면을 띄운다.
 */
export default function FlashcardResult({
	flashcardId,
	onClose,
	onRetry,
}: {
	flashcardId: number;
	/** 활동을 끝내고 나간다 */
	onClose: () => void;
	/** 모르는 단어만 다시 — 카드 화면으로 되돌린다 */
	onRetry: () => void;
}) {
	const { cardType } = useSelectedCardTypeStore();

	const [sheetStatus, setSheetStatus] = useState<"known" | "unknown">(
		"unknown",
	);

	const [isOpenSheet, setIsOpenSheet] = useState(false);
	const [sheetData, setSheetData] = useState<FlashcardWord[]>([]);
	const [knownWords, setKnownWords] = useState<FlashcardWord[]>([]);
	const [unknownWords, setUnknownWords] = useState<FlashcardWord[]>([]);

	const currentCard = flashcards.find((item) => item.id === flashcardId);
	const cardData =
		flashcard_words.filter((item) => item.flashcard_id === flashcardId) ?? [];

	const onCloseSheet = () => {
		setIsOpenSheet(false);
	};

	const openSheet = (status: "known" | "unknown") => {
		setSheetStatus(status);
		setSheetData(status === "known" ? knownWords : unknownWords);
		setIsOpenSheet(true);
	};

	const percentage = Math.round((knownWords.length / cardData.length) * 100);

	const handleRestart = async () => {
		if (percentage === 100) {
			onClose();
		} else {
			// Mark as 'repeat' so the flashcard page shows only unknown words
			await updateUserFlashcardStatus({
				flashcardId,
				cardType,
				status: "repeat",
			});
			onRetry();
		}
	};

	useEffect(() => {
		const fetchData = async () => {
			const savedList = await listUserFlashcardWordByType(
				flashcardId,
				cardType,
			);
			const knowns = savedList
				.filter((item) => item.status === "known")
				.map((item) => item.card_id);
			const _knownWords = cardData.filter((item) => knowns.includes(item.id));
			setKnownWords(_knownWords);
			const unknowns = savedList
				.filter((item) => item.status === "unknown")
				.map((item) => item.card_id);
			const _unknownWords = cardData.filter((item) =>
				unknowns.includes(item.id),
			);
			setUnknownWords(_unknownWords);
		};
		fetchData();
	}, []);

	return (
		<div className="flex h-full flex-col bg-[#0180FF]">
			<div className="sticky top-0 z-10 items-center">
				<div className="flex h-[48px] justify-between">
					<div
						onClick={onClose}
						className="flex h-[48px] w-[48px] cursor-pointer items-center justify-center hover:opacity-[0.8] active:opacity-[0.9]"
					>
						<X color="white" />
					</div>
					<div className="flex items-center text-[#fff] text-[14px]">
						{"["}
						{currentCard?.chapter}
						{"과] "}
						{currentCard?.title}
					</div>
					<div className="w-[48px]" />
				</div>
			</div>
			<div className="flex h-full flex-col p-4">
				{percentage === 100 ? (
					<div className="mb-2 px-[10px] text-white">
						<p className="mb-2 font-bold text-[24px]">
							{"훌륭해요! 단어를 다 외웠어요 :)"}
						</p>
						<p className="font-semibold text-[#DBEDFF] text-[16px]">
							이 세트의 단어를 완벽하게 익혔어요.
						</p>
						<p className="font-semibold text-[#DBEDFF] text-[16px]">
							다음 단계로 가볼까요?
						</p>
					</div>
				) : (
					<div className="mb-2 px-[10px] text-white">
						<p className="mb-2 font-bold text-[24px]">
							잘했어요! 거의 다 왔어요.
						</p>
						<p className="font-semibold text-[#DBEDFF] text-[16px]">
							아직 익히지 못한 단어들이 있어요.
						</p>
						<p className="font-semibold text-[#DBEDFF] text-[16px]">
							한번 더 복습해 볼까요?
						</p>
					</div>
				)}
				<div className="m-2 rounded-[20px] bg-white pt-8 shadow-sm">
					<div className="mb-8 flex justify-center">
						<div className="relative h-48 w-48">
							<svg className="-rotate-90 h-full w-full transform">
								<circle
									cx="96"
									cy="96"
									r="75"
									stroke="#DBEDFF"
									strokeWidth="16"
									fill="none"
								/>
								<circle
									cx="96"
									cy="96"
									r="75"
									stroke="#0180FF"
									strokeWidth="16"
									fill="none"
									strokeLinecap="round"
									strokeDasharray={`${2 * Math.PI * 88}`}
									strokeDashoffset={`${2 * Math.PI * 88 * (1 - percentage / 100)}`}
								/>
							</svg>
							<div className="absolute inset-0 flex items-center justify-center">
								<span className="font-bold text-[#0180FF] text-[32px]">
									{percentage}%
								</span>
							</div>
						</div>
					</div>

					<div className="mb-[12px] grid grid-cols-2 gap-[12px] px-[12px]">
						<div
							className={clsx(buttonBase, "bg-[#FFDB5C]")}
							onClick={() => openSheet("unknown")}
						>
							<div className="flex size-[40px] items-center justify-center rounded-full bg-[#FFF8E1] text-[#383A3F] text-[14px]">
								{unknownWords.length}
							</div>
							<div className="flex flex-1 items-center justify-center font-bold text-[#383A3F] text-[16px] text-black">
								모르는 단어
							</div>
						</div>

						<div
							className={clsx(buttonBase, "bg-[#0180FF]")}
							onClick={() => openSheet("known")}
						>
							<div className="flex size-[40px] items-center justify-center rounded-full bg-[#DBEDFF] text-[#383A3F] text-[14px]">
								{knownWords.length}
							</div>
							<div className="flex flex-1 items-center justify-center font-bold text-[16px] text-white">
								아는 단어
							</div>
						</div>
					</div>
				</div>

				<div className="flex-1" />

				<button
					onClick={handleRestart}
					className="sticky bottom-0 h-[56px] w-full cursor-pointer rounded-[10px] bg-white font-bold text-[#0180FF] text-[16px] transition-colors hover:opacity-[0.8]"
				>
					{percentage === 100 ? "끝내기" : "모르는 단어 한번 더 학습하기"}
				</button>
			</div>
			<BottomSheet
				isOpen={isOpenSheet}
				onClose={onCloseSheet}
				title={sheetStatus === "known" ? "아는 단어" : "모르는 단어"}
				count={sheetData.length}
			>
				<div>
					<div className="grid gap-2 text-gray-600">
						{sheetData.map((item) => (
							<div
								key={item.id}
								className="flex h-[56px] items-center justify-between rounded-[8px] bg-[#F9FAFC] px-4"
							>
								<div>{item.word}</div>
								<div>{item.meaning}</div>
							</div>
						))}
					</div>
				</div>
			</BottomSheet>
		</div>
	);
}
