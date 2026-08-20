/**
 * 자모 — 단어 쓰기
 *
 * 구 경로 /book/chapter/unit/read-write/$code 에서 옮겨 왔다.
 * 그쪽은 리다이렉트만 남는다.
 */
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	AudioBar,
	Dock,
	PracticeBrowser,
	PrimaryButton,
	ProblemCard,
	ThumbWordCards,
	WordPicture,
} from "@/components/main/activity";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type JamoSearch, parseJamoSearch } from "../-jamo-search";

import { CardCheckIcon, SpeakerIcon } from "@/assets/icons";
import HangulCanvas from "@/components/draw/HangulCanvas";
import { ProblemHeader } from "@/components/problem/scene/header";
import { ModuleTitle } from "@/components/problem/scene/title";
import Dialog from "@/components/ui/dialog";
import { env } from "@/config/env";
import { chapters } from "@/shared/data/chapter";
import { modules } from "@/shared/data/module";
import { problems } from "@/shared/data/problem";
import { wordgroup } from "@/shared/data/problem_wordgroup";
import { wordgroup_choice } from "@/shared/data/problem_wordgroup_choice";
import { units } from "@/shared/data/unit";
import type { ModuleType, ProblemType } from "@/types/book.types";
import clsx from "clsx";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/learn/jamo/word-write")({
	validateSearch: (search: Record<string, unknown>): JamoSearch =>
		parseJamoSearch(search),
	component: RouteComponent,
});

const baseButton =
	"w-full max-w-[500px] h-[56px] bg-[#0180FF] text-white rounded-[10px] flex items-center justify-center cursor-pointer \
										hover:bg-[#0180FFdd] active:bg-[#0180FFcc] \
									  disabled:text-[#ADB3BE] disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-[#E5E8EC] disabled:hover:bg-[#bbb]";
const baseButtonClasses =
	"flex rounded-[5px] items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300";

function RouteComponent() {
	const { code } = Route.useSearch();
	const { t } = useTranslation();
	const router = useRouter();

	const module: ModuleType | undefined = modules.find(
		(item) => item.code === code,
	);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const problemList = problems.filter(
		(item) => item.module_code === code && item.scene_num === 1,
	);

	const [problemId, setProblemId] = useState("");
	const [selectedWord, setSelectedWord] = useState<undefined | ProblemType>(
		undefined,
	);

	// tab
	const tabList = wordgroup.filter((item) => item.module_code === code);
	const tabItemList = wordgroup_choice.filter((item) =>
		tabList.map((tab) => tab.id).includes(item.group_id),
	);

	const [selectedTab, setSelectedTab] = useState(
		tabList && tabList.length > 0 ? tabList[0].id : undefined,
	);
	const [selectedTabItems, seteSlectedTabItems] = useState(
		tabList && tabList.length > 0
			? tabItemList.filter((item) => item.group_id === tabList[0].id)
			: [],
	);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined);
	const [isSucceed, setIsSucceed] = useState(false);

	//canvas
	const [imageIndex, setImageIndex] = useState(0);
	const [isOpenCanvas, setIsOpenCanvas] = useState(false);
	const [imageSlots, setImageSlots] = useState<(string | null)[]>([
		null,
		null,
		null,
	]);

	const [canvasText, setCanvasText] = useState<string | null>(null);
	const [isExit, setIsExit] = useState(false);

	const exit = () => {
		router.history.back();
	};

	const openCanvas = (index: number, text: string) => {
		setCanvasText(text);
		setImageIndex(index);
		setIsOpenCanvas(true);
	};

	const returnImage = (base64Img: string) => {
		const newSlots = [...imageSlots];
		newSlots[imageIndex] = base64Img;
		setImageSlots(newSlots);

		checkSucceed(newSlots);
	};

	const isLastProblem = () => {
		if (tabList && tabList.length > 0) {
			const currentTabIndex = tabList.findIndex(
				(tab) => tab.id === selectedTab,
			);
			const currentItemIndex = selectedTabItems.findIndex(
				(tab) => tab.problem_id === problemId,
			);
			if (
				currentTabIndex === -1 ||
				currentItemIndex === -1 ||
				selectedTabItems.length === 0
			) {
				return false;
			}
			return (
				currentTabIndex === tabList.length - 1 &&
				currentItemIndex === selectedTabItems.length - 1
			);
		}

		const currentIndex = problemList.findIndex((pr) => pr.id === problemId);
		return currentIndex === problemList.length - 1;
	};

	const checkSucceed = (newSlots: (string | null)[]) => {
		const _splitted = selectedWord?.content.split("");
		const _images = newSlots.filter((item) => item !== null);

		console.log("check length =>", _splitted?.length, _images.length, newSlots);

		if (_splitted?.length === _images.length) {
			setIsSucceed(true);
			setIsExit(isLastProblem());
		}
	};

	const selectWord = (item: ProblemType | undefined) => {
		if (item === undefined) return;

		setProblemId(item.id);
		setSelectedWord(item);
		// setProblemIndex(index);
		setImageSlots([null, null, null]);
		setIsSucceed(false);
		setIsExit(false);

		const _audioSrc = env.RES_URL_ROOT + "/" + item?.content_sound;
		setAudioSrc(_audioSrc);
	};

	const WordCard = ({
		item,
		index,
		isChecked,
	}: { item: ProblemType; index: number; isChecked: boolean }) => {
		const imgSrc = env.RES_URL_ROOT + "/" + item.content_img;
		return (
			<div
				onClick={(e) => selectWord(item)}
				className={clsx(
					baseButtonClasses,
					"w-[100px] border-[#fff] border-[4px] bg-[#fff]",
					item.content === selectedWord?.content &&
						"!bg-[#4396F4] !border-[#4396F4] !text-white font-bold",
				)}
			>
				<div
					className={`size-[50px] rounded-[5px] p-[5px] bg-[url(${imgSrc})] bg-center bg-cover bg-size-[90px] bg-white bg-no-repeat`}
				></div>
				<div className="relative flex size-[50px] items-center justify-center text-[12px]">
					{item.content}
					<div className="absolute top-[0px] right-[0px]">
						<CardCheckIcon color={isChecked ? "#11C378" : "#E5E8EC"} />
					</div>
				</div>
			</div>
		);
		// <div
		// 	onClick={(e)=>selectWord(item)}
		// 	className={clsx(baseButtonClasses, "w-[100px] bg-[#C4E5FF] border-2 border-[#C4E5FF]", item.content === selectedWord?.content && "!bg-[#4396F4] !border-[#4396F4] !text-white font-bold")}>
		// 		<div className={`size-[50px] p-[5px] rounded-[5px] bg-[url(${imgSrc})] bg-cover bg-center bg-size-[90px] bg-white bg-no-repeat`}></div>
		// 		<div className="size-[50px] flex items-center justify-center text-[12px]">{item.content}</div>
		// 	</div>
	};

	const next = () => {
		// check tab
		if (tabList && tabList.length > 0) {
			const tabItem = selectedTabItems.find(
				(tab) => tab.problem_id === problemId,
			);
			const currentIndex = selectedTabItems.findIndex(
				(tab) => tab.id === tabItem?.id,
			);

			// tab item index 이동
			if (currentIndex < selectedTabItems.length - 1) {
				const nextItem = selectedTabItems[currentIndex + 1];
				const nextProblem = problemList.find(
					(pr) => pr.id === nextItem.problem_id,
				);
				setProblemId(nextProblem?.id ?? "");
				selectWord(nextProblem);
			} else {
				// tab index
				const currentTabIndex = tabList.findIndex(
					(tab) => tab.id === selectedTab,
				);

				if (currentTabIndex < tabList.length - 1) {
					const nextTab = tabList[currentTabIndex + 1];
					onTabClick(nextTab.id);
				} else {
					onTabClick(tabList[0].id);
				}
			}
			// no tab
		} else {
			const currentIndex = problemList.findIndex((pr) => pr.id === problemId);

			if (currentIndex < problemList.length - 1) {
				const nextItem = problemList[currentIndex + 1];
				setProblemId(nextItem.id);
				selectWord(nextItem);
			}
		}
	};

	const playAudio = () => {
		if (audioSrc) {
			audioRef.current?.play();
		}
	};

	const onTabClick = (tabId: number) => {
		setSelectedTab(tabId);
		const items = tabItemList.filter((item) => item.group_id === tabId);
		seteSlectedTabItems(items);

		const firstItem = items[0];
		const firstProblem = problemList.find(
			(pr) => pr.id === firstItem.problem_id,
		);
		setProblemId(firstProblem?.id ?? "");
		selectWord(firstProblem);
	};

	useEffect(() => {
		if (problemList.length > 0) {
			const item = problemList[0];
			setProblemId(item.id);
			selectWord(item);
		}
	}, []);

	const groupName = (unit?.title ?? "").split(":")[0].trim();
	const lesson = [
		t("catalog.chapterSeq", { seq: chapter?.seq ?? 1 }),
		groupName,
	]
		.filter(Boolean)
		.join(" · ");
	const shown =
		tabList && selectedTabItems.length > 0
			? problemList.filter((x) =>
					selectedTabItems.map((i) => i.problem_id).includes(x.id),
				)
			: problemList;

	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={exit} />

			<ActivityBody>
				<ProblemCard
					instruction={t("activity.instrReadWrite")}
					stimulusStyle={{ gap: 20 }}
				>
					<WordPicture
						word={selectedWord?.content ?? ""}
						image={`${env.RES_URL_ROOT}/${selectedWord?.content_img}`}
						small
					/>
					<AudioBar label={selectedWord?.content ?? ""} onPlay={playAudio} />
					{/* 음절을 눌러 쓰기 판을 연다 — 낱말 전체를 한 판에 쓰면 획이 뭉갠다 */}
					<div className="syl-row">
						{(selectedWord?.content ?? "").split("").map((ch, idx) => (
							<button
								type="button"
								key={`${ch}-${idx}`}
								className="syl"
								data-action="openCanvas"
								data-index={idx}
								onClick={() => openCanvas(idx, ch)}
							>
								<span>{ch}</span>
								{imageSlots[idx] && <img src={imageSlots[idx] ?? ""} alt="" />}
							</button>
						))}
					</div>
				</ProblemCard>

				<PracticeBrowser
					tabs={(tabList ?? []).map((x) => x.tab_name)}
					current={tabList?.find((x) => x.id === selectedTab)?.tab_name ?? ""}
					onTab={(name) => {
						const hit = tabList?.find((x) => x.tab_name === name);
						if (hit) onTabClick(hit.id);
					}}
				>
					<ThumbWordCards
						cards={shown.map((x) => ({
							word: x.content,
							image: `${env.RES_URL_ROOT}/${x.content_img}`,
							done: false,
						}))}
						current={selectedWord?.content ?? ""}
						onPick={(word) => {
							const hit = problemList.find((x) => x.content === word);
							if (hit) {
								setProblemId(hit.id);
								selectWord(hit);
							}
						}}
					/>
				</PracticeBrowser>
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={isExit ? t("player.showResult") : t("player.next")}
						on={isExit || isSucceed}
						action="next"
						onClick={isExit ? exit : next}
					/>
				</Dock>
			</ActivityFooter>

			{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
			<audio className="hidden" src={audioSrc} ref={audioRef} />

			<Dialog isOpen={isOpenCanvas} onClose={() => setIsOpenCanvas(false)}>
				<HangulCanvas
					text={canvasText}
					returnImage={returnImage}
					onClose={() => setIsOpenCanvas(false)}
				/>
			</Dialog>
		</ActivityFrame>
	);
}
