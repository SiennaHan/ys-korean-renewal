import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/check-email")({
	component: CheckEmailPage,
});

function CheckEmailPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<div className="flex min-h-full flex-col bg-white">
			{/* Header */}
			<div className="flex justify-end px-4 pt-3">
				<LanguageSelector />
			</div>

			{/* Content */}
			<div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
				<div className="w-full max-w-sm space-y-6 text-center">
					{/* Icon */}
					<div className="flex justify-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
							<Mail className="h-8 w-8 text-blue-600" />
						</div>
					</div>

					{/* Title & Description */}
					<div className="space-y-2">
						<h1 className="font-bold text-2xl text-gray-900">
							{t("checkEmail.title")}
						</h1>
						<p className="text-gray-500 text-sm">
							{t("checkEmail.description")}
						</p>
					</div>

					{/* OK Button */}
					<Button
						variant="primary"
						size="lg"
						full
						onClick={() => navigate({ to: "/login" })}
						className="rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
					>
						{t("checkEmail.ok")}
					</Button>
				</div>
			</div>
		</div>
	);
}
