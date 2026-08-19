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
	const { isSignedIn, login } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// 로그인 상태가 커밋된 후 네비게이션 (setState 반영 후 실행)
	useEffect(() => {
		if (isSignedIn) {
			navigate({ to: "/main" });
		}
	}, [isSignedIn, navigate]);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		const result = await login(email, password);

		if (!result.success) {
			setError(result.error || t("login.loginFailed"));
		}

		setIsLoading(false);
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

					</div>
			</div>
		</div>
	);
}
