import { useTranslation } from "react-i18next";
import { IconVolume } from "./icons";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Dock,
} from "./shell";

export interface Flashcard {
	word: string;
	meaning: string;
	/** 품사 */
	kind: string;
}

/**
 * 플래시카드.
 *
 * 골격을 그대로 쓰지 않는 유일한 문제 화면이다 — 스크롤도 피드백 칸도 없다.
 * 카드가 화면 가운데를 다 쓰고, 채점 대신 "알아요 / 몰라요"를 학생이 스스로 고른다.
 * 그래서 하단이 다음 버튼이 아니라 판정 두 개다.
 */
export function FlashcardScreen({
	lesson,
	index,
	total,
	card,
	flipped,
	knownCount,
	unknownCount,
	onExit,
	onSkip,
	onFlip,
	onKnown,
	onUnknown,
}: {
	lesson: string;
	index: number;
	total: number;
	card: Flashcard;
	flipped: boolean;
	knownCount: number;
	unknownCount: number;
	onExit?: () => void;
	onSkip?: () => void;
	onFlip?: () => void;
	onKnown?: () => void;
	onUnknown?: () => void;
}) {
	const { t } = useTranslation();
	const audioLabel = t("activity.audioOf", { word: card.word });
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			<ActivityProgress current={index} total={total} />
			<div className="flash-body">
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: 카드 전체가 누르는 자리다 */}
				<div className="flash-stage" data-action="flip" onClick={onFlip}>
					{/* 다음 카드가 뒤에 겹쳐 보인다 — 몇 장 남았는지가 눈으로 잡힌다 */}
					<div className="flash-next" />
					<div className={`flash-card ${flipped ? "flipped" : ""}`}>
						<div className="flash-face">
							<strong>{card.word}</strong>
							<button
								type="button"
								className="card-audio"
								data-action="audio"
								aria-label={audioLabel}
							>
								<IconVolume />
							</button>
						</div>
						<div className="flash-face back">
							<strong>{card.meaning}</strong>
							<span className="kind">{card.kind}</span>
							<div className="flash-picture">{t("activity.picture")}</div>
							<button
								type="button"
								className="card-audio"
								data-action="audio"
								aria-label={audioLabel}
							>
								<IconVolume />
							</button>
						</div>
					</div>
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
							onClick={onUnknown}
						>
							<span className="badge">{unknownCount}</span>
							<span className="label">{t("activity.flashUnknown")}</span>
						</button>
						<button
							type="button"
							className="known"
							data-action="known"
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
