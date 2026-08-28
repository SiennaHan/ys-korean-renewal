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
 * **두 걸음이다.** 무엇이 어떻게 되는지 먼저 보여 주고, 그다음에 비밀번호를 받는다.
 * 한 화면에 다 넣으면 읽지 않고 누른다 — 되돌릴 수 없는 일이다.
 *
 * **2026-08-29 에 하는 일이 바뀌었다.** 전에는 계정과 학습 기록을 전부 지웠고
 * 이 화면도 "아래가 모두 지워집니다" 라고 5개 언어로 말했다. 지금은 이름·이메일만
 * 되돌릴 수 없게 가리고 **학습 기록은 남긴다**(기획 확정 — 서버는
 * `business/user_withdraw.maskAccount`). 그래서 이 화면의 문구를 같이 바꿨다 —
 * **동의를 받는 자리라 여기가 낡으면 그것은 거짓말이 된다.**
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
		 * 계정을 못 쓰게 됐으므로 토큰을 들고 있어 봐야 소용이 없다 —
		 * `accepter/auth.JWTBearer` 가 탈퇴한 계정의 토큰을 403 으로 끊는다
		 * (JWT 가 30일이라 그 구멍을 서버에서 막았다). 세션을 지우고 로그인으로 보낸다.
		 */
		signOut();
		navigate({ to: "/login" });
	};

	/**
	 * 탈퇴하면 무엇이 어떻게 되는지. 서버의 `shared/withdrawal_scope.py` 를 말로
	 * 옮긴 것이다 — **지워지는 것 둘과 남는 것 둘**이고 순서가 그 뜻이다.
	 * 남는다는 말을 빼면 동의를 잘못 받는 것이 된다.
	 */
	const outcomes = [
		t("mypage.withdraw.lossAccount"),
		t("mypage.withdraw.lossName"),
		t("mypage.withdraw.keptRecords"),
		t("mypage.withdraw.keptSchool"),
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
							{outcomes.map((line) => (
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
