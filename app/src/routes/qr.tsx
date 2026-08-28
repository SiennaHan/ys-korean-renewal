import { createQrScan, reportQrRedirect } from "@/api/qr";
import { env } from "@/config/env";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, LoaderCircle, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/qr")({
	component: QrRedirectPage,
});

function getWebRedirectUrl(): string {
	const configured = env.QR_WEB_REDIRECT_URL || "/";
	try {
		const url = new URL(configured, window.location.origin);
		return url.pathname === "/qr" && url.origin === window.location.origin
			? "/"
			: url.href;
	} catch {
		return "/";
	}
}

function QrRedirectPage() {
	const { t } = useTranslation();
	const [hasError, setHasError] = useState(false);
	const startedRef = useRef(false);

	const continueToWeb = useCallback(() => {
		window.location.replace(getWebRedirectUrl());
	}, []);

	const registerAndRedirect = useCallback(async () => {
		setHasError(false);
		try {
			const scan = await createQrScan(window.location.href);
			await reportQrRedirect(scan.trackingId, "web_redirect").catch(
				() => undefined,
			);
			continueToWeb();
		} catch {
			setHasError(true);
		}
	}, [continueToWeb]);

	useEffect(() => {
		if (startedRef.current) {
			return;
		}
		startedRef.current = true;
		void registerAndRedirect();
	}, [registerAndRedirect]);

	if (hasError) {
		return (
			<main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
				<div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-lg">
					<h1 className="font-bold text-2xl">{t("qr.errorTitle")}</h1>
					<p className="mt-3 text-gray-500 text-sm">
						{t("qr.errorDescription")}
					</p>
					<button
						className="mt-7 flex w-full items-center justify-center gap-2 rounded-[12px] bg-blue-600 px-4 py-3 font-semibold text-white"
						onClick={() => void registerAndRedirect()}
						type="button"
					>
						<RotateCcw className="h-4 w-4" />
						{t("qr.retry")}
					</button>
					<button
						className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] border border-gray-200 px-4 py-3 font-semibold text-gray-700"
						onClick={continueToWeb}
						type="button"
					>
						<ExternalLink className="h-4 w-4" />
						{t("qr.continueWeb")}
					</button>
				</div>
			</main>
		);
	}

	return (
		<main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
			<LoaderCircle className="h-10 w-10 animate-spin text-blue-600" />
			<h1 className="mt-6 font-bold text-2xl">{t("qr.redirecting")}</h1>
			<p className="mt-2 text-gray-500 text-sm">{t("qr.description")}</p>
		</main>
	);
}
