import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
});

/** 개인정보 처리방침 — 초안은 `docs/legal_draft_v1.html` §03. 문안 대기 중이다 */
function PrivacyPage() {
	const { t } = useTranslation();
	return <LegalDocPage title={t("legal.privacyTitle")} from="/privacy" />;
}
