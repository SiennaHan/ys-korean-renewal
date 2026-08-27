import { withdrawAccount } from "@/api/sign";
import { useAuth } from "@/components/sign/sign-provider";
import { SettingsPage } from "@/components/ui/settings-page";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/my-withdraw")({
	component: MyWithdrawPage,
});

/**
 * 회원 탈퇴 — 개인정보 처리방침 §제6조의 "탈퇴할 수 있습니다".
 *
 * 그 문장을 쓸 수 있으려면 길이 있어야 하는데 **2026-08-27 까지 코드에 0곳**
 * 이었다. 문의로만 받겠다면 그 처리 절차(누가·며칠 안에)를 정해 두어야 하는데
 * 그것도 정해진 것이 없었다.
 *
 * **두 걸음이다.** 무엇이 지워지는지 먼저 보여 주고, 그다음에 비밀번호를 받는다.
 * 한 화면에 다 넣으면 읽지 않고 누른다 — 되돌릴 수 없는 일이다.
 */
function MyWithdrawPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { isLoggedInUser, signOut } = useAuth();

	const [step, setStep] = useState<"what" | "confirm">("what");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!isLoggedInUser) navigate({ to: "/main/my" });
	}, [isLoggedInUser, navigate]);

	const goBack = () =>
		step === "confirm" ? setStep("what") : navigate({ to: "/main/my" });

	const submit = async () => {
		if (step === "what") {
			setStep("confirm");
			return;
		}
		setIsLoading(true);
		setError("");
		const res = await withdrawAccount(password);
		setIsLoading(false);
		if (!res.success) {
			setError(
				t(
					res.error === "wrong_password"
						? "mypage.withdraw.wrongPassword"
						: "mypage.withdraw.serverError",
				),
			);
			return;
		}
		/*
		 * 계정이 없어졌으므로 토큰을 들고 있어 봐야 모든 요청이 401 이다.
		 * 세션을 지우고 로그인으로 보낸다.
		 */
		signOut();
		navigate({ to: "/login" });
	};

	/** 무엇이 지워지는지. 서버의 `withdrawal_scope.py` 가 지우는 것을 말로 옮긴 것이다 */
	const losses = [
		t("mypage.withdraw.lossRecords"),
		t("mypage.withdraw.lossChat"),
		t("mypage.withdraw.lossVoice"),
		t("mypage.withdraw.lossInquiry"),
	];

	return (
		<SettingsPage
			title={t("mypage.withdraw.title")}
			onBack={goBack}
			submit={{
				label: isLoading
					? t("mypage.withdraw.submitting")
					: t(
							step === "what"
								? "mypage.withdraw.next"
								: "mypage.withdraw.submit",
						),
				disabled: isLoading || (step === "confirm" && password.length === 0),
				onClick: () => void submit(),
			}}
		>
			{step === "what" ? (
				<>
					<div className="rounded-[12px] bg-white p-[16px]">
						<p className="font-semibold text-[15px] text-text-strong leading-[22px]">
							{t("mypage.withdraw.lead")}
						</p>
						<ul className="mt-[12px] flex flex-col gap-[8px]">
							{losses.map((line) => (
								<li
									key={line}
									className="flex gap-[8px] text-[14px] text-text-sub leading-[20px]"
								>
									<span aria-hidden="true">·</span>
									<span>{line}</span>
								</li>
							))}
						</ul>
					</div>
					<p className="text-[13px] text-text-sub leading-[19px]">
						{t("mypage.withdraw.irreversible")}
					</p>
				</>
			) : (
				<>
					<p className="text-[14px] text-text-sub leading-[20px]">
						{t("mypage.withdraw.confirmLead")}
					</p>
					<div className="rounded-[12px] bg-white px-[16px] py-[12px]">
						<label
							htmlFor="withdraw-password"
							className="font-semibold text-[13px] text-text-sub leading-[19px]"
						>
							{t("mypage.withdraw.password")}
						</label>
						<div className="mt-[6px] flex items-center gap-[8px]">
							<input
								id="withdraw-password"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder={t("mypage.withdraw.passwordPlaceholder")}
								className="min-w-0 flex-1 bg-transparent text-[15px] text-text-strong outline-none"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								aria-label={t(
									showPassword
										? "mypage.withdraw.hidePassword"
										: "mypage.withdraw.showPassword",
								)}
								className="flex size-[24px] items-center justify-center text-text-sub"
							>
								{showPassword ? (
									<EyeOff className="size-[20px]" />
								) : (
									<Eye className="size-[20px]" />
								)}
							</button>
						</div>
					</div>
					{error && (
						<p
							className="text-[13px] text-fill-wrong leading-[19px]"
							role="alert"
						>
							{error}
						</p>
					)}
				</>
			)}
		</SettingsPage>
	);
}
