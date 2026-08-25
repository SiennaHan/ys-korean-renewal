import { translate } from "@/api/chat";
import { SpeakerIcon, TranslationIcon } from "@/assets/icons";
import clsx from "clsx";
import {
	CircleAlert,
	Languages,
	Lightbulb,
	MessageCircleWarning,
	Volume2,
} from "lucide-react";
import { useState } from "react";

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

const TypingIndicator = () => {
	return (
		<div className="flex items-center space-x-1">
			<div
				className="size-[6px] animate-bounce rounded-full bg-[#0073E6]"
				style={{ animationDelay: "0s" }}
			/>
			<div
				className="size-[6px] animate-bounce rounded-full bg-[#0073E6]"
				style={{ animationDelay: "0.15s" }}
			/>
			<div
				className="size-[6px] animate-bounce rounded-full bg-[#0073E6]"
				style={{ animationDelay: "0.3s" }}
			/>
		</div>
	);
};

interface ChatInterface {
	msg: string;
	alertMsg?: string | null | undefined;
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
			className={clsx(
				"flex size-[24px] cursor-pointer items-center justify-center rounded-[8px] bg-white disabled:cursor-not-allowed",
				popCount > 0 && "animate-btn-pop",
			)}
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
		<div className="mt-[10px] mr-[15px] flex flex-row px-[12px]">
			<div>
				<div className="flex size-[40px] flex-shrink-0 items-center justify-center">
					<img alt="" src="/images/chat_ai_img.svg" width="40" height="40" />
				</div>
			</div>
			<div className="relative ml-[10px] rounded-[15px] bg-[#F6F7F8] p-[10px] text-[14px]">
				<p>{msg}</p>
				{replayAudio && (
					<div className="mt-[5px] flex flex-row gap-[6px]">
						<PopIconButton onClick={replayAudio} disabled={isAudioLoading}>
							{isAudioLoading ? (
								<div className="size-[14px] h-5 w-5 animate-spin rounded-full border-[#4396f4] border-b-2" />
							) : (
								<SpeakerIcon color={"#4396f4"} />
							)}
						</PopIconButton>
						<PopIconButton onClick={translateMsg} disabled={isTranslating}>
							{isTranslating ? (
								<div className="size-[14px] h-5 w-5 animate-spin rounded-full border-[#4396f4] border-b-2" />
							) : (
								<TranslationIcon color={"#4396f4"} />
							)}
						</PopIconButton>
					</div>
				)}
				{transText && isShowTans && (
					<div className="mt-[5px] rounded-[5px] bg-[#f3f3f3] px-2 py-1 text-[#8d8d8d] text-[12px]">
						{transText}
					</div>
				)}
				<div className="-ml-[10px] -translate-y-1/3 absolute top-[15px] left-[2px] h-0 w-0 transform border-y-[3px] border-y-transparent border-r-[#F6F7F8] border-r-[10px] border-solid" />
			</div>
		</div>
	);
};

export const UserMsgBox = ({ msg }: ChatInterface) => {
	return (
		<div className="mt-[10px] px-[12px]">
			<div className="flex justify-end">
				<div className="relative rounded-[15px] bg-[#DBEDFF] p-[10px] text-[#24425F] text-[14px]">
					<div className="-mr-2 -translate-y-1/3 absolute top-[15px] right-0 h-0 w-0 transform border-y-[3px] border-y-transparent border-l-[#DBEDFF] border-l-[10px] border-solid" />
					<p>{msg} </p>
				</div>
			</div>
		</div>
	);
};

// 사용자 발화 피드백(해설) 박스 — 서버가 이미 선택 언어로 생성해 주므로 그대로 표시
const FeedbackBox = ({
	text,
	color,
	icon,
}: {
	text: string;
	color: string;
	icon: React.ReactNode;
}) => {
	return (
		<div className="mt-[5px] rounded-[8px] bg-white px-[7px] py-[3px]">
			<div className="flex items-start">
				<div className="size-[20px] flex-shrink-0">{icon}</div>
				<div className="ml-[5px] flex-1 text-[12px]" style={{ color }}>
					{text}
				</div>
			</div>
		</div>
	);
};

export const AlertUserMsgBox = ({ msg, alertMsg }: ChatInterface) => {
	return (
		<div className="mt-[10px] ml-[50px] px-[12px]">
			<div className="flex justify-end">
				<div className="relative rounded-[15px] bg-[#FFE8E8] p-[10px] text-[#383A3F] text-[14px]">
					<div className="-mr-2 -translate-y-1/3 absolute top-[15px] right-0 h-0 w-0 transform border-y-[3px] border-y-transparent border-l-[#FFE8E8] border-l-[10px] border-solid" />
					<div>{msg} </div>
					{alertMsg && (
						<FeedbackBox
							text={alertMsg}
							color="#F76853"
							icon={
								<MessageCircleWarning color="#fff" fill="#F76853" size="px" />
							}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export const TipUserMsgBox = ({ msg, alertMsg }: ChatInterface) => {
	return (
		<div className="mt-[10px] ml-[50px] px-[12px]">
			<div className="flex justify-end">
				<div className="relative rounded-[15px] bg-[#DBEDFF] p-[10px] text-[#383A3F] text-[14px]">
					<div className="-mr-2 -translate-y-1/3 absolute top-[15px] right-0 h-0 w-0 transform border-y-[3px] border-y-transparent border-l-[#DBEDFF] border-l-[10px] border-solid" />
					<div>{msg} </div>
					{alertMsg && (
						<FeedbackBox
							text={alertMsg}
							color="#0073E6"
							icon={<Lightbulb color="#0073E6" size="16px" />}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export const BotMsgProgress = () => {
	return (
		<div className="mt-[10px] mr-[15px] flex flex-row px-[12px]">
			<div>
				<div className="flex size-[40px] flex-shrink-0 items-center justify-center">
					<img alt="" src="/images/chat_ai_img.svg" width="40" height="40" />
				</div>
			</div>
			<div className="relative ml-[10px] h-[40px] w-[60px] rounded-[15px] bg-[#F6F7F8] p-[10px]">
				<div className="mt-[9px] flex justify-center">
					<TypingIndicator />
				</div>
				<div className="-ml-[10px] -translate-y-1/3 absolute top-[15px] left-[1px] h-0 w-0 transform border-y-[3px] border-y-transparent border-r-[#F6F7F8] border-r-[10px] border-solid" />
			</div>
		</div>
	);
};

export const UserMsgProgress = () => {
	return (
		<div className="mt-[10px] ml-[15px] px-[12px]">
			<div className="flex justify-end">
				<div className="relative h-[40px] w-[60px] rounded-[15px] bg-[#F6F7F8] p-[10px] text-[14px] text-white">
					<div className="-mr-2 -translate-y-1/3 absolute top-[15px] right-0 h-0 w-0 transform border-y-[3px] border-y-transparent border-l-[#F6F7F8] border-l-[10px] border-solid" />
					<div className="mt-[9px] flex justify-center">
						<TypingIndicator />
					</div>
				</div>
			</div>
		</div>
	);
};

export const CompletedMsgBox = (props: CompleteBoxInterface) => {
	return (
		<div className="w-full p-[10px] px-[12px]">
			<div className="rounded-[10px] bg-[#F9FAFC] px-[20px] py-[14px]">
				<div className="text-center font-bold text-[16px]">
					{"축하해요! 모든 미션을 완료했어요"} <br />
					{"계속 대화하거나, 여기서 마칠 수 있어요!"}{" "}
				</div>
				<div className="mt-[5px] text-center text-[#8d8d8d] text-[11px]">
					{"Congrats! You finished all the missions!🎉"} <br />
					{"You can keep talking if you want, or end the chat here."}
				</div>
				<button
					type="button"
					onClick={props.closeDialog}
					className={clsx(
						"mt-[20px] flex h-[32px] w-full items-center justify-center rounded-[10px] bg-[#DBEDFF] text-[#0180FF]",
						"cursor-pointer hover:bg-gray-200 active:bg-gray-300",
					)}
				>
					대화 끝내기
				</button>
			</div>
		</div>
	);
};
