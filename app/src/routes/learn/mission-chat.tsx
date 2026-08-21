import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";

import { useSharedAudio } from "@/components/audio/audio-provider";
import { env } from "@/config/env";
import { chapters } from "@/shared/data/chapter";
import { dialogs } from "@/shared/data/dialog";
import { dialog_keywords } from "@/shared/data/dialog_keyword";
import { dialog_words } from "@/shared/data/dialog_word";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import type { ModuleType } from "@/types/book.types";
import { X } from "lucide-react";
import { useState } from "react";
import MissionDialog from "@/components/learn/mission-dialog";
import MissionReport from "@/components/learn/mission-report";
import { type LearnSearch, parseLearnSearch } from "./-search";

export const Route = createFileRoute("/learn/mission-chat")({
	validateSearch: (search: Record<string, unknown>): LearnSearch =>
		parseLearnSearch(search),
	component: RouteComponent,
});

const baseButton =
	"w-full max-w-[500px] h-[56px] bg-[#4396F4] rounded-[10px] text-white text-[16px] font-bold mx-[16px] mb-[16px] flex items-center justify-center cursor-pointer hover:bg-[#4396F4dd] active:bg-[#4396F4cc]";
const moreButton =
	"bg-[#fff] w-full h-[40px] text-[11px] cursor-pointer hover:bg-[#eee] active:bg-[#ddd]";
const listItemBase =
	"bg-[#fff] w-full cursor-pointer hover:bg-[#eee] active:bg-[#ddd]";

function RouteComponent() {
	/*
	 * 구 경로 /book/chapter/unit/mission_chat/$code 에서 옮겨 왔다 (명세 §4).
	 * URL 에서 콘텐츠 코드를 걷어내고 급·과만 받는다 — 모듈은 여기서 찾는다.
	 * 한 과에 mission_chat 모듈은 하나뿐이다(실측 117개 · 과마다 하나).
	 */
	const { level, lesson } = Route.useSearch();
	const code =
		modules.find((m) => {
			const unit = units.find((u) => u.id === m.unit_id);
			const chapter = chapters.find((c) => c.id === unit?.chapter_id);
			return (
				m.scene_type === "mission_chat" &&
				chapter?.book_id === level &&
				chapter?.seq === lesson
			);
		})?.code ?? "";
	const navigate = useNavigate();
	const router = useRouter();
	/*
	 * 브리핑 → 대화 → 리포트. 명세 §4 의 "내부 단계는 컴포넌트 상태로" 다.
	 * 전에는 세 라우트였고 URL 에 dialog id 가 실렸다.
	 */
	const [phase, setPhase] = useState<"briefing" | "chat" | "report">(
		"briefing",
	);
	const { unlock } = useSharedAudio();

	const [isShowMore, setIsShowMore] = useState(false);

	const module: ModuleType | undefined = modules.find(
		(item) => item.code === code,
	)
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);

	const dialog = dialogs.find((item) => item.module_code === code);
	const keywordList = dialog_keywords.filter(
		(item) => item.dialog_id === dialog?.id,
	)
	const wordList = dialog_words.filter((item) => item.dialog_id === dialog?.id);
	const scenarioImgUrl = env.RES_URL_ROOT + "/" + dialog?.content_img;

	// const videoList = dialog_videos.filter(item => item.dialog_id === dialog?.id);
	// const videoListToShow = isShowMore ? videoList : videoList.slice(0, 3);
	// const [videoId, setVideoId] = useState<string | undefined>(undefined);
	// const [isOpenYoutube, setIsOpenYoutube] = useState(false);

	const showMore = () => {
		setIsShowMore(!isShowMore);
	}

	const goChat = async () => {
		await unlock();
		setPhase("chat");
	}

	const goBack = () => {
		router.history.back();
	}

	// 대화·리포트 단계 — 라우트가 아니라 이 화면이 띄운다 (명세 §4)
	if (phase === "chat" && dialog) {
		return (
			<MissionDialog
				dialogId={dialog.id}
				onClose={() => navigate({ to: "/main/textbook" })}
				onReport={() => setPhase("report")}
			/>
		)
	}

	if (phase === "report" && dialog) {
		return (
			<MissionReport
				dialogId={dialog.id}
				onRetry={() => setPhase("chat")}
				onExit={() => navigate({ to: "/main/textbook" })}
			/>
		)
	}

	return (
		<div className="flex h-full w-full flex-col bg-[#F6F7F8]">
			<div className="sticky top-0 items-center bg-white">
				{/* <ProblemHeader chapterSeq={chapter?.seq} unitTitle={unit?.title} /> */}
				<div className="sticky top-0 z-10 items-center bg-white">
					<div className="flex h-[48px] justify-between">
						<div
							onClick={goBack}
							className="flex h-[48px] w-[48px] cursor-pointer items-center justify-center hover:bg-gray-200 active:bg-gray-300"
						>
							<X />
						</div>
						<div className="flex items-center font-semibold text-[#383A3F] text-[17px]">
							{dialog?.chapter}
							{"과"}
						</div>
						<div className="w-[48px]"></div>
					</div>
				</div>
			</div>
			<div className="scrollbar-hide flex-1 overflow-y-auto bg-[#F6F7F8]">
				<div className="">
					<div className="w-full bg-white pt-[14px] pr-[15px] pb-[20px] pl-[15px]">
						<div className="font-semibold text-[#383A3F] text-[20px]">
							{dialog?.title}
						</div>
						<div className="text-[#7F848D] text-[14px]">
							{dialog?.title_eng}
						</div>
					</div>

					<div className="mt-[15px] w-full px-[15px]">
						<div className="font-semibold text-[#383A3F] text-[16px]">
							{"Conversation Scenario"}
						</div>
						<div className="mt-[8px] w-full rounded-[10px] bg-[#fff] p-[12px]">
							<div className="mb-[16px] flex justify-center">
								<img src={scenarioImgUrl} />
							</div>
							<div className="justify-center rounded-[6px] bg-[#F9FAFC] p-[16px]">
								<div className="text-center text-[14px]">
									{dialog?.scenario}
								</div>
								<div className="text-center text-[#999] text-[14px]">
									{dialog?.scenario_eng}
								</div>
							</div>
						</div>
					</div>

					<div className="mt-[30px] mb-[10px] w-full px-[15px]">
						<div className="font-semibold text-[#383A3F] text-[16px]">
							{"Mission Keyword"}
						</div>
						<div className="mt-[8px] flex w-full flex-col gap-2 rounded-[10px] bg-[#fff] p-[12px]">
							<div className="grid gap-2">
								{keywordList.map((item) => (
									<div key={item.id} className="flex items-center">
										<div className="w-[100px] rounded-[5px] bg-[#DBEDFF] py-[4px] text-center font-bold text-[#0073E6] text-[14px]">
											{item.keyword}
										</div>
										<div className="ml-[7px] flex-1 text-[#4B505A] text-[14px]">
											{item.content}
										</div>
									</div>
								))}
							</div>
							{wordList.length > 0 && (
								<div className="scrollbar-hide flex gap-2 overflow-x-auto border-[#F6F7F8] border-t-1 pt-[12px]">
									{wordList.map((item) => (
										<div
											key={item.id}
											className="min-w-[100px] rounded-[6px] bg-[#F6F7F8] px-[8px] py-[8px]"
										>
											<div className="whitespace-nowrap text-center font-bold text-[#383A3F] text-[14px]">
												{item.word}
											</div>
											<div className="whitespace-nowrap text-center font-semibold text-[#979DA8] text-[12px]">
												{item.word_eng}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
			<div className="sticky bottom-0 flex items-center justify-center">
				<div className={baseButton} onClick={goChat}>
					{" "}
					시작하기{" "}
				</div>
			</div>
		</div>
	)
}
