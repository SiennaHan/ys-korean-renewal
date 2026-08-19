import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		// TODO: API call to send reset email
		// await api.post("/user/sign/reset-password", { email });

		setIsLoading(false);
		navigate({ to: "/check-email" });
	};

	return (
		<div className="flex min-h-full flex-col bg-white">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-3">
				<button
					type="button"
					onClick={() => navigate({ to: "/login" })}
					className="rounded-lg p-1.5 hover:bg-gray-100"
				>
					<ArrowLeft className="h-5 w-5 text-gray-600" />
				</button>
				<LanguageSelector />
			</div>

			{/* Content */}
			<div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
				<div className="w-full max-w-sm space-y-6">
					{/* Title & Description */}
					<div className="space-y-2">
						<h1 className="font-bold text-2xl text-gray-900">
							{t("resetPassword.title")}
						</h1>
						<p className="text-gray-500 text-sm">
							{t("resetPassword.description")}
						</p>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-1.5">
							<label
								htmlFor="reset-email"
								className="block font-medium text-gray-700 text-sm"
							>
								{t("resetPassword.email")}
							</label>
							<input
								id="reset-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={t("resetPassword.emailPlaceholder")}
								required
								className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							/>
						</div>

						<Button
							type="submit"
							variant="primary"
							size="lg"
							full
							disabled={isLoading}
							className="rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
						>
							{isLoading
								? t("resetPassword.sending")
								: t("resetPassword.sendEmail")}
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
