import {
	listUserFlashcardWordByType,
	updateUserFlashcardStatus,
} from "@/api/flashcard";
import BottomSheet from "@/components/bottom-sheet";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	Dock,
	PrimaryButton,
} from "@/components/main/activity";
import { flashcards } from "@/shared/data/flashcard";
import {
	type FlashcardWord,
	flashcard_words,
	meaningFor,
} from "@/shared/data/flashcard_word";
import { useSelectedCardTypeStore } from "@/shared/store/menu-store";
import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * 플래시카드 결과 — 명세 §4
 *
 * 구 경로 /book/chapter/unit/flashcard/result/$id 에 라우트로 있던 것을
 * 컴포넌트로 떼어냈다. "결과는 셸 공통이라 별도 라우트 폐지" 라는 명세대로,
 * 이제 /learn/flashcard 가 자기 상태로 이 화면을 띄운다.
 */
export default function FlashcardResult({
	flashcardId,
	knownIds,
	unknownIds,
	onClose,
	onRetry,
}: {
	flashcardId: number;
	/** 방금 끝낸 세션의 판정. 서버 반영을 기다리지 않고 결과에 즉시 쓴다. */
	knownIds?: string[];
	unknownIds?: string[];
	/** 활동을 끝내고 나간다 */
	onClose: () => void;
	/** 모르는 단어만 다시 — 카드 화면으로 되돌린다 */
	onRetry: () => void;
}) {
	const { t, i18n } = useTranslation();
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

	const percentage = cardData.length
		? Math.round((knownWords.length / cardData.length) * 100)
		: 0;

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

	/*
	 * 방금 끝낸 세션의 판정이 있으면 그것을 즉시 쓰고, 직접 결과 화면에 들어온
	 * 경우에만 서버 기록을 읽어 아는/모르는 단어를 가른다.
	 * cardData 는 컴포넌트 안에서 filter 로 매 렌더 새로 만드는 배열이라, 의존성에
	 * 넣으면 효과가 매 렌더 다시 돌고 안에서 setState 를 하므로 무한 렌더가 된다.
	 * flashcardId·cardType 은 이 화면이 떠 있는 동안 바뀌지 않는다(카드 세트를
	 * 바꾸면 부모가 카드 화면으로 되돌린다).
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 1회 조회 — 위 주석 참고
	useEffect(() => {
		const fetchData = async () => {
			if (knownIds || unknownIds) {
				setKnownWords(
					cardData.filter((item) => (knownIds ?? []).includes(item.id)),
				);
				setUnknownWords(
					cardData.filter((item) => (unknownIds ?? []).includes(item.id)),
				);
				return;
			}
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
		<>
			<ActivityFrame>
				<ActivityAppBar
					lesson={t("player.chapterActivity", {
						seq: currentCard?.chapter ?? "",
						title: currentCard?.title ?? t("catalog.act.flashcard"),
					})}
					onExit={onClose}
				/>
				<main className="activity-content flash-result-content">
					<div className="result-head">
						<h2>
							{percentage === 100
								? t("flashResult.titlePerfect")
								: t("flashResult.titleDone")}
						</h2>
						<p>
							{percentage === 100
								? t("flashResult.bodyPerfect")
								: t("flashResult.bodyPartial")}
						</p>
						<div className="stat-row flash-result-stat">
							<button type="button" onClick={() => openSheet("unknown")}>
								<span>{t("flashResult.unknownWords")}</span>
								<strong>{unknownWords.length}</strong>
							</button>
							<button type="button" onClick={() => openSheet("known")}>
								<span>{t("flashResult.knownWords")}</span>
								<strong>{knownWords.length}</strong>
							</button>
						</div>
					</div>
					<div className="scroll-area flash-result-body">
						<div
							className="flash-result-ring"
							style={{ "--flash-rate": percentage } as CSSProperties}
						>
							<strong>{percentage}%</strong>
							<span>{t("flashResult.knowRate")}</span>
						</div>
						<p>{t("flashResult.tapNumbersHint")}</p>
					</div>
				</main>
				<ActivityFooter>
					<Dock mainStyle={{ gap: 12 }}>
						{percentage < 100 && (
							<PrimaryButton
								label={t("flashResult.retryUnknown")}
								on
								onClick={handleRestart}
							/>
						)}
						<PrimaryButton
							label={t("flashResult.finish")}
							on
							onClick={onClose}
						/>
					</Dock>
				</ActivityFooter>
			</ActivityFrame>
			<BottomSheet
				isOpen={isOpenSheet}
				onClose={onCloseSheet}
				title={
					sheetStatus === "known"
						? t("flashResult.knownWords")
						: t("flashResult.unknownWords")
				}
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
								<div>{meaningFor(item, i18n.language)}</div>
							</div>
						))}
					</div>
				</div>
			</BottomSheet>
		</>
	);
}
