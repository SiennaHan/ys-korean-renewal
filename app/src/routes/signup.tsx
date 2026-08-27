import { PASSWORD_RULES, passwordMisses } from "@/api/sign";
import { useAuth } from "@/components/sign/sign-provider";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import i18n from "@/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, CircleAlert, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/signup")({
	component: SignUpPage,
});

/**
 * 약관·개인정보 처리방침 주소.
 *
 * **아직 두 문서가 없다** — 라우트도 코드도 기획 문서도 없고 목업에만 나온다
 * (2026-08-27 확인). 주소가 비어 있으면 화면은 링크 없이 문구만 보여 준다.
 * 없는 문서로 링크를 걸거나 "여기 있다" 는 시늉을 하지 않는다 —
 * `phase1/draft_auth.html` 규칙 01("못 하는 것을 할 수 있는 것처럼 말하지
 * 않습니다")이 그것이다.
 *
 * **문서가 생기면 여기 두 줄만 채우면 된다.** 배포 전에 반드시 채워야 한다 —
 * BLOCKERS.md 를 봐라.
 */
const TERMS_URL = "";
const PRIVACY_URL = "";

function SignUpPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { isLoggedInUser, signUp } = useAuth();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [agreed, setAgreed] = useState(false);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	/* 이미 계정이 있으면 여기 있을 일이 없다 */
	useEffect(() => {
		if (isLoggedInUser) navigate({ to: "/main" });
	}, [isLoggedInUser, navigate]);

	const misses = passwordMisses(password);
	const canSubmit =
		agreed &&
		email.trim() !== "" &&
		name.trim() !== "" &&
		misses.length === 0 &&
		!isLoading;

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);
		const res = await signUp(email, password, name);
		setIsLoading(false);
		if (!res.success) {
			/*
			 * 서버가 코드를 낸다 — 화면이 5개 언어라 문장을 서버에서 만들면
			 * 영어 화면에 한국어 오류가 뜬다(실제로 그랬다).
			 * **모르는 값은 그대로 보여 준다** — 다른 엔드포인트는 아직 한국어
			 * 문장을 내므로, 옮기지 못한다고 "가입 실패" 로 뭉개면 이유가 사라진다.
			 */
			const code = res.error ?? "signupFailed";
			const key = `signup.err_${code}`;
			setError(i18n.exists(key) ? t(key) : code);
			return;
		}
		/* provider 가 user·토큰·게스트 id 를 정리했다. 위 useEffect 도 이제 돈다 */
		navigate({ to: "/main" });
	};

	return (
		<div className="auth-page">
			<div className="auth-topbar">
				<button
					type="button"
					onClick={() => navigate({ to: "/login" })}
					aria-label={t("signup.back")}
					className="auth-back"
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
				<LanguageSelector />
			</div>

			<main className="auth-main auth-main--flow">
				<div className="auth-panel">
					<div className="auth-heading">
						<h1 className="auth-title">{t("signup.title")}</h1>
					</div>

					{/*
					 * 잃을 것이 없다고 먼저 말한다 — 게스트 진행을 계정으로 옮기기로
					 * 정했고(access_and_pricing_v1 §07 의 2번) signUpStudent 가 guestId 를
					 * 같이 보낸다. 실제로 옮겨지므로 이 문장은 거짓이 아니다.
					 */}
					<div className="auth-info">
						<p className="auth-info-title">{t("signup.carryTitle")}</p>
						<p className="auth-info-body">{t("signup.carryBody")}</p>
					</div>

					<form onSubmit={handleSignUp} className="auth-form">
						{error && (
							<p className="auth-alert" role="alert">
								<CircleAlert aria-hidden="true" />
								<span>{error}</span>
							</p>
						)}

						<div className="auth-field">
							<label htmlFor="signup-email" className="auth-label">
								{t("signup.email")}
							</label>
							<input
								id="signup-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={t("login.emailPlaceholder")}
								required
								className="auth-input"
							/>
							<p className="auth-hint">{t("signup.emailHint")}</p>
						</div>

						<div className="auth-field">
							<label htmlFor="signup-password" className="auth-label">
								{t("signup.password")}
							</label>
							<div className="auth-input-wrap">
								<input
									id="signup-password"
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
							{/*
							 * 규칙 셋을 타이핑하는 동안 보여 준다. 눌러 보고서야 "안 된다" 고
							 * 하면 무엇이 모자란지 모른다. 판정은 서버도 한다 — 앱을 안 거치고
							 * 부를 수 있기 때문이다(user_business.checkPassword)
							 */}
							<ul className="auth-requirements">
								{PASSWORD_RULES.map((rule) => {
									const met = !misses.includes(rule.key);
									return (
										<li
											key={rule.key}
											className={`auth-requirement${met ? " is-met" : ""}`}
										>
											<span className="auth-requirement-icon">
												<Check className="h-3 w-3" />
											</span>
											<span>{t(`signup.rule_${rule.key}`)}</span>
										</li>
									);
								})}
							</ul>
						</div>

						<div className="auth-field">
							<label htmlFor="signup-name" className="auth-label">
								{t("signup.name")}
							</label>
							<input
								id="signup-name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={t("signup.namePlaceholder")}
								required
								className="auth-input"
							/>
							<p className="auth-hint">{t("signup.nameHint")}</p>
						</div>

						{/* 필수 동의. 문서가 아직 없어서 주소가 비면 링크를 걸지 않는다 */}
						<div className="auth-field">
							<label className="auth-check-label">
								<input
									type="checkbox"
									checked={agreed}
									onChange={(e) => setAgreed(e.target.checked)}
								/>
								<span>
									{TERMS_URL && PRIVACY_URL ? (
										<>
											<a
												href={TERMS_URL}
												target="_blank"
												rel="noreferrer"
												className="auth-link"
											>
												{t("signup.terms")}
											</a>
											{t("signup.and")}
											<a
												href={PRIVACY_URL}
												target="_blank"
												rel="noreferrer"
												className="auth-link"
											>
												{t("signup.privacy")}
											</a>
											{t("signup.agreeSuffix")}
										</>
									) : (
										`${t("signup.terms")}${t("signup.and")}${t("signup.privacy")}${t("signup.agreeSuffix")}`
									)}
									<span className="auth-required">{t("signup.required")}</span>
								</span>
							</label>
							{!(TERMS_URL && PRIVACY_URL) && (
								<p className="auth-legal-note">{t("signup.termsMissing")}</p>
							)}
						</div>

						<Button
							type="submit"
							variant="primary"
							size="lg"
							full
							disabled={!canSubmit}
							className="auth-primary"
						>
							{isLoading ? t("signup.submitting") : t("signup.submit")}
						</Button>
					</form>

					<p className="auth-switch">
						{t("signup.haveAccount")}{" "}
						<button
							type="button"
							onClick={() => navigate({ to: "/login" })}
							className="auth-link"
						>
							{t("signup.goLogin")}
						</button>
					</p>
				</div>
			</main>
		</div>
	);
}
