import { changePassword } from "@/api/sign";
import { useAuth } from "@/components/sign/sign-provider";
import { SettingsPage } from "@/components/ui/settings-page";
import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff } from "lucide-react";
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
		<SettingsPage
			title={t("mypage.passwordChange.title")}
			onBack={() => navigate({ to: "/main/my" })}
			bodyClassName="gap-[24px]"
			submit={{
				label: isLoading
					? t("mypage.passwordChange.submitting")
					: t("mypage.passwordChange.submit"),
				disabled: isLoading || !canSubmit,
				onClick: handleSubmit,
			}}
		>
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
						className="flex h-[52px] w-full rounded-[12px] bg-white px-[16px] pr-[48px] font-medium text-[16px] text-text-strong leading-[24px] placeholder:text-text-sub focus:outline-none focus:ring-1 focus:ring-line-focus"
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
							className="flex h-[52px] w-full rounded-[12px] bg-white px-[16px] pr-[48px] font-medium text-[16px] text-text-strong leading-[24px] placeholder:text-text-sub focus:outline-none focus:ring-1 focus:ring-line-focus"
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
									req.met ? "text-text-primary" : "text-text-disable",
								)}
							/>
							<span
								className={cn(
									"font-semibold text-[12px] leading-[18px]",
									// 미충족이어도 "읽어야 하는 규칙" 이다 — disable(#BDBDBD)은 흰 배경에서 대비 2.2:1
									req.met ? "text-text-primary" : "text-text-sub",
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
						className="flex h-[52px] w-full rounded-[12px] bg-white px-[16px] pr-[48px] font-medium text-[16px] text-text-strong leading-[24px] placeholder:text-text-sub focus:outline-none focus:ring-1 focus:ring-line-focus"
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
				<p className="text-center text-[14px] text-fill-wrong">{error}</p>
			)}
		</SettingsPage>
	);
}
