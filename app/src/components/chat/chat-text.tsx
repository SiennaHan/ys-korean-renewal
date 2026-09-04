import { translate } from "@/api/chat";
import { SpeakerIcon, TranslationIcon } from "@/assets/icons";
import { IconSpinner } from "@/components/main/activity";
import clsx from "clsx";
import {
	CircleAlert,
	Languages,
	Lightbulb,
	MessageCircleWarning,
	RotateCcw,
	Volume2,
} from "lucide-react";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

export const chatBaseButton =
	"size-[60px] bg-[#4396F4] text-white text-[16px] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#4396F4dd] active:bg-[#4396F4cc] \
															disabled:bg-[#bbb] disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-[#bbb]";
export const chatBaseWhiteButton =
	"size-[44px] bg-[#DBEDFF] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#eee] active:bg-[#ddd] \
																		disabled:bg-[#fff] disabled:shadow-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#fff]";
export const chatBaseRedButton =
	"size-[44px] bg-[#FFE8E8] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#eee] active:bg-[#ddd] \
																	disabled:bg-[#fff] disabled:shadow-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#fff]";
export const chatBaseTextItem =
	"cursor-pointer hover:text-[#555] active:text-[#333]";

/** 봇이 답을 쓰는 중. 목업 정본의 `.typing` 이다 — 점 셋이 차례로 뛴다 */
const TypingIndicator = () => {
	return (
		<span className="typing">
			<i />
			<i />
			<i />
		</span>
	);
};

interface ChatInterface {
	msg: string;
	alertMsg?: string | null | undefined;
	/** 교정 예시 문장 — **항상 한국어다**(서버 프롬프트가 그렇게 지시한다).
	 * 해설(`alertMsg`)은 학습자 모국어라, 한 상자에 두 글자 체계가 섞인다. */
	correction?: string | null | undefined;
	isAudioLoading?: boolean;
	replayAudio?: () => void;
}

/** 클릭 시 살짝 커졌다 돌아오는 pop 모션 버튼 — 캐시 재생처럼 즉시 끝나는
 *  동작은 로딩 표시가 없어 눌린 걸 알 수 없으므로 클릭 피드백을 모션으로 준다. */
const PopIconButton = ({
	onClick,
	disabled,
	children,
}: {
	onClick: () => void;
	disabled?: boolean;
	children: React.ReactNode;
}) => {
	// key 를 바꿔 버튼을 리마운트 → 연속 클릭에도 애니메이션이 매번 재시작
	const [popCount, setPopCount] = useState(0);
	return (
		<button
			type="button"
			key={popCount}
			onClick={() => {
				setPopCount((c) => c + 1);
				onClick();
			}}
			className={clsx("mission-tool", popCount > 0 && "animate-btn-pop")}
			disabled={disabled}
		>
			{children}
		</button>
	);
};

interface CompleteBoxInterface {
	closeDialog: () => void;
}

export const BotMsgBox = ({
	msg,
	isAudioLoading,
	replayAudio,
}: ChatInterface) => {
	const [transText, setTransText] = useState<string | null>(null);
	const [isShowTans, setIsShowTrans] = useState(true);
	const [isTranslating, setIsTranslating] = useState(false);
	const translateMsg = async () => {
		if (transText !== null) {
			setIsShowTrans(!isShowTans);
		} else {
			setIsTranslating(true);
			const res = await translate(msg);
			setTransText(res?.translated ?? "");
			setIsTranslating(false);
		}
	};
	return (
		<div className="mission-msg mission-msg-bot">
			<span className="mission-avatar">
				<img alt="" src="/images/chat_ai_img.svg" width="40" height="40" />
			</span>
			<div className="mission-bubble">
				<p>{msg}</p>
				{replayAudio && (
					<div className="mission-tools">
						<PopIconButton onClick={replayAudio} disabled={isAudioLoading}>
							{isAudioLoading ? (
								<IconSpinner />
							) : (
								<SpeakerIcon color={"#4396f4"} />
							)}
						</PopIconButton>
						<PopIconButton onClick={translateMsg} disabled={isTranslating}>
							{isTranslating ? (
								<IconSpinner />
							) : (
								<TranslationIcon color={"#4396f4"} />
							)}
						</PopIconButton>
					</div>
				)}
				{transText && isShowTans && (
					<div className="mission-trans">{transText}</div>
				)}
			</div>
		</div>
	);
};

export const UserMsgBox = ({ msg }: ChatInterface) => {
	return (
		<div className="mission-msg mission-msg-me">
			<div className="mission-bubble">
				<p>{msg}</p>
			</div>
		</div>
	);
};

/**
 * 사용자 발화 피드백 박스 — 두 줄이다.
 *
 *   위  교정 예시(`correction`) — **한국어**. 학습자가 바로 따라 말할 문장이다
 *   아래 해설(`text`) — **학습자 모국어**. 서버가 이미 그 언어로 만들어 준다
 *
 * **서버가 교정 문장을 매 발화마다 만드는데 앱이 한 번도 그리지 않고 있었다**
 * (`recommend_example` — 2026-09-03 확인. 앱 전체에서 타입 선언과 파싱 기본값
 * 둘뿐이었다). 기획자가 요구한 「고친 문장 + 짧은 이유」의 앞쪽이 그것이다.
 *
 * 두 줄의 글자 체계가 달라서 교정 문장만 굵게 두고 색을 주지 않는다 — 해설은
 * tip/오류에 따라 컴포넌트가 색을 인라인으로 주는데, 거기에 한국어까지 같은 색으로
 * 물들이면 「이 색이 무슨 뜻인가」가 두 가지가 된다.
 */
const FeedbackBox = ({
	text,
	correction,
	color,
	icon,
}: {
	text: string;
	correction?: string | null | undefined;
	color: string;
	icon: React.ReactNode;
}) => {
	return (
		<div className="mission-feedback">
			<span className="mission-feedback-icon">{icon}</span>
			<span className="mission-feedback-body">
				{correction && (
					<span className="mission-correction">{correction}</span>
				)}
				{text && (
					<span className="mission-feedback-text" style={{ color }}>
						{text}
					</span>
				)}
			</span>
		</div>
	);
};

export const AlertUserMsgBox = ({ msg, alertMsg, correction }: ChatInterface) => {
	return (
		<div className="mission-msg mission-msg-me mission-msg-wrong">
			<div className="mission-bubble">
				<p>{msg}</p>
				{(alertMsg || correction) && (
					<FeedbackBox
						text={alertMsg ?? ""}
						correction={correction}
						color="#F76853"
						icon={
							// size 가 "px" 였다 — 무효값이라 SVG 가 width="px" 로 나갔다.
							// 아래 Lightbulb 는 "16px" 로 정상이었다(2026-09-03)
							<MessageCircleWarning color="#fff" fill="#F76853" size="16px" />
						}
					/>
				)}
			</div>
		</div>
	);
};

export const TipUserMsgBox = ({ msg, alertMsg, correction }: ChatInterface) => {
	return (
		<div className="mission-msg mission-msg-me mission-msg-tip">
			<div className="mission-bubble">
				<p>{msg}</p>
				{(alertMsg || correction) && (
					<FeedbackBox
						text={alertMsg ?? ""}
						correction={correction}
						color="#0073E6"
						icon={<Lightbulb color="#0073E6" size="16px" />}
					/>
				)}
			</div>
		</div>
	);
};

export const BotMsgProgress = () => {
	return (
		<div className="mission-msg mission-msg-bot">
			<span className="mission-avatar">
				<img alt="" src="/images/chat_ai_img.svg" width="40" height="40" />
			</span>
			<TypingIndicator />
		</div>
	);
};

/**
 * AI 응답을 못 받았을 때 — **무한 스피너 대신** 이 자리에 뜬다(DEV-12).
 *
 * 전에는 `postChat` 이 실패(타임아웃 포함)하면 아무 상태도 안 바뀌어
 * `BotMsgProgress` 가 영원히 돌았다 — 사용자는 답이 오는지 끊겼는지 알 길이
 * 없었다. 목업엔 이 상태가 없어 새로 만들었다 — 기존 `FeedbackBox` · 흰
 * 아이콘 버튼과 같은 부품을 재써서 새 시각 언어를 안 만들었다.
 */
export const BotMsgError = ({ onRetry }: { onRetry: () => void }) => {
	const { t } = useTranslation();
	return (
		<div className="mission-msg mission-msg-bot">
			<span className="mission-avatar">
				<img alt="" src="/images/chat_ai_img.svg" width="40" height="40" />
			</span>
			<div className="mission-bubble">
				<FeedbackBox
					text={t("missionChat.errNoResponse")}
					color="#F76853"
					icon={<MessageCircleWarning color="#fff" fill="#F76853" size="px" />}
				/>
				<div className="mission-tools">
					<PopIconButton onClick={onRetry}>
						<RotateCcw color="#4396f4" size={16} />
					</PopIconButton>
				</div>
			</div>
		</div>
	);
};

export const CompletedMsgBox = (props: CompleteBoxInterface) => {
	const { t } = useTranslation();
	/*
	 * 안내가 두 줄씩이다. 어디서 끊을지는 언어마다 다르므로 번역문의 \n 을
	 * 그대로 따른다 — 여기서 문장부호로 자르지 않는다(MicDeniedScreen 과 같은 규칙).
	 */
	const lines = (key: string) => t(key).split("\n");
	return (
		<div className="mission-complete">
			<div className="mission-complete-card">
				<strong>
					{lines("missionChat.completeTitle").map((line, i) => (
						<Fragment key={line}>
							{i > 0 && <br />}
							{line}
						</Fragment>
					))}
				</strong>
				<span>
					{lines("missionChat.completeSub").map((line, i) => (
						<Fragment key={line}>
							{i > 0 && <br />}
							{line}
						</Fragment>
					))}
				</span>
				<button type="button" onClick={props.closeDialog}>
					{t("missionChat.endChat")}
				</button>
			</div>
		</div>
	);
};
