import { useTranslation } from "react-i18next";
import { IconDown, IconKeyboard, IconUp } from "./icons";
import { RecordControl, type RecordMode } from "./record";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	Dock,
	PrimaryButton,
} from "./shell";

export interface ChatTurn {
	who: "bot" | "me";
	text: string;
	/** 이 말이 몇 번째 미션을 채웠나 */
	hit?: number;
	/** 고칠 곳이 있던 말 */
	bad?: boolean;
	tip?: string;
}

/**
 * 미션 대화.
 *
 * 문항을 푸는 화면이 아니라 대화가 쌓이는 화면이라 골격을 쓰지 않는다 —
 * 진행 막대 대신 미션 줄이 진행을 말하고, 스크롤 영역 대신 실이 자란다.
 * 하단도 다르다. 대화 중에는 녹음 도크(chat-footer)이고 다 끝나면
 * 보통 도크의 "결과 보기"로 바뀐다.
 */
export function ChatScreen({
	lesson,
	scenario,
	scenarioTranslated,
	folded,
	missions,
	/** 지금까지 채운 미션 번호 */
	hits,
	turns,
	/** 봇이 답을 쓰는 중 */
	waiting,
	complete,
	recordMode,
	onExit,
	onSkip,
	onFold,
	onRecord,
	onKeyboard,
	onResult,
}: {
	lesson: string;
	scenario: string;
	scenarioTranslated: string;
	folded?: boolean;
	missions: string[];
	hits: Set<number>;
	turns: ChatTurn[];
	waiting?: boolean;
	complete?: boolean;
	recordMode: RecordMode;
	onExit?: () => void;
	onSkip?: () => void;
	onFold?: () => void;
	onRecord?: () => void;
	onKeyboard?: () => void;
	onResult?: () => void;
}) {
	const { t } = useTranslation();
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />

			{/* 무엇을 하러 왔는지. 대화가 길어지면 접어 자리를 내준다 */}
			<section className={`scenario ${folded ? "folded" : ""}`}>
				<div className="scenario-copy">
					<div className="ko">{scenario}</div>
					{!folded && <div className="en">{scenarioTranslated}</div>}
				</div>
				<button
					type="button"
					className="fold"
					data-action="chatFold"
					aria-label={t("activity.scenarioFold")}
					onClick={onFold}
				>
					{folded ? <IconDown /> : <IconUp />}
				</button>
			</section>

			<div className="missions">
				<span className="mission-title">{t("player.viewMission")}</span>
				{missions.map((mission, i) => (
					<span
						key={mission}
						className={`mission ${hits.has(i) ? "done" : ""}`}
					>
						{hits.has(i) ? "✓" : "○"} {mission}
					</span>
				))}
			</div>

			<div className="thread">
				{turns.map((turn, i) =>
					turn.who === "bot" ? (
						// biome-ignore lint/suspicious/noArrayIndexKey: 같은 말이 두 번 나올 수 있다
						<div className="msg" key={i}>
							<span className="avatar">🧑‍🍳</span>
							<div className="bubble-wrap">
								<div className="bubble">{turn.text}</div>
							</div>
						</div>
					) : (
						// biome-ignore lint/suspicious/noArrayIndexKey: 같은 말이 두 번 나올 수 있다
						<div className={`msg me ${turn.bad ? "bad" : ""}`} key={i}>
							<div className="bubble-wrap">
								<div className="bubble">{turn.text}</div>
								{turn.tip && <div className="tip">! {turn.tip}</div>}
							</div>
						</div>
					),
				)}
				{waiting && (
					<div className="msg">
						<span className="avatar">🧑‍🍳</span>
						<span className="typing">
							<i />
							<i />
							<i />
						</span>
					</div>
				)}
			</div>

			{complete ? (
				<ActivityFooter>
					<Dock>
						<PrimaryButton
							label={t("player.showResult")}
							on
							onClick={onResult}
						/>
					</Dock>
				</ActivityFooter>
			) : (
				<div className="chat-footer">
					<div className="dock">
						<button
							type="button"
							className="keyboard"
							aria-label={t("activity.keyboardInput")}
							onClick={onKeyboard}
						>
							<IconKeyboard />
						</button>
						<div className="main">
							<RecordControl
								mode={recordMode}
								action="chatRecord"
								onPress={onRecord}
							/>
						</div>
						{/* 왼쪽 키보드와 짝이 맞아야 녹음 조작이 가운데 온다 */}
						<span className="slot" aria-hidden="true" />
					</div>
				</div>
			)}
		</ActivityFrame>
	);
}
