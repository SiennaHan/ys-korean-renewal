import { getGuestId } from "@/api/api";
import { createReport, listReport } from "@/api/report";
import { clips } from "@/shared/data/clip";
import { Heart, MoreVertical, Search, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import YouTube, {
	type YouTubeProps,
	type YouTubeEvent,
	type YouTubePlayer,
} from "react-youtube";

const CATEGORY = "video";

/** 값은 클립 데이터가 쓰는 영어 그대로다 — 보이는 글자만 번역한다 */
const CATEGORIES = [
	"All",
	"Entertainment",
	"Film & Drama",
	"News",
	"Lifestyle",
] as const;
const CATEGORY_KEY: Record<(typeof CATEGORIES)[number], string> = {
	All: "clip.catAll",
	Entertainment: "clip.catEntertainment",
	"Film & Drama": "clip.catFilm",
	News: "clip.catNews",
	Lifestyle: "clip.catLifestyle",
};

type CategoryType = (typeof CATEGORIES)[number];

interface ClipItem {
	index: number;
	youtube_id: string;
	link: string;
	title: string;
	script: string;
	category?: string;
}

interface ResultItem {
	id: number;
	title: string;
	youtubeId: string;
	start: number;
	end: number;
	content: string;
	word: string;
	category?: string;
}

const errorIds: string[] = [];

// ── 검색 입력 컴포넌트 ──
const SearchInputField = ({
	searchWord,
	onSearchChanged,
	onClear,
}: {
	searchWord: string;
	onSearchChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onClear: () => void;
}) => {
	const { t } = useTranslation();
	return (
		<div className="relative flex h-[48px] w-full items-center overflow-hidden rounded-[10px] bg-white">
			<input
				type="text"
				className="h-full w-full bg-transparent pr-[72px] pl-[12px] font-medium text-[#383a3f] text-[14px] leading-[20px] placeholder:text-[#adb3be] focus:outline-none"
				value={searchWord}
				onChange={onSearchChanged}
				placeholder={t("clip.searchPlaceholder")}
			/>
			{searchWord && (
				<button
					type="button"
					onClick={onClear}
					className="-translate-y-1/2 absolute top-1/2 right-[36px] flex size-[24px] items-center justify-center text-[#adb3be]"
				>
					<X size={16} />
				</button>
			)}
			<div className="-translate-y-1/2 absolute top-1/2 right-[12px] flex size-[24px] items-center justify-center rounded-full bg-[#0180ff]">
				<Search size={16} className="text-white" />
			</div>
		</div>
	);
};

// ── 카테고리 칩 컴포넌트 ──
const CategoryChips = ({
	selected,
	onSelect,
}: {
	selected: CategoryType;
	onSelect: (cat: CategoryType) => void;
}) => {
	const { t } = useTranslation();
	return (
		<div className="scrollbar-hide flex items-center gap-[6px] overflow-x-auto py-[8px]">
			{CATEGORIES.map((cat) => {
				const isSelected = cat === selected;
				return (
					<button
						type="button"
						key={cat}
						onClick={() => onSelect(cat)}
						className={`shrink-0 whitespace-nowrap rounded-[8px] px-[12px] py-[6px] text-center text-[14px] leading-[20px] ${
							isSelected
								? "border border-[#59acff] bg-[#dbedff] font-bold text-[#0a6acb]"
								: "border border-transparent bg-white font-semibold text-[#c8ccd3]"
						}`}
					>
						{t(CATEGORY_KEY[cat])}
					</button>
				);
			})}
		</div>
	);
};

// ── 비디오 썸네일 카드 컴포넌트 ──
const VideoCard = ({
	video,
	onPlay,
	onMenuClick,
}: {
	video: ResultItem;
	onPlay: (video: ResultItem) => void;
	onMenuClick: (video: ResultItem) => void;
}) => {
	const thumbnailUrl = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
	const formatTime = (seconds: number) => {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	const highlightKeyword = (text: string, keyword: string) => {
		if (!keyword || !text) return <span>{text}</span>;
		const regex = new RegExp(
			`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
			"gi",
		);
		const parts = text.split(regex);
		return (
			<span>
				{parts.map((part, index) =>
					part.toLowerCase() === keyword.toLowerCase() ? (
						<span key={index} className="font-bold text-[#383a3f]">
							{part}
						</span>
					) : (
						<span key={index}>{part}</span>
					),
				)}
			</span>
		);
	};

	return (
		<div className="flex flex-col gap-[8px]">
			{/* 썸네일 */}
			<button
				type="button"
				onClick={() => onPlay(video)}
				className="relative h-[185px] w-full overflow-hidden rounded-[12px] bg-white"
			>
				<img
					src={thumbnailUrl}
					alt={video.title}
					className="absolute inset-0 h-full w-full object-cover"
				/>
				{/* 시간 뱃지 */}
				<div className="absolute top-[12px] left-[12px] rounded-[6px] bg-[#383a3f] px-[8px] py-[2px]">
					<span className="whitespace-nowrap font-medium text-[12px] text-white leading-[16px]">
						{formatTime(video.start)}
					</span>
				</div>
				{/* 좋아요 아이콘 */}
				<div className="absolute top-[12px] right-[12px] flex size-[24px] items-center justify-center">
					<Heart size={20} className="text-white" />
				</div>
			</button>

			{/* 제목 + 스크립트 + 메뉴 */}
			<div className="flex flex-col gap-[2px]">
				<div className="font-medium text-[#383a3f] text-[14px] leading-[20px]">
					{highlightKeyword(video.content, video.word)}
				</div>
				<div className="flex items-center justify-between">
					<p className="w-[296px] truncate font-medium text-[#383a3f] text-[14px] leading-[20px]">
						{video.title}
					</p>
					<button
						type="button"
						onClick={() => onMenuClick(video)}
						className="flex size-[24px] shrink-0 items-center justify-center text-[#7f848d]"
					>
						<MoreVertical size={16} />
					</button>
				</div>
			</div>
		</div>
	);
};

// ── 비디오 플레이어 컴포넌트 ──
const VideoPlayer = ({
	video,
	onClose,
}: {
	video: ResultItem;
	onClose: () => void;
}) => {
	const tempTime = video.start - 2;
	const startTime = tempTime < 0 ? 0 : tempTime;
	const endTime = video.start === video.end ? video.start + 1 : video.end;
	const opts: YouTubeProps["opts"] = {
		width: "100%",
		height: "185",
		playerVars: {
			start: startTime,
			end: endTime,
			autoplay: 1,
			playsinline: 1,
		},
	};

	const playerRef = useRef<YouTubePlayer>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const onReady = (event: YouTubeEvent) => {
		playerRef.current = event.target;
	};

	const onError = async (event: YouTubeEvent) => {
		const errorCode = event.data;
		let errorMsg = "";
		switch (errorCode) {
			case 2:
				errorMsg = "잘못된 동영상 ID 형식입니다.";
				break;
			case 5:
				errorMsg = "HTML5 플레이어 오류입니다.";
				break;
			case 100:
				errorMsg = "동영상을 찾을 수 없거나 비공개 설정되었습니다.";
				break;
			case 101:
			case 150:
				errorMsg = "동영상 소유자가 임베딩을 허용하지 않습니다.";
				break;
			default:
				errorMsg = "알 수 없는 재생 오류가 발생했습니다.";
		}
		if (errorCode) await reportError(video, errorCode, errorMsg);
	};

	const onPlayerStateChange = (event: YouTubeEvent) => {
		if (event.data === 0) {
			const player = event.target;
			player.seekTo(startTime);
		}
	};

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting && playerRef.current) {
						playerRef.current.pauseVideo();
					}
				}
			},
			{ threshold: 0.5, rootMargin: "0px" },
		);
		if (containerRef.current) observer.observe(containerRef.current);
		return () => {
			if (containerRef.current) observer.unobserve(containerRef.current);
		};
	}, []);

	return (
		<div ref={containerRef} className="overflow-hidden rounded-[12px] bg-white">
			<YouTube
				videoId={video.youtubeId}
				opts={opts}
				onReady={onReady}
				onError={onError}
				onStateChange={onPlayerStateChange}
			/>
		</div>
	);
};

// ── 신고 바텀시트 ──
const ReportBottomSheet = ({
	video,
	onClose,
	onReport,
}: {
	video: ResultItem;
	onClose: () => void;
	onReport: (type: string) => void;
}) => {
	const { t } = useTranslation();
	return (
		<>
			{/* 딤드 배경 */}
			<div
				className="fixed inset-0 z-40 bg-[rgba(56,58,63,0.5)]"
				onClick={onClose}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
			/>
			{/* 바텀시트 */}
			<div className="fixed right-0 bottom-0 left-0 z-50 rounded-t-[16px] bg-white pb-[40px]">
				<div className="flex items-center justify-end px-[16px] pt-[16px] pb-[8px]">
					<button
						type="button"
						onClick={onClose}
						className="flex size-[24px] items-center justify-center text-[#383a3f]"
					>
						<X size={14} />
					</button>
				</div>
				<button
					type="button"
					onClick={() => onReport("audio_quality")}
					className="flex w-full items-center gap-[4px] bg-white px-[16px] py-[12px]"
				>
					<div className="flex size-[24px] items-center justify-center">
						<svg
							width="18"
							height="18"
							viewBox="0 0 18 18"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M9 1C4.58 1 1 4.58 1 9s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 11.5a1 1 0 110-2 1 1 0 010 2zM9.75 9a.75.75 0 01-1.5 0V5.5a.75.75 0 011.5 0V9z"
								fill="#383A3F"
							/>
						</svg>
					</div>
					<span className="font-medium text-[#383a3f] text-[16px] leading-[24px]">
						{t("clip.reportAudio")}
					</span>
				</button>
				<button
					type="button"
					onClick={() => onReport("inappropriate")}
					className="flex w-full items-center gap-[4px] bg-white px-[16px] py-[12px]"
				>
					<div className="flex size-[24px] items-center justify-center">
						<svg
							width="16"
							height="18"
							viewBox="0 0 16 18"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M6 4a6 6 0 1112 0H6z"
								fill="#383A3F"
								transform="translate(-2, 2) scale(0.8)"
							/>
							<rect x="2" y="15" width="12" height="2" rx="1" fill="#383A3F" />
						</svg>
					</div>
					<span className="font-medium text-[#4b505a] text-[16px] leading-[24px]">
						{t("clip.reportInappropriate")}
					</span>
				</button>
			</div>
		</>
	);
};

const reportError = async (
	video: ResultItem,
	errorCode: string | number,
	errorMsg: string,
) => {
	if (errorIds.includes(video.youtubeId)) return;
	errorIds.push(video.youtubeId);
	const userId = getGuestId();
	const request = {
		category: CATEGORY,
		target_id: video.youtubeId,
		error_code: `${errorCode}`,
		error_msg: errorMsg,
		user_id: userId,
	};
	await createReport(request);
};

export default function Content4() {
	const { t } = useTranslation();
	const [searchWord, setSearchWord] = useState("");
	const [results, setResults] = useState<ResultItem[]>([]);
	const [filteredClips, setFilteredClips] = useState<ClipItem[]>([]);
	const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");
	const [playingVideo, setPlayingVideo] = useState<ResultItem | null>(null);
	const [reportVideo, setReportVideo] = useState<ResultItem | null>(null);

	const timeStringToSeconds = (time: string) => {
		if (typeof time !== "string") return 0;
		const s = time.trim();
		if (s.length === 0) return 0;
		const parts = s.split(":").map((p) => p.trim());
		if (parts.some((p) => p === "")) return 0;
		const reversed = parts.slice().reverse();
		let seconds = 0;
		for (let i = 0; i < reversed.length; i++) {
			const part = reversed[i];
			if (!/^\d+(\.\d+)?$/.test(part)) return 0;
			const value = Number(part);
			if (!Number.isFinite(value) || value < 0) return 0;
			if (i === 0) seconds += value;
			else if (i === 1) seconds += value * 60;
			else if (i === 2) seconds += value * 3600;
			else return 0;
		}
		return seconds;
	};

	const searchScript = useCallback(
		(word: string, category: CategoryType) => {
			if (!word || !word.trim() || word.length < 2) {
				setResults([]);
				return;
			}

			const clipsToSearch =
				category === "All"
					? filteredClips
					: filteredClips.filter((c) => c.category === category);

			const searchResults: ResultItem[] = [];

			for (const video of clipsToSearch) {
				const lines = video.script.split("\n");

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];

					if (line.includes(word)) {
						const isTimestamp = /^\d+:\d+$/.test(line.trim());

						if (!isTimestamp) {
							let startTime = "";
							let endTime = "";

							for (let j = i - 1; j >= 0; j--) {
								if (/^\d+:\d+$/.test(lines[j].trim())) {
									startTime = lines[j].trim();
									break;
								}
							}

							for (let j = i + 1; j < lines.length; j++) {
								if (/^\d+:\d+$/.test(lines[j].trim())) {
									endTime = lines[j].trim();
									break;
								}
							}

							if (startTime && endTime) {
								searchResults.push({
									id: video.index,
									title: video.title,
									youtubeId: video.youtube_id,
									start: timeStringToSeconds(startTime),
									end: timeStringToSeconds(endTime),
									content: line.trim(),
									word: word,
									category: video.category,
								});
							}
						}
					}
				}
			}

			// 우선순위 정렬
			const sorted = searchResults.sort((a, b) => {
				const getPriority = (text: string) => {
					const lower = text.toLowerCase();
					const target = word.toLowerCase();
					if (lower.startsWith(target)) return 1;
					const words = lower.split(/\s+/);
					if (words.includes(target)) return 2;
					if (lower.includes(target)) return 3;
					return 999;
				};
				const pA = getPriority(a.content);
				const pB = getPriority(b.content);
				if (pA !== pB) return pA - pB;
				return a.content.length - b.content.length;
			});

			setResults(sorted);
		},
		[filteredClips],
	);

	const onSearchChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
		const word = e.target.value;
		setSearchWord(word);
		setPlayingVideo(null);
		searchScript(word, selectedCategory);
	};

	const onClear = () => {
		setSearchWord("");
		setResults([]);
		setPlayingVideo(null);
	};

	const onCategorySelect = (cat: CategoryType) => {
		setSelectedCategory(cat);
		setPlayingVideo(null);
		searchScript(searchWord, cat);
	};

	const onPlayVideo = (video: ResultItem) => {
		setPlayingVideo(
			playingVideo?.youtubeId === video.youtubeId &&
				playingVideo?.start === video.start
				? null
				: video,
		);
	};

	const onMenuClick = (video: ResultItem) => {
		setReportVideo(video);
	};

	const onReport = async (type: string) => {
		if (!reportVideo) return;
		const errorMsg =
			type === "audio_quality" ? "발음이 잘 안들려요" : "부적절한 영상 신고";
		await reportError(reportVideo, type, errorMsg);
		setReportVideo(null);
	};

	useEffect(() => {
		const fetch = async () => {
			const reportedList = await listReport(CATEGORY);
			if (reportedList.length > 0) {
				const reportedIds = reportedList.map((item) => item.target_id);
				const excludeReported = clips.filter(
					(item) => !reportedIds.includes(item.youtube_id),
				);
				setFilteredClips(excludeReported);
			} else {
				setFilteredClips(clips);
			}
		};
		fetch();
	}, []);

	const hasResults = results.length > 0;
	const hasSearchWord = searchWord.trim().length >= 2;

	return (
		<div className="flex h-full w-full flex-col bg-[#f9fafc]">
			{/* 타이틀 */}
			<div className="mt-[20px] flex h-[48px] items-center px-[16px]">
				<span className="font-bold text-[#383a3f] text-[20px] leading-[32px]">
					{t("clip.title")}
				</span>
			</div>

			{/* 검색 입력 */}
			<div className="px-[16px] py-[8px]">
				<SearchInputField
					searchWord={searchWord}
					onSearchChanged={onSearchChanged}
					onClear={onClear}
				/>
			</div>

			{/* 카테고리 칩 (검색어가 있을 때만) */}
			{hasSearchWord && (
				<div className="px-[16px]">
					<CategoryChips
						selected={selectedCategory}
						onSelect={onCategorySelect}
					/>
				</div>
			)}

			{/* 컨텐츠 영역 */}
			<div className="scrollbar-hide flex-1 overflow-y-auto">
				{hasSearchWord && hasResults && (
					<>
						{/* 검색 결과 헤더 */}
						<div className="flex items-center justify-between px-[16px] py-[12px]">
							<span className="font-bold text-[#0180ff] text-[17px] leading-[26px]">
								'{searchWord}'
							</span>
							<span className="font-semibold text-[#7f848d] text-[12px] leading-[18px]">
								{t("clip.resultCount", { count: results.length })}
							</span>
						</div>

						{/* 비디오 리스트 */}
						<div className="flex flex-col gap-[16px] px-[16px] pb-[16px]">
							{results.slice(0, 10).map((item, index) => (
								<div key={`${item.youtubeId}-${item.start}-${index}`}>
									{playingVideo?.youtubeId === item.youtubeId &&
									playingVideo?.start === item.start ? (
										<div className="flex flex-col gap-[8px]">
											<VideoPlayer
												video={item}
												onClose={() => setPlayingVideo(null)}
											/>
											<div className="flex items-center justify-between">
												<p className="w-[296px] truncate font-medium text-[#383a3f] text-[14px] leading-[20px]">
													{item.title}
												</p>
												<button
													type="button"
													onClick={() => onMenuClick(item)}
													className="flex size-[24px] shrink-0 items-center justify-center text-[#7f848d]"
												>
													<MoreVertical size={16} />
												</button>
											</div>
										</div>
									) : (
										<VideoCard
											video={item}
											onPlay={onPlayVideo}
											onMenuClick={onMenuClick}
										/>
									)}
								</div>
							))}
						</div>
					</>
				)}

				{/* 빈 상태 */}
				{!hasResults && (
					<div className="mt-[-30px] flex h-full flex-col items-center justify-center">
						<img
							src="/images/search_empty_img.svg"
							alt=""
							className="size-[64px]"
						/>
						<p className="mt-[8px] text-center font-semibold text-[#24425f] text-[16px] leading-[24px]">
							{t("clip.emptyLine1")}
							<br />
							{t("clip.emptyLine2")}
						</p>
					</div>
				)}
			</div>

			{/* 신고 바텀시트 */}
			{reportVideo && (
				<ReportBottomSheet
					video={reportVideo}
					onClose={() => setReportVideo(null)}
					onReport={onReport}
				/>
			)}
		</div>
	);
}
