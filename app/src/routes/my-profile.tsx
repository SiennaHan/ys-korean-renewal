import { useAuth } from "@/components/sign/sign-provider";
import { SettingsPage } from "@/components/ui/settings-page";
import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/my-profile")({
	component: MyProfilePage,
});

const NATIONALITY_LIST = [
	"South Korea",
	"China",
	"Japan",
	"Vietnam",
	"United States",
	"Mongolia",
	"Indonesia",
	"Thailand",
	"Philippines",
	"Other",
];

function MyProfilePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user, isLoggedInUser } = useAuth();

	const [nationality, setNationality] = useState("South Korea");
	const [level, setLevel] = useState("1");
	const [classNum, setClassNum] = useState("1");

	const [nationalityOpen, setNationalityOpen] = useState(false);
	const [levelOpen, setLevelOpen] = useState(false);
	const [classOpen, setClassOpen] = useState(false);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const nationalityRef = useRef<HTMLDivElement>(null);
	const levelRef = useRef<HTMLDivElement>(null);
	const classRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isLoggedInUser) {
			navigate({ to: "/main/my" });
		}
	}, [isLoggedInUser, navigate]);

	// 드롭다운 외부 클릭 시 닫기
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (
				nationalityRef.current &&
				!nationalityRef.current.contains(e.target as Node)
			) {
				setNationalityOpen(false);
			}
			if (levelRef.current && !levelRef.current.contains(e.target as Node)) {
				setLevelOpen(false);
			}
			if (classRef.current && !classRef.current.contains(e.target as Node)) {
				setClassOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const handleSubmit = async () => {
		setError("");
		setIsLoading(true);
		// TODO: 프로필 업데이트 API 연결
		await new Promise((r) => setTimeout(r, 500));
		setIsLoading(false);
		navigate({ to: "/main/my" });
	};

	const levels = ["1", "2", "3", "4", "5", "6"];
	const classes = ["1", "2", "3", "4", "5"];

	return (
		<SettingsPage
			title={t("mypage.profileInfo.title")}
			onBack={() => navigate({ to: "/main/my" })}
			submit={{
				label: isLoading
					? t("mypage.profileInfo.submitting")
					: t("mypage.profileInfo.submit"),
				disabled: isLoading,
				onClick: handleSubmit,
			}}
		>
			{/* 안내 박스 */}
			<div className="rounded-[12px] bg-background-sunken p-[12px]">
				<p className="font-bold text-[14px] text-text-primary leading-[20px]">
					{t("mypage.profileInfo.notice")}
				</p>
				<p className="mt-[8px] font-semibold text-[12px] text-text-sub leading-[18px]">
					{t("mypage.profileInfo.noticeText")}
				</p>
			</div>

			{/* 이메일 (읽기 전용) */}
			<div className="flex h-[52px] items-center gap-[20px] rounded-[12px] bg-white px-[16px]">
				<span className="shrink-0 font-medium text-[14px] text-text-sub leading-[20px]">
					Email
				</span>
				<span className="truncate font-medium text-[14px] text-text-strong leading-[20px]">
					{user?.email ?? ""}
				</span>
			</div>

			{/* 국적 설정 */}
			<div className="flex flex-col gap-[8px]">
				<span className="font-bold text-[16px] text-text-strong leading-[24px]">
					{t("mypage.profileInfo.nationality")}
				</span>
				<div ref={nationalityRef} className="relative">
					<button
						type="button"
						onClick={() => setNationalityOpen((v) => !v)}
						className="flex h-[52px] w-full items-center justify-between rounded-[12px] bg-white px-[16px]"
					>
						<span className="font-semibold text-[16px] text-text-strong leading-[24px]">
							{nationality}
						</span>
						<ChevronDown
							className={cn(
								"size-[20px] text-text-sub transition-transform",
								nationalityOpen && "rotate-180",
							)}
						/>
					</button>
					{nationalityOpen && (
						<div className="absolute z-10 mt-[4px] w-full overflow-hidden rounded-[12px] bg-white shadow-lg">
							{NATIONALITY_LIST.map((item) => (
								<button
									key={item}
									type="button"
									onClick={() => {
										setNationality(item);
										setNationalityOpen(false);
									}}
									className={cn(
										"flex h-[40px] w-full items-center px-[16px] font-semibold text-[16px] leading-[24px]",
										item === nationality
											? "bg-background-base text-text-strong"
											: "text-text-strong hover:bg-background-base",
									)}
								>
									{item}
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* 급/반 변경 */}
			<div className="flex flex-col gap-[8px]">
				<span className="font-bold text-[16px] text-text-strong leading-[24px]">
					{t("mypage.profileInfo.classLevel")}
				</span>
				<div className="flex gap-[12px]">
					{/* 급 */}
					<div ref={levelRef} className="relative flex-1">
						<div className="mb-[4px] font-semibold text-[12px] text-text-sub leading-[18px]">
							{t("mypage.profileInfo.level")}
						</div>
						<button
							type="button"
							onClick={() => setLevelOpen((v) => !v)}
							className={cn(
								"flex h-[52px] w-full items-center justify-between rounded-[12px] bg-white px-[16px]",
								levelOpen && "ring-1 ring-line-focus",
							)}
						>
							<span className="font-semibold text-[16px] text-text-strong leading-[24px]">
								{level}
								{t("mypage.profileInfo.level")}
							</span>
							<ChevronDown
								className={cn(
									"size-[20px] text-text-sub transition-transform",
									levelOpen && "rotate-180",
								)}
							/>
						</button>
						{levelOpen && (
							<div className="absolute z-10 mt-[4px] w-full overflow-hidden rounded-[12px] bg-white shadow-lg">
								{levels.map((item) => (
									<button
										key={item}
										type="button"
										onClick={() => {
											setLevel(item);
											setLevelOpen(false);
										}}
										className={cn(
											"flex h-[40px] w-full items-center px-[16px] font-semibold text-[16px] leading-[24px]",
											item === level
												? "bg-background-base text-text-strong"
												: "text-text-strong hover:bg-background-base",
										)}
									>
										{item}
										{t("mypage.profileInfo.level")}
									</button>
								))}
							</div>
						)}
					</div>

					{/* 반 */}
					<div ref={classRef} className="relative flex-1">
						<div className="mb-[4px] font-semibold text-[12px] text-text-sub leading-[18px]">
							{t("mypage.profileInfo.class")}
						</div>
						<button
							type="button"
							onClick={() => setClassOpen((v) => !v)}
							className={cn(
								"flex h-[52px] w-full items-center justify-between rounded-[12px] bg-white px-[16px]",
								classOpen && "ring-1 ring-line-focus",
							)}
						>
							<span className="font-semibold text-[16px] text-text-strong leading-[24px]">
								{classNum}
								{t("mypage.profileInfo.class")}
							</span>
							<ChevronDown
								className={cn(
									"size-[20px] text-text-sub transition-transform",
									classOpen && "rotate-180",
								)}
							/>
						</button>
						{classOpen && (
							<div className="absolute z-10 mt-[4px] w-full overflow-hidden rounded-[12px] bg-white shadow-lg">
								{classes.map((item) => (
									<button
										key={item}
										type="button"
										onClick={() => {
											setClassNum(item);
											setClassOpen(false);
										}}
										className={cn(
											"flex h-[40px] w-full items-center px-[16px] font-semibold text-[16px] leading-[24px]",
											item === classNum
												? "bg-background-base text-text-strong"
												: "text-text-strong hover:bg-background-base",
										)}
									>
										{item}
										{t("mypage.profileInfo.class")}
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{error && (
				<p className="text-center text-[14px] text-fill-wrong">{error}</p>
			)}

			{/*
			 * 문의하기 — 앱 안에서 도움을 청할 수 있는 유일한 자리다.
			 * 전화를 두지 않기로 했다(이용자 상당수가 국외다 · 2026-08-27 확정).
			 * 개인정보 열람·삭제 요청도 여기로 온다(docs/legal_draft_v1.html §03 제6조).
			 */}
			<button
				type="button"
				onClick={() =>
					navigate({ to: "/inquiry", search: { from: "/my-profile" } })
				}
				className="flex h-[52px] w-full items-center justify-between rounded-[12px] bg-white px-[16px]"
			>
				<span className="font-semibold text-[16px] text-text-strong leading-[24px]">
					{t("inquiry.title")}
				</span>
				<ChevronRight className="size-[20px] text-text-sub" />
			</button>
		</SettingsPage>
	);
}
