import InquiryModal from "@/components/main/inquiry-modal";
import { useAuth } from "@/components/sign/sign-provider";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogOut, Pencil, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function Content5() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	// 라우트가 게스트를 막으므로 여기 오는 사람은 늘 로그인 상태다
	const { user, signOut } = useAuth();
	const [inquiryOpen, setInquiryOpen] = useState(false);

	const handleSignOut = () => {
		signOut();
		navigate({ to: "/login" });
	};

	return (
		<div className="flex min-h-full flex-col bg-background-base px-[16px] pb-[24px]">
			{/* 헤더 */}
			<div className="pt-[20px] pb-[20px] font-bold text-[20px] text-text-strong leading-[32px]">
				{t("mypage.title")}
			</div>

			{/* 프로필 영역 */}
			<div className="mb-[16px] flex items-center gap-[12px]">
				<div className="relative shrink-0">
					<div className="flex size-[64px] items-center justify-center rounded-full bg-white">
						<User className="size-[32px] text-text-sub" />
					</div>
					{user && (
						<button
							type="button"
							aria-label={t("mypage.changePhoto")}
							className="absolute right-0 bottom-0 flex size-[24px] items-center justify-center rounded-full bg-icon-strong"
						>
							<Pencil className="size-[10px] text-white" />
						</button>
					)}
				</div>
				<div className="line-clamp-2 font-semibold text-[16px] text-text-strong leading-[24px]">
					{user?.name}
				</div>
			</div>

			{/* 계정 메뉴 카드 */}
			<div className="mb-[12px] overflow-hidden rounded-[12px] bg-white">
				<button
					type="button"
					onClick={() => navigate({ to: "/my-profile" })}
					className="flex h-[52px] w-full items-center px-[16px] active:bg-background-base"
				>
					<span className="font-semibold text-[14px] text-text-strong leading-[20px]">
						{t("mypage.editProfile")}
					</span>
					<ChevronRight className="ml-auto size-[20px] text-icon-faint" />
				</button>
				<div className="mx-[16px] h-[1px] bg-line-normal" />
				<button
					type="button"
					onClick={() => navigate({ to: "/my-password" })}
					className="flex h-[52px] w-full items-center px-[16px] active:bg-background-base"
				>
					<span className="font-semibold text-[14px] text-text-strong leading-[20px]">
						{t("mypage.changePassword")}
					</span>
					<ChevronRight className="ml-auto size-[20px] text-icon-faint" />
				</button>
			</div>

			{user && (
				<div className="mb-[12px] overflow-hidden rounded-[12px] bg-white">
					<div className="flex h-[52px] items-center gap-[20px] px-[16px]">
						<span className="shrink-0 font-medium text-[14px] text-text-sub leading-[20px]">
							{t("mypage.email")}
						</span>
						<span className="truncate font-medium text-[14px] text-text-strong leading-[20px]">
							{user.email}
						</span>
					</div>
				</div>
			)}

			{/* 언어 설정 카드 */}
			<div className="mb-[12px] rounded-[12px] bg-white">
				<div className="flex h-[52px] items-center px-[16px]">
					<span className="flex-1 font-semibold text-[14px] text-text-strong leading-[20px]">
						{t("mypage.languageSetting")}
					</span>
					<LanguageSelector />
				</div>
			</div>

			<button
				type="button"
				onClick={handleSignOut}
				className="flex h-[52px] w-full items-center justify-center gap-[8px] rounded-[12px] bg-white active:bg-background-base"
			>
				<LogOut className="size-[18px] text-text-sub" />
				<span className="font-semibold text-[14px] text-text-sub leading-[20px]">
					{t("mypage.signOut")}
				</span>
			</button>

			{/*
			 * 회원 탈퇴 — 처리방침 제6조가 "탈퇴할 수 있습니다" 를 적으려면 길이
			 * 있어야 한다. 로그아웃과 붙여 두되 **카드 밖에 작게** 둔다.
			 * 되돌릴 수 없는 일이라 실수로 눌리는 자리에 두지 않는다.
			 */}
			<button
				type="button"
				onClick={() => navigate({ to: "/my-withdraw" })}
				className="mt-[16px] flex h-[40px] w-full items-center justify-center"
			>
				<span className="text-[13px] text-text-sub leading-[19px] underline">
					{t("mypage.withdrawEntry")}
				</span>
			</button>

			{/*
			 * 문의하기 — 앱 안에서 도움을 청할 수 있는 유일한 자리다.
			 * 전화를 두지 않기로 했다(이용자 상당수가 국외다 · 2026-08-27 확정).
			 * 개인정보 열람·삭제 요청도 여기로 온다(docs/legal_draft_v1.html §03 제6조).
			 *
			 * **2026-09-02 에 여기로 옮겼다.** 전에는 `/my-profile`(「프로필 수정」을
			 * 한 번 더 눌러야 나오는 하위 화면)에 있었다 — 같은 주석을 달고서도
			 * 두 번 눌러야 닿아서 사실상 없는 자리였다.
			 *
			 * **페이지 이동이 아니라 모달이다.** 설정 목록을 떠나지 않는다.
			 * `/inquiry` 라우트는 그대로 산다 — 약관 미준비 화면과 재설정 막힘 화면이
			 * 아직 그 주소로 보낸다.
			 */}
			<button
				type="button"
				onClick={() => setInquiryOpen(true)}
				className="mt-[16px] flex h-[52px] w-full items-center rounded-[12px] bg-white px-[16px] active:bg-background-base"
			>
				<span className="font-semibold text-[14px] text-text-strong leading-[20px]">
					{t("inquiry.title")}
				</span>
				<ChevronRight className="ml-auto size-[20px] text-icon-faint" />
			</button>

			<InquiryModal open={inquiryOpen} onClose={() => setInquiryOpen(false)} />
		</div>
	);
}
