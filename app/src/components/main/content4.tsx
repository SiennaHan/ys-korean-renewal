import { clips } from "@/shared/data/clip";
import React, { useState, useRef, useEffect, useCallback } from "react";
import YouTube, {
	type YouTubeProps,
	type YouTubeEvent,
	type YouTubePlayer,
} from "react-youtube";
import { Search, X, MoreVertical, Heart } from "lucide-react";
import { listReport, createReport } from "@/api/report";
import { getGuestId } from "@/api/api";

const CATEGORY = "video";

const CATEGORIES = [
	"All",
	"Entertainment",
	"Film & Drama",
	"News",
	"Lifestyle",
] as const;

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
	return (
		<div className="relative h-[48px] w-full rounded-[10px] bg-white overflow-hidden flex items-center">
			<input
				type="text"
				className="h-full w-full bg-transparent pl-[12px] pr-[72px] text-[14px] font-medium leading-[20px] text-[#383a3f] placeholder:text-[#adb3be] focus:outline-none"
				value={searchWord}
				onChange={onSearchChanged}
				placeholder="Type an expression to search!"
			/>
			{searchWord && (
				<button
					type="button"
					onClick={onClear}
					className="absolute right-[36px] top-1/2 -translate-y-1/2 size-[24px] flex items-center justify-center text-[#adb3be]"
				>
					<X size={16} />
				</button>
			)}
			<div className="absolute right-[12px] top-1/2 -translate-y-1/2 size-[24px] rounded-full bg-[#0180ff] flex items-center justify-center">
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
	return (
		<div className="flex gap-[6px] items-center overflow-x-auto scrollbar-hide py-[8px]">
			{CATEGORIES.map((cat) => {
				const isSelected = cat === selected;
				return (
					<button
						type="button"
						key={cat}
						onClick={() => onSelect(cat)}
						className={`shrink-0 rounded-[8px] px-[12px] py-[6px] text-[14px] leading-[20px] text-center whitespace-nowrap ${
							isSelected
								? "bg-[#dbedff] border border-[#59acff] font-bold text-[#0a6acb]"
								: "bg-white border border-transparent font-semibold text-[#c8ccd3]"
						}`}
					>
						{cat === "Film & Drama" ? "Film/Drama" : cat}
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
		const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
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
				className="relative h-[185px] w-full rounded-[12px] overflow-hidden bg-white"
			>
				<img
					src={thumbnailUrl}
					alt={video.title}
					className="absolute inset-0 w-full h-full object-cover"
				/>
				{/* 시간 뱃지 */}
				<div className="absolute top-[12px] left-[12px] bg-[#383a3f] rounded-[6px] px-[8px] py-[2px]">
					<span className="text-[12px] font-medium leading-[16px] text-white whitespace-nowrap">
						{formatTime(video.start)}
					</span>
				</div>
				{/* 좋아요 아이콘 */}
				<div className="absolute top-[12px] right-[12px] size-[24px] flex items-center justify-center">
					<Heart size={20} className="text-white" />
				</div>
			</button>

			{/* 제목 + 스크립트 + 메뉴 */}
			<div className="flex flex-col gap-[2px]">
				<div className="text-[14px] font-medium leading-[20px] text-[#383a3f]">
					{highlightKeyword(video.content, video.word)}
				</div>
				<div className="flex items-center justify-between">
					<p className="text-[14px] font-medium leading-[20px] text-[#383a3f] w-[296px] truncate">
						{video.title}
					</p>
					<button
						type="button"
						onClick={() => onMenuClick(video)}
						className="shrink-0 size-[24px] flex items-center justify-center text-[#7f848d]"
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
	const endTime =
		video.start === video.end ? video.start + 1 : video.end;
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
		<div ref={containerRef} className="rounded-[12px] overflow-hidden bg-white">
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
	return (
		<>
			{/* 딤드 배경 */}
			<div
				className="fixed inset-0 bg-[rgba(56,58,63,0.5)] z-40"
				onClick={onClose}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
			/>
			{/* 바텀시트 */}
			<div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[16px] z-50 pb-[40px]">
				<div className="flex items-center justify-end px-[16px] pt-[16px] pb-[8px]">
					<button
						type="button"
						onClick={onClose}
						className="size-[24px] flex items-center justify-center text-[#383a3f]"
					>
						<X size={14} />
					</button>
				</div>
				<button
					type="button"
					onClick={() => onReport("audio_quality")}
					className="w-full flex items-center gap-[4px] px-[16px] py-[12px] bg-white"
				>
					<div className="size-[24px] flex items-center justify-center">
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
					<span className="text-[16px] font-medium leading-[24px] text-[#383a3f]">
						발음이 잘 안들려요
					</span>
				</button>
				<button
					type="button"
					onClick={() => onReport("inappropriate")}
					className="w-full flex items-center gap-[4px] px-[16px] py-[12px] bg-white"
				>
					<div className="size-[24px] flex items-center justify-center">
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
							<rect
								x="2"
								y="15"
								width="12"
								height="2"
								rx="1"
								fill="#383A3F"
							/>
						</svg>
					</div>
					<span className="text-[16px] font-medium leading-[24px] text-[#4b505a]">
						부적절한 영상 신고
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
	const [searchWord, setSearchWord] = useState("");
	const [results, setResults] = useState<ResultItem[]>([]);
	const [filteredClips, setFilteredClips] = useState<ClipItem[]>([]);
	const [selectedCategory, setSelectedCategory] =
		useState<CategoryType>("All");
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
			type === "audio_quality"
				? "발음이 잘 안들려요"
				: "부적절한 영상 신고";
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
		<div className="flex flex-col h-full w-full bg-[#f9fafc]">
			{/* 타이틀 */}
			<div className="h-[48px] flex px-[16px] items-center mt-[20px]">
				<span className="text-[20px] font-bold leading-[32px] text-[#383a3f]">
					표현 클립
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
			<div className="flex-1 overflow-y-auto scrollbar-hide">
				{hasSearchWord && hasResults && (
					<>
						{/* 검색 결과 헤더 */}
						<div className="px-[16px] py-[12px] flex items-center justify-between">
							<span className="text-[17px] font-bold leading-[26px] text-[#0180ff]">
								'{searchWord}'
							</span>
							<span className="text-[12px] font-semibold leading-[18px] text-[#7f848d]">
								검색 결과 {results.length}개
							</span>
						</div>

						{/* 비디오 리스트 */}
						<div className="px-[16px] flex flex-col gap-[16px] pb-[16px]">
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
												<p className="text-[14px] font-medium leading-[20px] text-[#383a3f] w-[296px] truncate">
													{item.title}
												</p>
												<button
													type="button"
													onClick={() => onMenuClick(item)}
													className="shrink-0 size-[24px] flex items-center justify-center text-[#7f848d]"
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
					<div className="h-full flex flex-col justify-center items-center mt-[-30px]">
						<img
							src="/images/search_empty_img.svg"
							alt=""
							className="size-[64px]"
						/>
						<p className="text-center text-[16px] font-semibold leading-[24px] text-[#24425f] mt-[8px]">
							Search for the expression
							<br />
							you want to learn!
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
