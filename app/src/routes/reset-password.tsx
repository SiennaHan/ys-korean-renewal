import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<div className="auth-page">
			<div className="auth-topbar">
				<button
					type="button"
					onClick={() => navigate({ to: "/login" })}
					aria-label={t("signup.back")}
					className="auth-back"
				>
					<ArrowLeft />
				</button>
				<LanguageSelector />
			</div>

			<main className="auth-main auth-main--center">
				<div className="auth-panel">
					<div className="auth-heading">
						<h1 className="auth-title">{t("resetPassword.title")}</h1>
						<p className="auth-description">
							{t("resetPassword.blockedDescription")}
						</p>
					</div>

					{/*
					 * **못 하는 것을 할 수 있는 것처럼 말하지 않는다** —
					 * docs/draft_auth.html 의 규칙 01, 그 문서의 `resetBlocked` 판이다.
					 *
					 * 전에는 아무것도 안 보내고 /check-email 로 보냈고 그 화면이
					 * "이메일로 보내드렸습니다" 라고 말했다. 메일 발송 수단이 아직
					 * 없다(BLOCKERS §7). 대신 **갈 수 있는 길**을 준다 — 문의하기가
					 * 2026-08-27 에 생겨서 이제 빈손으로 돌려보내지 않는다.
					 *
					 * 메일이 붙으면 이 자리에 원래의 입력 폼이 돌아온다.
					 * 문구는 resetPassword.description 에 그대로 남겨 뒀다.
					 */}
					<p className="auth-description">{t("resetPassword.blockedHow")}</p>

					<div className="auth-form">
						<Button
							type="button"
							variant="primary"
							size="lg"
							full
							onClick={() =>
								navigate({
									to: "/inquiry",
									search: { from: "/reset-password" },
								})
							}
							className="auth-primary"
						>
							{t("resetPassword.blockedContact")}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="lg"
							full
							onClick={() => navigate({ to: "/login" })}
							className="auth-secondary"
						>
							{t("resetPassword.blockedBack")}
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
