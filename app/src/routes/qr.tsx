import { createQrScan, reportQrRedirect } from "@/api/qr";
import { useAuth } from "@/components/sign/sign-provider";
import { env } from "@/config/env";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExternalLink, LoaderCircle, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/qr")({
	component: QrRedirectPage,
});

/**
 * 운영이 `PUBLIC_QR_WEB_REDIRECT_URL` 로 외부 주소를 따로 지정했을 때만 값을
 * 낸다. **안 정했으면 `null`이다** — 그때는 `/main` 으로 SPA 이동한다(DEV-01).
 *
 * 전에는 안 정했을 때도 `"/"` 를 냈는데, `/`(IntroSection)는 2초를 기다렸다가
 * 그때의 `isSignedIn` 을 다시 판정한다. 게스트 세션을 막 만든 직후라 그 판정이
 * 아직 새 토큰을 못 볼 수 있고, 필요 없는 2초 스플래시도 거친다 — 로그인
 * 여부와 무관하게 곧장 홈으로 보낸다는 정책과 어긋났다.
 */
function externalRedirectUrl(): string | null {
	const configured = env.QR_WEB_REDIRECT_URL;
	if (!configured) return null;
	try {
		const url = new URL(configured, window.location.origin);
		const isSelfOrRoot =
			url.origin === window.location.origin &&
			(url.pathname === "/qr" || url.pathname === "/");
		return isSelfOrRoot ? null : url.href;
	} catch {
		return null;
	}
}

function QrRedirectPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { isSignedIn, isLoading, guestSign } = useAuth();
	const [hasError, setHasError] = useState(false);
	const startedRef = useRef(false);

	const continueToWeb = useCallback(() => {
		window.location.replace(externalRedirectUrl() ?? "/main");
	}, []);

	/**
	 * 스캔 기록은 **최선을 다할 뿐 막지 않는다.** QR 은 유입 경로지 권한 키가
	 * 아니다 — 추적 서버가 죽어 있어도 사람은 홈에 도착해야 한다(DEV-01 §1).
	 * 실패해도 여기서 오류를 던지지 않는다.
	 */
	const trackScan = useCallback(async () => {
		try {
			const scan = await createQrScan(window.location.href);
			await reportQrRedirect(scan.trackingId, "web_redirect").catch(
				() => undefined,
			);
		} catch (error) {
			console.error("QR 스캔 기록 실패 — 계속 진행한다:", error);
		}
	}, []);

	const registerAndRedirect = useCallback(async () => {
		setHasError(false);
		void trackScan();

		/*
		 * **로그인 토큰이 없을 때만 게스트를 만든다.** 이미 로그인/게스트
		 * 세션이 있으면 다시 만들지 않는다 — `guestSign()` 은 항상
		 * `/user/sign/guest` 를 새로 부르므로, 실제 로그인 사용자에게
		 * 쓰면 그 세션을 게스트 토큰으로 덮어쓸 수 있다.
		 */
		if (!isSignedIn) {
			const ok = await guestSign();
			if (!ok) {
				setHasError(true);
				return;
			}
		}

		const external = externalRedirectUrl();
		if (external) {
			window.location.replace(external);
			return;
		}
		navigate({ to: "/main", replace: true });
	}, [isSignedIn, guestSign, navigate, trackScan]);

	useEffect(() => {
		if (isLoading || startedRef.current) {
			return;
		}
		startedRef.current = true;
		void registerAndRedirect();
	}, [isLoading, registerAndRedirect]);

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
