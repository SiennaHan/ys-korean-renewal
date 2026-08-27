import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { LEGAL_DOCS_READY } from "@/shared/feature-gates";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * 이용약관·개인정보 처리방침을 읽는 화면의 공통 껍데기.
 *
 * 둘은 제목과 조문만 다르고 나머지가 같다. 한 벌씩 쓰면 갈라진다 —
 * 이 저장소에서 가장 자주 어긋난 자리다.
 *
 * **문안이 아직 없다**(`shared/feature-gates.ts` 의 `LEGAL_DOCS_READY`).
 * 그동안 이 화면은 **없는 약관을 지어 보여 주지 않고** 준비 중이라고 말한 뒤
 * 문의로 보낸다. 가입 화면이 "동의합니다" 를 요구하면서 읽을 곳이 없던 것보다는
 * 낫고, 지어낸 조문을 보여 주는 것보다는 훨씬 낫다.
 */
export function LegalDocPage({
	title,
	body,
	from,
}: {
	title: string;
	/** 확정된 조문. 아직 없으므로 지금은 아무도 안 넘긴다 */
	body?: ReactNode;
	/** 문의 화면에 "어디서 왔나" 로 넘길 경로 */
	from: string;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const router = useRouter();
	const ready = LEGAL_DOCS_READY && body;

	return (
		<div className="auth-page">
			<div className="auth-topbar">
				<button
					type="button"
					className="auth-back"
					aria-label={t("legal.back")}
					onClick={() => router.history.back()}
				>
					<ArrowLeft aria-hidden="true" />
				</button>
				<LanguageSelector />
			</div>

			<main
				className={`auth-main ${ready ? "auth-main--flow" : "auth-main--center"}`}
			>
				<div className="auth-panel">
					<div className="auth-heading">
						<h1 className="auth-title">{title}</h1>
						{!ready && (
							<p className="auth-description">{t("legal.pendingBody")}</p>
						)}
					</div>

					{ready ? (
						body
					) : (
						<div className="auth-form">
							<p className="auth-description">{t("legal.pendingHow")}</p>
							<Button
								type="button"
								variant="primary"
								size="lg"
								full
								onClick={() => navigate({ to: "/inquiry", search: { from } })}
								className="auth-primary"
							>
								{t("legal.pendingContact")}
							</Button>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
