import type {
	MouseEvent as ReactMouseEvent,
	ReactNode,
	PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { IconSpinner, IconVolume } from "./icons";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Dock,
} from "./shell";

/**
 * 카드 한 장에 적히는 글자.
 *
 * 앞뒤 중 어느 쪽이 한국어인지는 학생이 고른 방향(cardType)이 정한다 —
 * 그래서 `word` · `meaning` 이라 부르지 않는다. 그렇게 부르면 "뜻 → 낱말"
 * 방향에서 이름이 거짓말을 한다. 방향을 푸는 것은 배선의 몫이고, 여기는
 * **앞 · 뒤 · 뒤의 작은 줄** 세 자리만 안다.
 */
export interface Flashcard {
	/** 앞면의 큰 글자 */
	front: string;
	/** 뒤집었을 때의 큰 글자 — 이것이 답이다 */
	back: string;
	/** 뒷면의 작은 줄 */
	sub: string;
	/** 소리로 읽는 낱말. 방향이 어느 쪽이든 이건 늘 한국어다 */
	spoken?: string;
	/** 뒷면 그림. 없으면 목업처럼 자리만 잡는 회색 칸이 남는다 */
	imageUrl?: string;
}

/**
 * 플래시카드.
 *
 * 골격을 그대로 쓰지 않는 유일한 문제 화면이다 — 스크롤도 피드백 칸도 없다.
 * 카드가 화면 가운데를 다 쓰고, 채점 대신 "알아요 / 몰라요"를 학생이 스스로 고른다.
 * 그래서 하단이 다음 버튼이 아니라 판정 두 개다.
 *
 * **제품이 그대로 그리는 화면이다**(2026-08-26). 전에는 라우트가 같은 마크업을
 * 손으로 한 벌 더 갖고 있어서, 대조는 아무도 안 보는 쪽을 보고 있었다. 스와이프를
 * 붙이려면 카드에 겉옷이 하나 필요한데 그것만 `wrapCard` 로 열어 두고, 나머지는
 * 여기서 그린다.
 */
export function FlashcardScreen({
	lesson,
	index,
	total,
	card,
	flipped,
	knownCount,
	unknownCount,
	/** 소리를 받아 오는 중 — 버튼이 스피너로 바뀐다 */
	audioBusy = false,
	/** 카드가 날아가는 동안 판정을 두 번 먹지 않게 */
	judgeDisabled = false,
	onExit,
	onSkip,
	onFlip,
	onAudio,
	/** 스와이프가 소리 버튼에서 시작되지 않게 막는 자리 */
	onAudioPointerDown,
	onKnown,
	onUnknown,
	/**
	 * 카드에 겉옷을 입힌다. 기본은 맨 div 하나 — 목업의 구조가 그렇다.
	 * 제품은 여기에 framer-motion 을 물려 끌기·스와이프를 얹는다.
	 */
	wrapCard = (cardNode) => <div className="flash-motion">{cardNode}</div>,
}: {
	lesson: string;
	index: number;
	total: number;
	card: Flashcard;
	flipped: boolean;
	knownCount: number;
	unknownCount: number;
	audioBusy?: boolean;
	judgeDisabled?: boolean;
	onExit?: () => void;
	onSkip?: () => void;
	onFlip?: () => void;
	onAudio?: (e: ReactMouseEvent) => void;
	onAudioPointerDown?: (e: ReactPointerEvent) => void;
	onKnown?: () => void;
	onUnknown?: () => void;
	wrapCard?: (cardNode: ReactNode) => ReactNode;
}) {
	const { t } = useTranslation();
	const audioLabel = t("activity.audioOf", { word: card.spoken ?? card.front });
	const audioButton = (
		<button
			type="button"
			className="card-audio"
			data-action="audio"
			aria-label={audioLabel}
			disabled={audioBusy}
			onClick={onAudio}
			onPointerDown={onAudioPointerDown}
		>
			{audioBusy ? <IconSpinner /> : <IconVolume />}
		</button>
	);

	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			<ActivityProgress current={index} total={total} />
			<div className="flash-body">
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: 카드 전체가 누르는 자리다 */}
				<div className="flash-stage" data-action="flip" onClick={onFlip}>
					{/* 다음 카드가 뒤에 겹쳐 보인다 — 몇 장 남았는지가 눈으로 잡힌다 */}
					<div className="flash-next" />
					{wrapCard(
						<div className={`flash-card ${flipped ? "flipped" : ""}`}>
							<div className="flash-face">
								<strong>{card.front}</strong>
								{audioButton}
							</div>
							<div className="flash-face back">
								<strong>{card.back}</strong>
								<span className="kind">{card.sub}</span>
								<div className="flash-picture">
									{card.imageUrl ? (
										<img src={card.imageUrl} alt={card.spoken ?? card.front} />
									) : (
										t("activity.picture")
									)}
								</div>
								{audioButton}
							</div>
						</div>,
					)}
				</div>
				<div className="flash-meta">
					{flipped ? t("activity.flashBack") : t("activity.flashFront")}
				</div>
			</div>
			<ActivityFooter>
				<Dock>
					<div className="judge">
						<button
							type="button"
							className="unknown"
							data-action="unknown"
							disabled={judgeDisabled}
							onClick={onUnknown}
						>
							<span className="badge">{unknownCount}</span>
							<span className="label">{t("activity.flashUnknown")}</span>
						</button>
						<button
							type="button"
							className="known"
							data-action="known"
							disabled={judgeDisabled}
							onClick={onKnown}
						>
							<span className="badge">{knownCount}</span>
							<span className="label">{t("activity.flashKnown")}</span>
						</button>
					</div>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}
