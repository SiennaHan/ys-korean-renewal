import { useAuth } from "@/components/sign/sign-provider";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogOut, Pencil, User } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Content5() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	// 라우트가 게스트를 막으므로 여기 오는 사람은 늘 로그인 상태다
	const { user, signOut } = useAuth();

	const handleSignOut = () => {
		signOut();
		navigate({ to: "/login" });
	};

	return (
		<div className="flex min-h-full flex-col bg-[#f6f7f8] px-[16px] pb-[24px]">
			{/* 헤더 */}
			<div className="pt-[20px] pb-[20px] font-bold text-[#383A3F] text-[20px] leading-[32px]">
				{t("mypage.title")}
			</div>

			{/* 프로필 영역 */}
			<div className="mb-[16px] flex items-center gap-[12px]">
				<div className="relative shrink-0">
					<div className="flex size-[64px] items-center justify-center rounded-full bg-white">
						<User className="size-[32px] text-[#7F848D]" />
					</div>
					{user && (
						<button
							type="button"
							aria-label={t("mypage.changePhoto")}
							className="absolute right-0 bottom-0 flex size-[24px] items-center justify-center rounded-full bg-[#383A3F]"
						>
							<Pencil className="size-[10px] text-white" />
						</button>
					)}
				</div>
				<div className="line-clamp-2 font-semibold text-[#383A3F] text-[16px] leading-[24px]">
					{user?.name}
				</div>
			</div>

			{/* 계정 메뉴 카드 */}
			<div className="mb-[12px] overflow-hidden rounded-[12px] bg-white">
				<button
					type="button"
					onClick={() => navigate({ to: "/my-profile" })}
					className="flex h-[52px] w-full items-center px-[16px] active:bg-[#f6f7f8]"
				>
					<span className="font-semibold text-[#383A3F] text-[14px] leading-[20px]">
						{t("mypage.editProfile")}
					</span>
					<ChevronRight className="ml-auto size-[20px] text-[#C4C9D0]" />
				</button>
				<div className="mx-[16px] h-[1px] bg-[#E5E8EC]" />
				<button
					type="button"
					onClick={() => navigate({ to: "/my-password" })}
					className="flex h-[52px] w-full items-center px-[16px] active:bg-[#f6f7f8]"
				>
					<span className="font-semibold text-[#383A3F] text-[14px] leading-[20px]">
						{t("mypage.changePassword")}
					</span>
					<ChevronRight className="ml-auto size-[20px] text-[#C4C9D0]" />
				</button>
			</div>

			{user && (
				<div className="mb-[12px] overflow-hidden rounded-[12px] bg-white">
					<div className="flex h-[52px] items-center gap-[20px] px-[16px]">
						<span className="shrink-0 font-medium text-[#7F848D] text-[14px] leading-[20px]">
							{t("mypage.email")}
						</span>
						<span className="truncate font-medium text-[#383A3F] text-[14px] leading-[20px]">
							{user.email}
						</span>
					</div>
				</div>
			)}

			{/* 언어 설정 카드 */}
			<div className="mb-[12px] rounded-[12px] bg-white">
				<div className="flex h-[52px] items-center px-[16px]">
					<span className="flex-1 font-semibold text-[#383A3F] text-[14px] leading-[20px]">
						{t("mypage.languageSetting")}
					</span>
					<LanguageSelector />
				</div>
			</div>

			<button
				type="button"
				onClick={handleSignOut}
				className="flex h-[52px] w-full items-center justify-center gap-[8px] rounded-[12px] bg-white active:bg-[#F6F7F8]"
			>
				<LogOut className="size-[18px] text-[#7F848D]" />
				<span className="font-semibold text-[#7F848D] text-[14px] leading-[20px]">
					{t("mypage.signOut")}
				</span>
			</button>
		</div>
	);
}
