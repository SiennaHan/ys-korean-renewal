import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, CircleAlert, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/new-password")({
	component: NewPasswordPage,
});

/**
 * 메일 발송이 붙었나. **붙기 전에는 아래 폼을 그리지 않는다.**
 *
 * 이 화면은 재설정 링크를 눌러야 닿는다 — 그런데 그 메일을 보낼 수단이 없다
 * (BLOCKERS §7). 그래서 지금은 **앱 안에 여기로 오는 길이 하나도 없고**,
 * 주소를 직접 친 사람이나 낡은 링크를 가진 사람만 닿는다.
 *
 * 그런 사람에게 폼을 보여 주면 비밀번호를 바꾼 줄 알고 나간다 —
 * 실제로는 아무 일도 일어나지 않았다(`NewPasswordForm` 의 TODO).
 * `phase1/draft_auth.html` 규칙 01: 못 하는 것을 할 수 있는 것처럼 말하지 않는다.
 *
 * **메일이 붙으면 여기를 true 로 바꾸고** `NewPasswordForm` 의 TODO 를 채운다.
 * 폼은 지우지 않았다 — 그때 그대로 쓴다.
 */
const MAIL_RESET_READY = false;

function NewPasswordPage() {
	return MAIL_RESET_READY ? <NewPasswordForm /> : <NewPasswordBlocked />;
}

/** 메일이 없어 아직 못 바꾼다. 대신 갈 수 있는 길을 준다 */
function NewPasswordBlocked() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	return (
		<div className="auth-page">
			<div className="auth-topbar auth-topbar--end">
				<LanguageSelector />
			</div>
			<main className="auth-main auth-main--center">
				<div className="auth-panel">
					<div className="auth-heading">
						<h1 className="auth-title">{t("newPassword.title")}</h1>
						<p className="auth-description">
							{t("newPassword.blockedDescription")}
						</p>
					</div>
					<p className="auth-description">{t("newPassword.blockedHow")}</p>
					<div className="auth-form">
						<Button
							type="button"
							variant="primary"
							size="lg"
							full
							onClick={() =>
								navigate({ to: "/inquiry", search: { from: "/new-password" } })
							}
							className="auth-primary"
						>
							{t("newPassword.blockedContact")}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="lg"
							full
							onClick={() => navigate({ to: "/login" })}
							className="auth-secondary"
						>
							{t("newPassword.blockedBack")}
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}

function NewPasswordForm() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const requirements = [
		{
			key: "length",
			label: t("newPassword.requirements.length"),
			met: password.length >= 8,
		},
		{
			key: "uppercase",
			label: t("newPassword.requirements.uppercase"),
			met: /[A-Z]/.test(password),
		},
		{
			key: "number",
			label: t("newPassword.requirements.number"),
			met: /\d/.test(password),
		},
	];

	const allRequirementsMet = requirements.every((r) => r.met);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!allRequirementsMet) {
			setError(t("newPassword.errors.tooShort"));
			return;
		}

		if (password !== confirmPassword) {
			setError(t("newPassword.errors.mismatch"));
			return;
		}

		setIsLoading(true);

		// TODO: API call to set new password
		// const token = new URLSearchParams(window.location.search).get("token");
		// await api.post("/user/sign/new-password", { token, password });

		setIsLoading(false);
		navigate({ to: "/login" });
	};

	return (
		<div className="auth-page">
			<div className="auth-topbar auth-topbar--end">
				<LanguageSelector />
			</div>

			<main className="auth-main auth-main--center">
				<div className="auth-panel">
					<div className="auth-heading">
						<h1 className="auth-title">{t("newPassword.title")}</h1>
					</div>

					<form onSubmit={handleSubmit} className="auth-form">
						{error && (
							<p className="auth-alert" role="alert">
								<CircleAlert aria-hidden="true" />
								<span>{error}</span>
							</p>
						)}

						<div className="auth-field">
							<label htmlFor="new-password" className="auth-label">
								{t("newPassword.newPassword")}
							</label>
							<div className="auth-input-wrap">
								<input
									id="new-password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder={t("newPassword.newPasswordPlaceholder")}
									required
									className="auth-input auth-input--with-action"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									aria-label={t(
										showPassword
											? "signup.hidePassword"
											: "signup.showPassword",
									)}
									className="auth-visibility"
								>
									{showPassword ? (
										<EyeOff className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
						</div>

						<div className="auth-field">
							<label htmlFor="confirm-password" className="auth-label">
								{t("newPassword.confirmPassword")}
							</label>
							<div className="auth-input-wrap">
								<input
									id="confirm-password"
									type={showConfirmPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder={t("newPassword.confirmPasswordPlaceholder")}
									required
									className="auth-input auth-input--with-action"
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									aria-label={t(
										showConfirmPassword
											? "signup.hidePassword"
											: "signup.showPassword",
									)}
									className="auth-visibility"
								>
									{showConfirmPassword ? (
										<EyeOff className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
						</div>

						<ul className="auth-requirements">
							{requirements.map((req) => (
								<li
									key={req.key}
									className={`auth-requirement${req.met ? " is-met" : ""}`}
								>
									<span className="auth-requirement-icon">
										<Check />
									</span>
									<span>{req.label}</span>
								</li>
							))}
						</ul>

						<Button
							type="submit"
							variant="primary"
							size="lg"
							full
							disabled={isLoading || !allRequirementsMet}
							className="auth-primary"
						>
							{isLoading
								? t("newPassword.submitting")
								: t("newPassword.submit")}
						</Button>
					</form>
				</div>
			</main>
		</div>
	);
}
