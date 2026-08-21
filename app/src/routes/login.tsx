import { useAuth } from "@/components/sign/sign-provider";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { isLoggedInUser, login, guestSign } = useAuth();
	const [email, setEmail] = useState("");
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

		if (!result.success) {
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
		<div className="flex min-h-full flex-col bg-white">
			{/* Header with language selector */}
			<div className="flex justify-end px-4 pt-3">
				<LanguageSelector />
			</div>

			{/* Content */}
			<div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
				<div className="w-full max-w-sm space-y-8">
					{/* Title */}
					<div>
						<h1 className="font-bold text-2xl text-gray-900">
							{t("login.title")}
						</h1>
					</div>

					{/* Form */}
					<form onSubmit={handleLogin} className="space-y-5">
						{/* Email */}
						<div className="space-y-1.5">
							<label
								htmlFor="email"
								className="block font-medium text-gray-700 text-sm"
							>
								{t("login.email")}
							</label>
							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={t("login.emailPlaceholder")}
								required
								className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							/>
						</div>

						{/* Password */}
						<div className="space-y-1.5">
							<label
								htmlFor="password"
								className="block font-medium text-gray-700 text-sm"
							>
								{t("login.password")}
							</label>
							<div className="relative">
								<input
									id="password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder={t("login.passwordPlaceholder")}
									required
									className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400 hover:text-gray-600"
								>
									{showPassword ? (
										<EyeOff className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
						</div>

						{/* Reset password link */}
						<div className="text-right">
							<button
								type="button"
								onClick={() => navigate({ to: "/reset-password" })}
								className="text-blue-600 text-sm hover:underline"
							>
								{t("login.resetPassword")}
							</button>
						</div>

						{/* Error */}
						{error && (
							<p className="text-center text-red-500 text-sm">{error}</p>
						)}

						{/* Login button */}
						<Button
							type="submit"
							variant="primary"
							size="lg"
							full
							disabled={isLoading}
							className="rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
						>
							{isLoading ? t("login.loggingIn") : t("login.loginButton")}
						</Button>
					</form>

					{/* 또는 — 둘러보기 */}
					<div className="space-y-5">
						<div className="flex items-center gap-3">
							<span className="h-px flex-1 bg-gray-200" />
							<span className="text-gray-400 text-xs">{t("login.or")}</span>
							<span className="h-px flex-1 bg-gray-200" />
						</div>

						<Button
							type="button"
							variant="outline"
							size="lg"
							full
							onClick={handleBrowse}
							disabled={isLoading || isEntering}
							className="rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
						>
							{isEntering ? t("login.guestEntering") : t("login.guestButton")}
						</Button>

						{browseError && (
							<p className="text-center text-red-500 text-sm">{browseError}</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
