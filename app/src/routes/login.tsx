import { getSavedEmail, removeSavedEmail, setSavedEmail } from "@/api/api";
import { useAuth } from "@/components/sign/sign-provider";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { isLoggedInUser, login, guestSign } = useAuth();
	/*
	 * 아이디 저장 — 웹앱이라 학습자가 앱을 띄워 두지 않는다. 토큰은 30일이지만
	 * (dev_spec_v1 "JWT 30일, 갱신 없음") 그보다 오래 쉬면 다시 타이핑해야 한다.
	 * 저장된 것이 있으면 그 자리에서 켜진 채로 시작한다 — 저장한 사람은 계속
	 * 저장하고 싶다는 뜻이다. **비밀번호는 저장하지 않는다.**
	 */
	const savedEmail = getSavedEmail();
	const [email, setEmail] = useState(savedEmail ?? "");
	const [rememberEmail, setRememberEmail] = useState(savedEmail !== null);
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [browseError, setBrowseError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isEntering, setIsEntering] = useState(false);

	/*
	 * 로그인이 끝나면 홈으로. 게스트는 여기서 돌려보내지 않는다 —
	 * isSignedIn 은 게스트도 참이라, 그걸로 막으면 게스트가 로그인 화면에
	 * 닿을 수 없고 로그인 시 게스트 기록을 계정으로 옮기는 길도 함께 막힌다.
	 */
	useEffect(() => {
		if (isLoggedInUser) {
			navigate({ to: "/main" });
		}
	}, [isLoggedInUser, navigate]);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setBrowseError("");
		setIsLoading(true);

		const result = await login(email, password);

		if (result.success) {
			// 성공했을 때만 저장한다 — 틀린 주소를 기억해 두면 매번 지워야 한다
			if (rememberEmail) {
				setSavedEmail(email);
			} else {
				removeSavedEmail();
			}
		} else {
			setError(result.error || t("login.loginFailed"));
		}

		setIsLoading(false);
	};

	/*
	 * 로그인하지 않고 둘러보기. 이 화면의 유일한 출구다 —
	 * MY 탭이 게스트를 여기로 보내는데, 여기서 나갈 길이 없으면 갇힌다.
	 *
	 * 토큰이 이미 있어도 그냥 넘기지 않고 매번 guestSign 을 부른다. 서버는 유효한
	 * Bearer 를 받으면 status "exist" 로 같은 토큰을 돌려주므로 여러 번 불러도 안전하고,
	 * isSignedIn(리액트 상태)이 실제 토큰과 어긋난 경우 — 만료됐거나 다른 탭에서
	 * 지워진 경우 — 토큰 없이 홈으로 보내 모든 요청이 조용히 실패하는 일을 막는다.
	 */
	const handleBrowse = async () => {
		setError("");
		setBrowseError("");
		setIsEntering(true);
		const ok = await guestSign();
		setIsEntering(false);

		if (ok) {
			navigate({ to: "/main" });
		} else {
			setBrowseError(t("login.guestFailed"));
		}
	};

	return (
		<div className="auth-page">
			<div className="auth-topbar auth-topbar--end">
				<LanguageSelector />
			</div>

			<main className="auth-main auth-main--center">
				<div className="auth-panel">
					<div className="auth-heading">
						<h1 className="auth-title">{t("login.title")}</h1>
					</div>

					<form onSubmit={handleLogin} className="auth-form">
						{error && (
							<p className="auth-alert" role="alert">
								<CircleAlert aria-hidden="true" />
								<span>{error}</span>
							</p>
						)}

						<div className="auth-field">
							<label htmlFor="email" className="auth-label">
								{t("login.email")}
							</label>
							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={t("login.emailPlaceholder")}
								required
								className="auth-input"
							/>
						</div>

						<div className="auth-field">
							<label htmlFor="password" className="auth-label">
								{t("login.password")}
							</label>
							<div className="auth-input-wrap">
								<input
									id="password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder={t("login.passwordPlaceholder")}
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

						<div className="auth-inline-row">
							<label className="auth-check-label">
								<input
									type="checkbox"
									checked={rememberEmail}
									onChange={(e) => setRememberEmail(e.target.checked)}
								/>
								<span>{t("login.rememberEmail")}</span>
							</label>
							<button
								type="button"
								onClick={() => navigate({ to: "/reset-password" })}
								className="auth-link"
							>
								{t("login.resetPassword")}
							</button>
						</div>

						<Button
							type="submit"
							variant="primary"
							size="lg"
							full
							disabled={isLoading}
							className="auth-primary"
						>
							{isLoading ? t("login.loggingIn") : t("login.loginButton")}
						</Button>
					</form>

					<div className="auth-support">
						<div className="auth-separator">{t("login.or")}</div>

						<Button
							type="button"
							variant="outline"
							size="lg"
							full
							onClick={handleBrowse}
							disabled={isLoading || isEntering}
							className="auth-secondary"
						>
							{isEntering ? t("login.guestEntering") : t("login.guestButton")}
						</Button>

						{browseError && (
							<p className="auth-alert" role="alert">
								<CircleAlert aria-hidden="true" />
								<span>{browseError}</span>
							</p>
						)}

						{/*
						 * 가입으로 가는 길 — 2026-08-27 에 생겼다(§09 의 4단계).
						 * 그 전에는 학생이 스스로 계정을 만들 길이 아예 없었다
						 * (학교가 엑셀로 일괄 등록했다). 페이월의 「로그인 / 회원가입」도
						 * 이 화면으로 오므로 여기가 유일한 입구다
						 */}
						<p className="auth-switch">
							{t("login.noAccount")}{" "}
							<button
								type="button"
								onClick={() => navigate({ to: "/signup" })}
								className="auth-link"
							>
								{t("login.goSignUp")}
							</button>
						</p>
					</div>
				</div>
			</main>
		</div>
	);
}
