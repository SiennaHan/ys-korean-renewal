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
	/** 미리 볼 낱말 — [한국어, 뜻] */
	words: [string, string][];
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
	onExit,
	onStart,
}: {
	lesson: string;
	content: BriefingContent;
	onExit?: () => void;
	onStart?: () => void;
}) {
	const { t } = useTranslation();
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
							{content.words.length > 0 && (
								<div className="word-strip">
									{content.words.map(([word, meaning]) => (
										<div key={word}>
											<b>{word}</b>
											<span>{meaning}</span>
										</div>
									))}
								</div>
							)}
						</div>
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
