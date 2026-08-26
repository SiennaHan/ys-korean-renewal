import { changePassword } from "@/api/sign";
import { useAuth } from "@/components/sign/sign-provider";
import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/my-password")({
	component: MyPasswordPage,
});

function MyPasswordPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { isLoggedInUser } = useAuth();

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!isLoggedInUser) {
			navigate({ to: "/main/my" });
		}
	}, [isLoggedInUser, navigate]);

	const requirements = [
		{
			key: "different",
			label: t("mypage.passwordChange.requirements.different"),
			met: newPassword.length > 0 && newPassword !== currentPassword,
		},
		{
			key: "length",
			label: t("mypage.passwordChange.requirements.length"),
			met: newPassword.length >= 8 && newPassword.length <= 32,
		},
		{
			key: "letter",
			label: t("mypage.passwordChange.requirements.letter"),
			met: /[a-zA-Z]/.test(newPassword),
		},
		{
			key: "number",
			label: t("mypage.passwordChange.requirements.number"),
			met: /\d/.test(newPassword),
		},
		{
			key: "special",
			label: t("mypage.passwordChange.requirements.special"),
			met: /[`~!@#$%^&*'";;:₩\\?]/.test(newPassword),
		},
	];

	const allRequirementsMet = requirements.every((r) => r.met);
	const canSubmit =
		currentPassword.length > 0 &&
		allRequirementsMet &&
		newPassword === confirmPassword;

	const handleSubmit = async () => {
		setError("");

		if (newPassword !== confirmPassword) {
			setError(t("mypage.passwordChange.errors.mismatch"));
			return;
		}

		setIsLoading(true);
		const result = await changePassword(currentPassword, newPassword);
		setIsLoading(false);

		if (!result.success) {
			if (result.error === "wrong_current") {
				setError(t("mypage.passwordChange.errors.wrongCurrent"));
			} else {
				setError(t("mypage.passwordChange.errors.serverError"));
			}
			return;
		}

		navigate({ to: "/main/my" });
	};

	return (
		<div className="flex min-h-full flex-col bg-background-base">
			{/* 앱바 */}
			<div className="flex h-[58px] items-center px-[16px]">
				<button
					type="button"
					onClick={() => navigate({ to: "/main/my" })}
					className="flex size-[24px] items-center justify-center"
					aria-label="뒤로가기"
				>
					<ChevronLeft className="size-[24px] stroke-[2] text-text-strong" />
				</button>
				<span className="-translate-x-1/2 absolute left-1/2 font-semibold text-[17px] text-text-strong leading-[26px]">
					{t("mypage.passwordChange.title")}
				</span>
			</div>

			<div className="flex flex-1 flex-col gap-[24px] px-[16px] pb-[24px]">
				{/* 현재 비밀번호 */}
				<div className="flex flex-col gap-[8px]">
					<span className="font-semibold text-[16px] text-text-strong leading-[24px]">
						{t("mypage.passwordChange.currentPassword")}
					</span>
					<div className="relative">
						<input
							type={showCurrent ? "text" : "password"}
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							placeholder={t("mypage.passwordChange.currentPassword")}
							className="flex h-[52px] w-full rounded-[12px] bg-white px-[16px] pr-[48px] font-medium text-[16px] text-text-strong leading-[24px] placeholder:text-[#ACB3BD] focus:outline-none focus:ring-1 focus:ring-[#0180FF]"
						/>
						<button
							type="button"
							onClick={() => setShowCurrent((v) => !v)}
							className="-translate-y-1/2 absolute top-1/2 right-[16px] text-text-sub"
						>
							{showCurrent ? (
								<EyeOff className="size-[20px]" />
							) : (
								<Eye className="size-[20px]" />
							)}
						</button>
					</div>
				</div>

				{/* 새 비밀번호 + 요구사항 */}
				<div className="flex flex-col gap-[12px]">
					<div className="flex flex-col gap-[8px]">
						<span className="font-semibold text-[16px] text-text-strong leading-[24px]">
							{t("mypage.passwordChange.newPassword")}
						</span>
						<div className="relative">
							<input
								type={showNew ? "text" : "password"}
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder={t("mypage.passwordChange.newPassword")}
								className="flex h-[52px] w-full rounded-[12px] bg-white px-[16px] pr-[48px] font-medium text-[16px] text-text-strong leading-[24px] placeholder:text-[#ACB3BD] focus:outline-none focus:ring-1 focus:ring-[#0180FF]"
							/>
							<button
								type="button"
								onClick={() => setShowNew((v) => !v)}
								className="-translate-y-1/2 absolute top-1/2 right-[16px] text-text-sub"
							>
								{showNew ? (
									<EyeOff className="size-[20px]" />
								) : (
									<Eye className="size-[20px]" />
								)}
							</button>
						</div>
					</div>

					{/* 비밀번호 요구사항 */}
					<div className="flex flex-col gap-[4px]">
						{requirements.map((req) => (
							<div key={req.key} className="flex items-center gap-[2px]">
								<Check
									className={cn(
										"size-[12px]",
										req.met ? "text-text-primary" : "text-[#ACB3BD]",
									)}
								/>
								<span
									className={cn(
										"font-semibold text-[12px] leading-[18px]",
										req.met ? "text-text-primary" : "text-[#ACB3BD]",
									)}
								>
									{req.label}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* 새 비밀번호 확인 */}
				<div className="flex flex-col gap-[8px]">
					<span className="font-semibold text-[16px] text-text-strong leading-[24px]">
						{t("mypage.passwordChange.confirmPassword")}
					</span>
					<div className="relative">
						<input
							type={showConfirm ? "text" : "password"}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder={t("mypage.passwordChange.confirmPassword")}
							className="flex h-[52px] w-full rounded-[12px] bg-white px-[16px] pr-[48px] font-medium text-[16px] text-text-strong leading-[24px] placeholder:text-[#ACB3BD] focus:outline-none focus:ring-1 focus:ring-[#0180FF]"
						/>
						<button
							type="button"
							onClick={() => setShowConfirm((v) => !v)}
							className="-translate-y-1/2 absolute top-1/2 right-[16px] text-text-sub"
						>
							{showConfirm ? (
								<EyeOff className="size-[20px]" />
							) : (
								<Eye className="size-[20px]" />
							)}
						</button>
					</div>
				</div>

				{error && (
					<p className="text-center text-[#FF3B30] text-[14px]">{error}</p>
				)}
			</div>

			{/* 하단 버튼 */}
			<div className="px-[16px] pb-[16px]">
				<button
					type="button"
					onClick={handleSubmit}
					disabled={isLoading || !canSubmit}
					className="flex h-[56px] w-full items-center justify-center rounded-[10px] bg-fill-primary font-bold text-[16px] text-white leading-[24px] disabled:bg-line-normal disabled:text-[#ACB3BD]"
				>
					{isLoading
						? t("mypage.passwordChange.submitting")
						: t("mypage.passwordChange.submit")}
				</button>
			</div>
		</div>
	);
}
