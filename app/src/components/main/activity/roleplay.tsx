import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { IconNext, IconVolume } from "./icons";
import { ListenControl, RecordControl, type RecordMode } from "./record";
import { ActivityAppBar, ActivityFooter, ActivityFrame } from "./shell";

export interface RoleTurn {
	/** 화면에 그대로 나오는 이름 — "나" 또는 상대 */
	who: string;
	mine: boolean;
	ko: string;
	en: string;
}

/**
 * 롤플레잉.
 *
 * 대본이 통째로 보이고 그 위를 차례가 지나간다 — 대화(chat)와 달리 할 말이
 * 정해져 있어 앞뒤를 다 볼 수 있고, 아무 줄이나 눌러 되돌아갈 수 있다.
 * 그래서 실이 자라는 대신 목록이 서 있다.
 */
export function RoleplayScreen({
	lesson,
	turns,
	current,
	/** ai → 나 로 연습할지, 나 → ai 로 할지 */
	direction,
	recordMode,
	/** 녹음을 마친 뒤 지금 줄 아래 붙는 확인 카드 */
	heard,
	onExit,
	onSkip,
	onJump,
	onDirection,
	onRecord,
	onNext,
}: {
	lesson: string;
	turns: RoleTurn[];
	current: number;
	direction: "ai" | "me";
	recordMode: RecordMode;
	heard?: string;
	onExit?: () => void;
	onSkip?: () => void;
	onJump?: (index: number) => void;
	onDirection?: (direction: "ai" | "me") => void;
	onRecord?: () => void;
	onNext?: () => void;
}) {
	const { t } = useTranslation();
	const turn = turns[current];
	const mine = turn?.mine ?? false;
	// 내 차례면 녹음을 마쳐야 넘어간다. AI 차례면 언제든 넘어간다
	const ready = !mine || recordMode === "done";

	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />

			<section className="role-intro">
				<div className="role-title">{t("activity.roleIntro")}</div>
			</section>

			<div className="turns">
				<div className="script-toolbar">
					<span>{t("activity.rolePracticeOrder")}</span>
					<div
						className="role-order"
						role="group"
						aria-label={t("activity.rolePracticeOrder")}
					>
						<button
							type="button"
							className={direction === "ai" ? "on" : ""}
							data-action="roleAi"
							aria-pressed={direction === "ai"}
							onClick={() => onDirection?.("ai")}
						>
							{t("activity.roleAiFirst")}
						</button>
						<button
							type="button"
							className={direction === "me" ? "on" : ""}
							data-action="roleMe"
							aria-pressed={direction === "me"}
							onClick={() => onDirection?.("me")}
						>
							{t("activity.roleMeFirst")}
						</button>
					</div>
				</div>

				{turns.map((row, i) => (
					<Fragment key={row.ko}>
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: 줄 전체가 누르는 자리다 */}
						<div
							className={`turn ${i === current ? "current" : i > current ? "future" : ""} ${row.mine ? "me" : "ai"}`}
							data-action="roleJump"
							data-index={i}
							onClick={() => onJump?.(i)}
						>
							<span className="who">{row.who}</span>
							<span className="line">{row.ko}</span>
							{/* 아직 안 지나온 줄은 소리를 미리 들려주지 않는다 */}
							<span className="listen">
								{i <= current ? <IconVolume /> : null}
							</span>
						</div>
						{row.mine && i === current && heard && (
							<div className="record-card">
								<div className="meta">
									{row.en} · [{row.ko}]
								</div>
								<div className="heard">
									{t("activity.myPronunciation")} · {heard}
								</div>
							</div>
						)}
					</Fragment>
				))}
			</div>

			<ActivityFooter>
				<div className="dock">
					{/* 오른쪽 다음 버튼과 폭을 맞춰 주 조작을 가운데 세운다 */}
					<span className="slot" aria-hidden="true" />
					<div className="main">
						{mine ? (
							<RecordControl
								mode={recordMode}
								action="roleRecord"
								onPress={onRecord}
							/>
						) : (
							<ListenControl />
						)}
					</div>
					<button
						type="button"
						className="slot"
						data-action="roleNext"
						aria-label={t("player.next")}
						disabled={!ready}
						onClick={onNext}
					>
						<IconNext />
					</button>
				</div>
			</ActivityFooter>
		</ActivityFrame>
	);
}
