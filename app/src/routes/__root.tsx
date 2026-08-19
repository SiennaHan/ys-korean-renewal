import AppLayout from "@/components/app-layout";
import { AudioProvider } from "@/components/audio/audio-provider";
import { MicPermissionProvider } from "@/components/audio/mic-permission-provider";
import { ConfettiProvider } from "@/components/effect/confetti-provider";
import { LottieEffectProvider } from "@/components/effect/lottie-effect-provider";
import { SignProvider } from "@/components/sign/sign-provider";
import ToastContainer from "@/components/toast/toast-container";
import { ToastProvider } from "@/components/toast/toast-context";
import {
	type ErrorComponentProps,
	Outlet,
	createRootRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "chunk-reload-attempted";

export const Route = createRootRoute({
	component: RootComponent,
	errorComponent: RootErrorComponent,
});

function RootComponent() {
	useEffect(() => {
		sessionStorage.removeItem(CHUNK_RELOAD_KEY);
	}, []);

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
			{/* <TanStackRouterDevtools position="bottom-right" /> */}
		</>
	);
}

function RootErrorComponent({ error, reset }: ErrorComponentProps) {
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
				<h1 className="font-bold text-2xl">앱 업데이트 중입니다</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					배포 직후 파일 버전이 바뀌어 화면을 불러오지 못했습니다.
				</p>
				<button
					className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground"
					onClick={() => window.location.reload()}
					type="button"
				>
					새로고침
				</button>
			</div>
		);
	}

	return (
		<div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
			<h1 className="font-bold text-2xl">오류가 발생했습니다</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				잠시 후 다시 시도해 주세요.
			</p>
			<button
				className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground"
				onClick={() => reset()}
				type="button"
			>
				다시 시도
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
