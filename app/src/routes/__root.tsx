import AppLayout from "@/components/app-layout";
import DesignDecisions from "@/components/dev/design-decisions";
import { AudioProvider } from "@/components/audio/audio-provider";
import { MicPermissionProvider } from "@/components/audio/mic-permission-provider";
import { ConfettiProvider } from "@/components/effect/confetti-provider";
import { LottieEffectProvider } from "@/components/effect/lottie-effect-provider";
import { SignProvider } from "@/components/sign/sign-provider";
import ToastContainer from "@/components/toast/toast-container";
import { ToastProvider } from "@/components/toast/toast-context";
import { useFreeContentPrefetch } from "@/shared/content/prefetch-free";
import {
	type ErrorComponentProps,
	Outlet,
	createRootRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const CHUNK_RELOAD_KEY = "chunk-reload-attempted";

export const Route = createRootRoute({
	component: RootComponent,
	errorComponent: RootErrorComponent,
});

function RootComponent() {
	useEffect(() => {
		sessionStorage.removeItem(CHUNK_RELOAD_KEY);
	}, []);

	/*
	 * 무료 범위를 유휴 시간에 미리 받아 둔다 — 콘텐츠가 서버로 가면서 깨진
	 * 오프라인을 메운다(DEV-05). 그리는 것이 없어 컴포넌트가 아니라 훅이다.
	 */
	useFreeContentPrefetch();

	return (
		<>
			<AppLayout>
				<SignProvider>
					<AudioProvider>
						<MicPermissionProvider>
							<ToastProvider>
								<ConfettiProvider>
									<LottieEffectProvider>
										<Outlet />
										<ToastContainer />
									</LottieEffectProvider>
								</ConfettiProvider>
							</ToastProvider>
						</MicPermissionProvider>
					</AudioProvider>
				</SignProvider>
			</AppLayout>
			{/*
			 * 디자인 결정판 — 개발 빌드에만 그린다. 진짜 화면 위에서 후보 값을
			 * 바꿔 보는 도구다(DESIGN.md 의 「정해야 할 물음」). 프로덕션 번들에는
			 * 이 조건이 상수로 접혀 통째로 빠진다.
			 */}
			{process.env.NODE_ENV !== "production" && <DesignDecisions />}
			{/* <TanStackRouterDevtools position="bottom-right" /> */}
		</>
	);
}

function RootErrorComponent({ error, reset }: ErrorComponentProps) {
	const { t } = useTranslation();
	const chunkError = isChunkLoadError(error);

	useEffect(() => {
		if (!chunkError) {
			return;
		}
		const attempted = sessionStorage.getItem(CHUNK_RELOAD_KEY);
		if (attempted) {
			return;
		}
		sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
		window.location.reload();
	}, [chunkError]);

	if (chunkError) {
		return (
			<div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
				<h1 className="font-bold text-2xl">{t("app.updatingTitle")}</h1>
				<p className="mt-2 text-text-sub text-sm">
					{t("app.updatingBody")}
				</p>
				<button
					className="mt-4 rounded-[12px] bg-fill-primary px-4 py-2 text-text-inverse"
					onClick={() => window.location.reload()}
					type="button"
				>
					{t("app.reload")}
				</button>
			</div>
		);
	}

	return (
		<div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
			<h1 className="font-bold text-2xl">{t("app.errorTitle")}</h1>
			<p className="mt-2 text-text-sub text-sm">{t("app.errorBody")}</p>
			<button
				className="mt-4 rounded-[12px] bg-fill-primary px-4 py-2 text-text-inverse"
				onClick={() => reset()}
				type="button"
			>
				{t("app.retry")}
			</button>
		</div>
	);
}

function isChunkLoadError(error: unknown) {
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";
	return (
		message.includes("ChunkLoadError") ||
		message.includes("Loading chunk") ||
		message.includes("Failed to fetch dynamically imported module")
	);
}
