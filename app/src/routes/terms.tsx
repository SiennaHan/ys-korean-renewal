import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
});

/** 이용약관 — 초안은 `phase1/legal_draft_v1.html` §04. 문안 대기 중이다 */
function TermsPage() {
	const { t } = useTranslation();
	return <LegalDocPage title={t("legal.termsTitle")} from="/terms" />;
}
