import type { ReportItem } from "@/api/apiType";
import { createReport, listReport } from "@/api/report";
import { clips } from "@/shared/data/clip";
import { MoreVertical, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import YouTube, {
	type YouTubeProps,
	type YouTubeEvent,
	type YouTubePlayer,
} from "react-youtube";

/** 상태를 읽지 않는 순수 헬퍼라 컴포넌트 밖에 둔다 — 안에 두면 매 렌더마다
  새로 만들어져 useCallback 의 의존성이 계속 흔들린다. */
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

const CATEGORY = "video";

/**
 * 어떤 검색어로도 재생되지 않는다 — 이 셋만 검색 결과에서 **뺀다**(clip_spec_v1 §05-6).
 * 「발음이 잘 안 들려요」(audio_quality)는 하위 정렬로, 「선정적·폭력적 내용」
 * (inappropriate)은 숨기지 않고 슬랙으로만 다룬다 — 되돌릴 사람이 없어서다.
 */
const UNPLAYABLE_CODES = new Set(["100", "101", "150"]);

/** 신고된 구간의 키. 검색어가 달라도 같은 줄이면 같은 구간이라 (영상, 시작 초)만 본다 */
const segmentKey = (youtubeId: string, start: number) =>
	`${youtubeId}@${start}`;

const matchPriority = (text: string, word: string) => {
	const lower = text.toLowerCase();
	const target = word.toLowerCase();
	if (lower.startsWith(target)) return 1;
	const words = lower.split(/\s+/);
	if (words.includes(target)) return 2;
	if (lower.includes(target)) return 3;
	return 999;
};

/*
 * 정렬 — clip_spec_v1 §05-6. **신고 여부가 우선순위보다 앞선 축이다.**
 * 신고된 구간은 목록에서 빠지지 않고, 우선순위·길이로 매긴 순서를 유지한
 * 채로 신고 안 된 구간들 아래로 내려간다. 뺀 것이 아니라 **뒤로 보낸 것**이다.
 */
const compareResults = (
	a: ResultItem,
	b: ResultItem,
	word: string,
	demoted: Set<string>,
) => {
	const dA = demoted.has(segmentKey(a.youtubeId, a.start)) ? 1 : 0;
	const dB = demoted.has(segmentKey(b.youtubeId, b.start)) ? 1 : 0;
	if (dA !== dB) return dA - dB;
	const pA = matchPriority(a.content, word);
	const pB = matchPriority(b.content, word);
	if (pA !== pB) return pA - pB;
	return a.content.length - b.content.length;
};

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
				className="h-full w-full bg-transparent pr-[72px] pl-[12px] font-medium text-[14px] text-text-strong leading-[20px] placeholder:text-text-sub focus:outline-none"
				value={searchWord}
				onChange={onSearchChanged}
				placeholder={t("clip.searchPlaceholder")}
			/>
			{searchWord && (
				<button
					type="button"
					onClick={onClear}
					className="-translate-y-1/2 absolute top-1/2 right-[36px] flex size-[24px] items-center justify-center text-icon-normal"
				>
					<X size={16} />
				</button>
			)}
			<div className="-translate-y-1/2 absolute top-1/2 right-[12px] flex size-[24px] items-center justify-center rounded-full bg-fill-primary">
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
								? // 고른 칩의 테두리(blue-300)와 글자(blue-700)는 semantic 에 이름이 없다.
									// 활동 셸의 .chip-opt.on 은 또 다른 값(#e9f2fc)을 쓰고 있어서,
									// 어느 쪽이 정본인지 정해지기 전에는 옮기지 않는다
									"border border-[#59acff] bg-background-choice font-bold text-[#0a6acb]"
								: "border border-transparent bg-white font-semibold text-text-sub"
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
						<span key={index} className="font-bold text-text-strong">
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
				{/* 결과 상한을 없앴으므로(§05-2) 목록이 수백 장이 될 수 있다 —
				    `loading="lazy"` 로 보이는 것만 받는다 */}
				<img
					src={thumbnailUrl}
					alt={video.title}
					loading="lazy"
					decoding="async"
					className="absolute inset-0 h-full w-full object-cover"
				/>
				{/* 시간 뱃지 — 썸네일 위에 얹는 어두운 오버레이다. semantic 에 "그림 위
				    오버레이" 역할이 없고 이 화면에만 있어서, 이 하나 때문에 토큰을
				    만들지 않고 값을 남긴다(blue-gray-900 과 같은 값) */}
				<div className="absolute top-[12px] left-[12px] rounded-[6px] bg-[#383a3f] px-[8px] py-[2px]">
					<span className="whitespace-nowrap font-medium text-[12px] text-white leading-[16px]">
						{formatTime(video.start)}
					</span>
				</div>
				{/*
				 * **하트(좋아요)를 뺐다** — clip_spec_v1 §05 의 5번(기획 확정 2026-08-27).
				 * `onClick` 이 없는 `<div>` 안의 아이콘이었고 저장하는 곳도 없었다.
				 * 눌러도 안 되는 하트는 기능이 없는 것보다 나쁘다.
				 * 만들 때 필요한 것은 그 문서 §06 의 마지막 줄에 적혀 있다.
				 */}
			</button>

			{/* 제목 + 스크립트 + 메뉴 */}
			<div className="flex flex-col gap-[2px]">
				<div className="font-medium text-[14px] text-text-strong leading-[20px]">
					{highlightKeyword(video.content, video.word)}
				</div>
				<div className="flex items-center justify-between">
					<p className="w-[296px] truncate font-medium text-[14px] text-text-strong leading-[20px]">
						{video.title}
					</p>
					<button
						type="button"
						onClick={() => onMenuClick(video)}
						className="flex size-[24px] shrink-0 items-center justify-center text-text-sub"
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
		if (!errorCode) return;
		// 같은 영상에서 재생 오류가 반복 나도(자동 재시도 등) 세션에 한 번만 신고한다.
		// 이 dedupe 는 자동 신고 전용이다 — 사람이 바텀시트로 보내는 신고는 막지 않는다
		if (errorIds.includes(video.youtubeId)) return;
		errorIds.push(video.youtubeId);
		await reportError(video, errorCode, errorMsg);
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
	pending,
	failed,
}: {
	video: ResultItem;
	onClose: () => void;
	onReport: (type: string) => void;
	/** 신고를 보내는 중 — 두 번 보내는 것을 막으려고 버튼을 잠깐 잠근다 */
	pending: boolean;
	/** 직전 시도가 저장에 실패했다 — 같은 이유를 다시 누르면 재시도된다(DEV-02) */
	failed: boolean;
}) => {
	const { t } = useTranslation();
	return (
		<>
			{/* 딤드 배경 */}
			<div
				className="absolute inset-0 z-40 bg-black/40"
				onClick={onClose}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
			/>
			{/* 바텀시트 */}
			<div className="absolute inset-x-0 bottom-0 z-50 rounded-t-[16px] bg-white pb-[40px]">
				<div className="flex items-center justify-end px-[16px] pt-[16px] pb-[8px]">
					<button
						type="button"
						onClick={onClose}
						className="flex size-[24px] items-center justify-center text-text-strong"
					>
						<X size={14} />
					</button>
				</div>
				{failed && (
					<p className="px-[16px] pb-[8px] font-medium text-[#F76853] text-[13px] leading-[18px]">
						{t("clip.reportFailed")}
					</p>
				)}
				<button
					type="button"
					disabled={pending}
					onClick={() => onReport("audio_quality")}
					className="flex w-full items-center gap-[4px] bg-white px-[16px] py-[12px] disabled:opacity-50"
				>
					<div className="flex size-[24px] items-center justify-center text-icon-strong">
						<svg
							aria-hidden="true"
							width="18"
							height="18"
							viewBox="0 0 18 18"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M9 1C4.58 1 1 4.58 1 9s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 11.5a1 1 0 110-2 1 1 0 010 2zM9.75 9a.75.75 0 01-1.5 0V5.5a.75.75 0 011.5 0V9z"
								fill="currentColor"
							/>
						</svg>
					</div>
					<span className="font-medium text-[16px] text-text-strong leading-[24px]">
						{t("clip.reportAudio")}
					</span>
				</button>
				<button
					type="button"
					disabled={pending}
					onClick={() => onReport("inappropriate")}
					className="flex w-full items-center gap-[4px] bg-white px-[16px] py-[12px] disabled:opacity-50"
				>
					<div className="flex size-[24px] items-center justify-center text-icon-strong">
						<svg
							aria-hidden="true"
							width="16"
							height="18"
							viewBox="0 0 16 18"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M6 4a6 6 0 1112 0H6z"
								fill="currentColor"
								transform="translate(-2, 2) scale(0.8)"
							/>
							<rect
								x="2"
								y="15"
								width="12"
								height="2"
								rx="1"
								fill="currentColor"
							/>
						</svg>
					</div>
					<span className="font-medium text-[16px] text-text-strong leading-[24px]">
						{t("clip.reportInappropriate")}
					</span>
				</button>
			</div>
		</>
	);
};

/**
 * 신고 저장. **누가 신고했는지는 서버가 인증 토큰에서 정한다** — 여기서 user_id 를
 * 안 보내는 이유다(DEV-02). 실패하면 `null` 을 돌려주고, 호출부가 실패 상태를 보여 준다.
 */
const reportError = async (
	video: ResultItem,
	errorCode: string | number,
	errorMsg: string,
): Promise<ReportItem | null> => {
	const request: ReportItem = {
		category: CATEGORY,
		target_id: video.youtubeId,
		error_code: `${errorCode}`,
		error_msg: errorMsg,
		// 검색어(진단용) · 구간 시작 초 · 검색에 걸린 대본 줄 — clip_spec_v1 §06
		content: video.word,
		segment_start: video.start,
		matched_line: video.content,
		// 슬랙 알림에만 쓴다(inappropriate 일 때) — DB 컬럼이 아니다
		title: video.title,
		clip_category: video.category,
	};
	return await createReport(request);
};

/**
 * 표현 클립 — **표시만** 한다. 검색·재생·신고는 아래 `Content4` 가 쥔다.
 *
 * 가른 이유는 다른 화면과 같다 — **목업 대조가 이것을 그린다.** 대조는 제품이 실제로
 * 그리는 컴포넌트에 픽스처를 넣어 정적 HTML 로 만들고 캡처와 견주는데, 상태와 훅이
 * 섞인 채로는 그릴 수가 없다. 이 화면은 그동안 대조 밖에 있었다
 * (`clip_spec_v1` §07 · `masterplan_v3` §15 "목업 없음").
 *
 * 재생 중인 카드 자리에는 `playerSlot` 이 들어간다 — `VideoPlayer` 는 유튜브
 * 플레이어와 감시자를 들고 있어 순수하지 않다. 자모 화면의 `after` 와 같은 방식이다.
 */
export function ClipView({
	title,
	searchWord,
	onSearchChanged,
	onClear,
	/** 검색어가 두 자 이상인가 — 칩과 결과가 이때만 나온다 */
	searching,
	category,
	onCategorySelect,
	/**
	 * 지금 **그리는** 결과. 상한이 아니다 — 몇 개인지는 `total` 이 말한다.
	 * 끝까지 열리되 그리는 것은 본 만큼이다(`clip_spec_v1` §05 의 2번)
	 */
	items,
	total,
	/** 재생 중인 것. 이 카드 자리에 `playerSlot` 이 들어간다 */
	playing,
	playerSlot,
	onPlay,
	onMenuClick,
	/** 목록 끝 표식. 보이면 한 판 더 그린다 — 없으면 다 그린 것이다 */
	tailRef,
	showTail,
	scrollRef,
	/** 신고 바텀시트. 없으면 안 그린다 */
	sheet,
}: {
	title: string;
	searchWord: string;
	onSearchChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onClear: () => void;
	searching: boolean;
	category: CategoryType;
	onCategorySelect: (c: CategoryType) => void;
	items: ResultItem[];
	total: number;
	playing?: { youtubeId: string; start: number } | null;
	playerSlot?: ReactNode;
	onPlay: (v: ResultItem) => void;
	onMenuClick: (v: ResultItem) => void;
	tailRef?: React.Ref<HTMLDivElement>;
	showTail?: boolean;
	scrollRef?: React.Ref<HTMLDivElement>;
	sheet?: ReactNode;
}) {
	const { t } = useTranslation();
	const hasResults = items.length > 0;

	return (
		<div className="flex h-full w-full flex-col bg-background-base">
			{/* 타이틀 */}
			<div className="mt-[20px] flex h-[48px] items-center px-[16px]">
				<span className="font-bold text-[20px] text-text-strong leading-[32px]">
					{title}
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
			{searching && (
				<div className="px-[16px]">
					<CategoryChips selected={category} onSelect={onCategorySelect} />
				</div>
			)}

			{/* 컨텐츠 영역 */}
			<div ref={scrollRef} className="scrollbar-hide flex-1 overflow-y-auto">
				{searching && hasResults && (
					<>
						{/* 검색 결과 헤더 */}
						<div className="flex items-center justify-between px-[16px] py-[12px]">
							<span className="font-bold text-[17px] text-text-primary leading-[26px]">
								'{searchWord}'
							</span>
							<span className="font-semibold text-[12px] text-text-sub leading-[18px]">
								{t("clip.resultCount", { count: total })}
							</span>
						</div>

						{/* 비디오 리스트 */}
						<div className="flex flex-col gap-[16px] px-[16px] pb-[16px]">
							{items.map((item, index) => (
								<div key={`${item.youtubeId}-${item.start}-${index}`}>
									{playing?.youtubeId === item.youtubeId &&
									playing?.start === item.start ? (
										<div className="flex flex-col gap-[8px]">
											{playerSlot}
											<div className="flex items-center justify-between">
												<p className="w-[296px] truncate font-medium text-[14px] text-text-strong leading-[20px]">
													{item.title}
												</p>
												<button
													type="button"
													onClick={() => onMenuClick(item)}
													className="flex size-[24px] shrink-0 items-center justify-center text-text-sub"
												>
													<MoreVertical size={16} />
												</button>
											</div>
										</div>
									) : (
										<VideoCard
											video={item}
											onPlay={onPlay}
											onMenuClick={onMenuClick}
										/>
									)}
								</div>
							))}
							{/* 목록 끝 표식 — 보이면 한 판 더 그린다(위 감시자) */}
							{showTail && <div ref={tailRef} className="h-[1px] w-full" />}
						</div>
					</>
				)}

				{/*
				 * 빈 상태가 **둘**이다 — clip_spec_v1 §04 의 2번(기획 확정 2026-08-27).
				 *
				 * 전에는 하나뿐이라 **검색 전과 검색 실패에 같은 말**을 냈다 —
				 * "배우고 싶은 표현을 검색해 보세요". 0건이 나온 사람에게는 답이 아니다.
				 * 검색어를 되짚어 주고 다른 말로 찾아보라고 한다.
				 */}
				{!hasResults && (
					<div className="mt-[-30px] flex h-full flex-col items-center justify-center px-[24px]">
						<img
							src="/images/search_empty_img.svg"
							alt=""
							className="size-[64px]"
						/>
						{searching ? (
							<>
								<p className="mt-[8px] break-keep text-center font-semibold text-[16px] text-text-heading leading-[24px]">
									{t("clip.noResultTitle", { word: searchWord.trim() })}
								</p>
								<p className="mt-[4px] break-keep text-center font-medium text-[14px] text-text-sub leading-[20px]">
									{t("clip.noResultBody")}
								</p>
							</>
						) : (
							<p className="mt-[8px] text-center font-semibold text-[16px] text-text-heading leading-[24px]">
								{t("clip.emptyLine1")}
								<br />
								{t("clip.emptyLine2")}
							</p>
						)}
					</div>
				)}
			</div>

			{/* 신고 바텀시트 */}
			{sheet}
		</div>
	);
}

export default function Content4() {
	const { t } = useTranslation();
	const [searchWord, setSearchWord] = useState("");
	const [results, setResults] = useState<ResultItem[]>([]);
	const [filteredClips, setFilteredClips] = useState<ClipItem[]>([]);
	const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");
	const [playingVideo, setPlayingVideo] = useState<ResultItem | null>(null);
	const [reportVideo, setReportVideo] = useState<ResultItem | null>(null);
	const [reportPending, setReportPending] = useState(false);
	const [reportFailed, setReportFailed] = useState(false);
	/**
	 * 신고된 구간(발음이 잘 안 들려요) — `${youtubeId}@${start}` 키. 정렬에서
	 * 하위로 미는 재료다. 재생 불가로 뺀 영상과 별도로 관리한다 — clip_spec_v1 §05-6
	 */
	const [demotedSegments, setDemotedSegments] = useState<Set<string>>(
		() => new Set(),
	);

	/*
	 * **한 번에 그리는 수.** 결과 상한이 아니다 — `clip_spec_v1` §05 의 2번
	 * (기획 확정 2026-08-27)이 "개수를 낸 만큼 보여 준다" 로 정했다.
	 *
	 * 전에는 `results.slice(0, 10)` 이 **상한**이었다. 머리글은 전체 개수를 적는데
	 * (「그래서」는 1,226건) 열 개만 주고 더 보는 길이 없었다 — **개수가 거짓말**이었다.
	 * 사례를 여럿 들어 보는 것이 이 기능의 목적이므로 열 개로 끊으면 목적을 깎는다.
	 *
	 * 그렇다고 수백 장을 한 번에 그리지도 않는다. 아래 감시자가 목록 끝에 닿을 때마다
	 * 한 판을 더 그린다 — **끝까지 열리되 그리는 것은 본 만큼**이다.
	 * 버튼이 아니라 스크롤로 한 이유는 1,226건에서 「더 보기」를 122번 누를 수 없기 때문이다.
	 */
	const PAGE = 10;
	const [shown, setShown] = useState(PAGE);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	/*
	 * 목록이 갈리면 **처음 판으로 되돌리고 맨 위로 올린다.**
	 *
	 * 위로 올리는 것이 같이 있어야 한다 — 상한을 없애기 전에는 목록이 최대 열 장이라
	 * 거의 스크롤되지 않았지만 이제는 아래에 있을 수 있다. 그 자리에 남으면
	 * ① 새 결과의 중간이 보이고 ② 목록 끝 표식이 곧바로 눈에 들어와
	 * **감시자가 연달아 여러 판을 그린다** — 갈래를 바꿨을 때 열 장이 아니라
	 * 마흔 장이 그려지는 것을 브라우저에서 봤다.
	 */
	const resetList = useCallback(() => {
		setShown(PAGE);
		if (scrollRef.current) scrollRef.current.scrollTop = 0;
	}, []);

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

			const sorted = searchResults.sort((a, b) =>
				compareResults(a, b, word, demotedSegments),
			);

			setResults(sorted);
		},
		[filteredClips, demotedSegments],
	);

	const onSearchChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
		const word = e.target.value;
		setSearchWord(word);
		setPlayingVideo(null);
		resetList();
		searchScript(word, selectedCategory);
	};

	const onClear = () => {
		setSearchWord("");
		setResults([]);
		setPlayingVideo(null);
		resetList();
	};

	const onCategorySelect = (cat: CategoryType) => {
		setSelectedCategory(cat);
		setPlayingVideo(null);
		resetList();
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

	/** 신고 시트를 완전히 닫는다 — 진행 중·실패 상태까지 같이 지운다 */
	const closeReportSheet = () => {
		setReportVideo(null);
		setReportPending(false);
		setReportFailed(false);
	};

	const onMenuClick = (video: ResultItem) => {
		setReportVideo(video);
		setReportPending(false);
		setReportFailed(false);
	};

	/*
	 * 신고 사유는 **코드로 보내고 문구는 화면이 만든다** — clip_spec_v1 §06.
	 *
	 * 전에는 화면에 보이는 한국어를 그대로 `error_msg` 에 실었다. 그러면
	 * **UI 언어가 다섯인데 DB 에는 한국어만 쌓이고**, 문구를 고치는 순간
	 * 같은 사유가 두 이름으로 갈린다(실제로 「부적절한 영상 신고」를
	 * 「선정적·폭력적 내용」으로 좁히면서 그럴 뻔했다).
	 *
	 * `error_code` 가 사유이고(`audio_quality` · `inappropriate`),
	 * `error_msg` 는 **언어를 타지 않는 고정 라벨**이다 — 사람이 DB 나 슬랙에서
	 * 읽을 때 코드만 있으면 불편하므로 남기되 화면 문구와 잇지 않는다.
	 */
	const REPORT_LABEL: Record<string, string> = {
		audio_quality: "audio quality (sync/inaudible)",
		inappropriate: "inappropriate content (sexual/violent)",
	};

	/*
	 * **조용한 실패를 없앤다** — clip_spec_v1 §06 · DEV-02. 전에는 `createReport` 가
	 * 실패해도 반환을 안 보고 바텀시트를 닫아 보낸 것처럼 보였다. 이제 실패하면
	 * 시트를 열어 둔 채 실패 문구를 보여 준다 — 같은 이유 버튼을 다시 누르면 재시도된다.
	 */
	const onReport = async (type: string) => {
		if (!reportVideo || reportPending) return;
		setReportPending(true);
		setReportFailed(false);
		const saved = await reportError(
			reportVideo,
			type,
			REPORT_LABEL[type] ?? type,
		);
		setReportPending(false);
		if (saved) {
			/*
			 * 방금 신고된 구간을 **지금 보이는 목록에도** 바로 반영한다 —
			 * `setDemotedSegments` 는 다음 렌더에서야 반영되므로, 그 자리에서 바로
			 * `searchScript` 를 다시 불러도 옛 값으로 정렬한다. 대신 병합한 집합을
			 * 직접 만들어 지금 결과를 그 자리에서 다시 정렬한다
			 */
			if (type === "audio_quality") {
				const key = segmentKey(reportVideo.youtubeId, reportVideo.start);
				const nextDemoted = new Set(demotedSegments);
				nextDemoted.add(key);
				setDemotedSegments(nextDemoted);
				setResults((prev) =>
					[...prev].sort((a, b) =>
						compareResults(a, b, searchWord, nextDemoted),
					),
				);
			}
			closeReportSheet();
		} else {
			setReportFailed(true);
		}
	};

	useEffect(() => {
		const fetch = async () => {
			const reportedList = await listReport(CATEGORY);

			// 재생 불가(100·101·150)만 검색 결과에서 뺀다 — 나머지는 하위 정렬/슬랙으로 다룬다
			const unplayableIds = new Set(
				reportedList
					.filter((r) => UNPLAYABLE_CODES.has(r.error_code ?? ""))
					.map((r) => r.target_id),
			);
			setFilteredClips(
				unplayableIds.size > 0
					? clips.filter((item) => !unplayableIds.has(item.youtube_id))
					: clips,
			);

			// 신고된 구간(발음이 잘 안 들려요) — 정렬에서 하위로 미는 재료
			setDemotedSegments(
				new Set(
					reportedList
						.filter((r) => r.error_code === "audio_quality")
						.filter((r) => typeof r.segment_start === "number")
						.map((r) => segmentKey(r.target_id, r.segment_start as number)),
				),
			);
		};
		fetch();
	}, []);

	const hasResults = results.length > 0;
	const hasSearchWord = searchWord.trim().length >= 2;

	/*
	 * 목록 끝에 닿으면 한 판 더. `shown` 을 의존성에 두는 것이 방아쇠다 —
	 * 한 판 늘어나면 감시자를 새 끝자리에 다시 걸어야 한다.
	 *
	 * `results.length` 도 같이 본다. 검색 결과가 바뀌면 끝자리도 바뀐다.
	 */
	const tailRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const el = tailRef.current;
		if (!el) return;
		if (shown >= results.length) return;
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						setShown((n) => Math.min(n + PAGE, results.length));
					}
				}
			},
			// 끝에 닿기 전에 미리 받아 둔다 — 스크롤이 멈추지 않게
			{ rootMargin: "600px 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [shown, results.length]);

	const shownItems = results.slice(0, shown);
	const playingItem = shownItems.find(
		(x) =>
			playingVideo?.youtubeId === x.youtubeId &&
			playingVideo?.start === x.start,
	);

	return (
		<ClipView
			title={t("clip.title")}
			searchWord={searchWord}
			onSearchChanged={onSearchChanged}
			onClear={onClear}
			searching={hasSearchWord}
			category={selectedCategory}
			onCategorySelect={onCategorySelect}
			items={shownItems}
			total={results.length}
			playing={playingVideo}
			playerSlot={
				playingItem ? (
					<VideoPlayer
						video={playingItem}
						onClose={() => setPlayingVideo(null)}
					/>
				) : null
			}
			onPlay={onPlayVideo}
			onMenuClick={onMenuClick}
			tailRef={tailRef}
			showTail={shown < results.length}
			scrollRef={scrollRef}
			sheet={
				reportVideo ? (
					<ReportBottomSheet
						video={reportVideo}
						onClose={closeReportSheet}
						onReport={onReport}
						pending={reportPending}
						failed={reportFailed}
					/>
				) : null
			}
		/>
	);
}
