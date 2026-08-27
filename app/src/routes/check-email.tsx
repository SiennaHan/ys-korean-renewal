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
		<div className="auth-page">
			<div className="auth-topbar auth-topbar--end">
				<LanguageSelector />
			</div>

			<main className="auth-main auth-main--center">
				<div className="auth-panel auth-panel--center">
					<div className="auth-success-icon">
						<Mail aria-hidden="true" />
					</div>

					<div className="auth-heading">
						<h1 className="auth-title">{t("checkEmail.title")}</h1>
						<p className="auth-description">{t("checkEmail.description")}</p>
					</div>

					<Button
						variant="primary"
						size="lg"
						full
						onClick={() => navigate({ to: "/login" })}
						className="auth-primary"
					>
						{t("checkEmail.ok")}
					</Button>
				</div>
			</main>
		</div>
	);
}
