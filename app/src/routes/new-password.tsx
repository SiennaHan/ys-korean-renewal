import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/new-password")({
	component: NewPasswordPage,
});

function NewPasswordPage() {
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
		<div className="flex min-h-full flex-col bg-white">
			{/* Header */}
			<div className="flex justify-end px-4 pt-3">
				<LanguageSelector />
			</div>

			{/* Content */}
			<div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
				<div className="w-full max-w-sm space-y-6">
					{/* Title */}
					<div>
						<h1 className="font-bold text-2xl text-gray-900">
							{t("newPassword.title")}
						</h1>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-5">
						{/* New Password */}
						<div className="space-y-1.5">
							<label
								htmlFor="new-password"
								className="block font-medium text-gray-700 text-sm"
							>
								{t("newPassword.newPassword")}
							</label>
							<div className="relative">
								<input
									id="new-password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder={t(
										"newPassword.newPasswordPlaceholder",
									)}
									required
									className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pr-10 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
								/>
								<button
									type="button"
									onClick={() =>
										setShowPassword(!showPassword)
									}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
								>
									{showPassword ? (
										<EyeOff className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
						</div>

						{/* Confirm Password */}
						<div className="space-y-1.5">
							<label
								htmlFor="confirm-password"
								className="block font-medium text-gray-700 text-sm"
							>
								{t("newPassword.confirmPassword")}
							</label>
							<div className="relative">
								<input
									id="confirm-password"
									type={
										showConfirmPassword
											? "text"
											: "password"
									}
									value={confirmPassword}
									onChange={(e) =>
										setConfirmPassword(e.target.value)
									}
									placeholder={t(
										"newPassword.confirmPasswordPlaceholder",
									)}
									required
									className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pr-10 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
								/>
								<button
									type="button"
									onClick={() =>
										setShowConfirmPassword(
											!showConfirmPassword,
										)
									}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
								>
									{showConfirmPassword ? (
										<EyeOff className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
						</div>

						{/* Password requirements */}
						<ul className="space-y-1.5">
							{requirements.map((req) => (
								<li
									key={req.key}
									className={cn(
										"flex items-center gap-2 text-sm",
										req.met
											? "text-green-600"
											: "text-gray-400",
									)}
								>
									<Check
										className={cn(
											"h-4 w-4",
											req.met
												? "text-green-600"
												: "text-gray-300",
										)}
									/>
									{req.label}
								</li>
							))}
						</ul>

						{/* Error */}
						{error && (
							<p className="text-center text-red-500 text-sm">
								{error}
							</p>
						)}

						{/* Submit button */}
						<Button
							type="submit"
							variant="primary"
							size="lg"
							full
							disabled={isLoading || !allRequirementsMet}
							className="rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
						>
							{isLoading
								? t("newPassword.submitting")
								: t("newPassword.submit")}
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
