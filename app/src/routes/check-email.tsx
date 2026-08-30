import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { MAIL_RESET_READY } from "@/shared/feature-gates";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

/*
 * **메일을 보낸 적이 없는데 "보내드렸습니다" 라고 말하던 화면이다.**
 *
 * 재설정 메일을 보낼 수단이 아직 없고(BLOCKERS §7), 그래서 앱 안에 여기로
 * 오는 길도 하나도 없다(참조 0곳 · 2026-08-27 확인). 남은 것은 문장뿐인데
 * 그 문장이 거짓이었다 — `docs/draft_auth.html` 규칙 01.
 *
 * 지우지 않고 **사실을 말하는 화면으로 보낸다.** `/reset-password` 가 이미
 * "아직 메일을 보낼 수 없습니다 → 문의하기" 라고 말한다. 지우면 낡은 링크나
 * 즐겨찾기가 404 를 만나고, 여기서 같은 문장을 한 벌 더 쓰면 메일이 붙는 날
 * 두 곳을 고쳐야 한다.
 *
 * 아래 화면은 그대로 뒀다 — 깃발(`shared/feature-gates.ts`)이 켜지면 그때
 * 다시 쓴다. `/new-password` 와 **같은 깃발**이다.
 */
export const Route = createFileRoute("/check-email")({
	beforeLoad: () => {
		if (!MAIL_RESET_READY) throw redirect({ to: "/reset-password" });
	},
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
