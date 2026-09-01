import { useTranslation } from "react-i18next";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	Dock,
	PrimaryButton,
} from "./shell";

export interface BriefingContent {
	/** 한국어 제목 — 배울 말 */
	title: string;
	/** 이해를 돕는 번역 */
	titleTranslated: string;
	scene: string;
	sceneTranslated: string;
	/** 미션 키워드 — [무엇을, 언제] */
	keywords: [string, string][];
	/**
	 * 미션마다 모범 문장 — [한국어, 번역]. `keywords` 와 **같은 순서**다.
	 *
	 * **여기서만 보여 준다.** 대화 화면에는 힌트를 여는 길이 없다 — 그래서 대화
	 * 중에는 베낄 문장이 화면에 없고, 미션 발화는 전부 기억에서 나온다.
	 * 「스스로 말한다」를 재는 자리가 여기 하나로 좁아진다(개발 요청 v53 §2).
	 *
	 * 비어 있으면 힌트 버튼을 아예 안 그린다.
	 */
	hints?: [string, string][];
	/** 원장에 있는 실제 상황 이미지. 없을 때만 빈 이미지 자리를 쓴다 */
	sceneImageUrl?: string;
}

/**
 * 미션 대화에 들어가기 전 브리핑.
 *
 * 여백을 여기서 0 으로 되돌린다 — 제목 띠와 구역이 화면 폭을 꽉 채우고
 * 안쪽 카드가 자기 여백을 잡는 구조라 바깥 padding 이 있으면 띠가 떠 보인다.
 * 진행 막대도 피드백 칸도 없다. 문제를 푸는 화면이 아니다.
 */
export function BriefingScreen({
	lesson,
	content,
	hintOpen = false,
	onHintToggle,
	onExit,
	onStart,
}: {
	lesson: string;
	content: BriefingContent;
	/**
	 * 힌트가 펼쳐져 있나. **부모가 쥔다.**
	 *
	 * 안에서 `useState` 로 두지 않은 이유가 둘이다 — ① 「열었다」가 지표라
	 * 부모가 알아야 기록한다(`hint_opened_at_briefing`), ② 목업 대조가 두 상태를
	 * 각각 그려야 하는데 안에 숨겨 두면 열린 쪽을 그릴 길이 없다.
	 */
	hintOpen?: boolean;
	onHintToggle?: () => void;
	onExit?: () => void;
	onStart?: () => void;
}) {
	const { t } = useTranslation();
	const hints = content.hints ?? [];
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} />
			<main className="activity-content" style={{ padding: 0 }}>
				<div className="scroll-area" style={{ padding: 0 }}>
					<div className="brief-title">
						<h2>{content.title}</h2>
						<p>{content.titleTranslated}</p>
					</div>

					<div className="brief-sec">
						<h3>{t("briefing.scenario")}</h3>
						<div className="brief-card">
							<div className="scene-img">
								{content.sceneImageUrl ? (
									<img src={content.sceneImageUrl} alt="" />
								) : (
									<span aria-hidden="true">{t("activity.sceneImageAlt")}</span>
								)}
							</div>
							<div className="scene-text">
								{content.scene}
								<div style={{ color: "var(--blue-gray-400)" }}>
									{content.sceneTranslated}
								</div>
							</div>
						</div>
					</div>

					<div className="brief-sec">
						<h3>{t("briefing.keyword")}</h3>
						<div className="brief-card">
							<div style={{ display: "grid", gap: 8 }}>
								{content.keywords.map(([what, when]) => (
									<div className="kw-line" key={what}>
										<b>{what}</b>
										<span>{when}</span>
									</div>
								))}
							</div>
						</div>
						{hints.length > 0 && (
							<button
								type="button"
								className="hint-toggle"
								data-action="briefHint"
								aria-expanded={hintOpen}
								onClick={onHintToggle}
							>
								{hintOpen ? t("briefing.hintClose") : t("briefing.hintOpen")}
							</button>
						)}
						{hintOpen && (
							<div className="brief-card hint-card">
								{content.keywords.map(([what], i) =>
									hints[i] ? (
										<div className="kw-hint" key={what}>
											<b>{what}</b>
											<div>
												<strong>{hints[i][0]}</strong>
												<span>{hints[i][1]}</span>
											</div>
										</div>
									) : null,
								)}
							</div>
						)}
					</div>
				</div>
			</main>
			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={t("briefing.start")}
						on
						action="startChat"
						onClick={onStart}
					/>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}
