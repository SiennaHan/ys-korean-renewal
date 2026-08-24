import { createContext, useContext, useEffect, useMemo, useRef } from "react";

type PlayOptions = {
	reset?: boolean;
	/** true이면 재생이 끝날 때까지 Promise가 resolve되지 않음.
	 *  자동재생이 차단된 경우에도 unlock 후 실제 재생이 끝날 때까지 기다린다. */
	waitUntilEnd?: boolean;
	/** 자동재생이 차단되어 사용자 제스처를 기다리는 상태가 되면 호출 (안내 문구용) */
	onBlocked?: () => void;
	/** 실제로 재생이 시작된 시점에 호출 — 차단 후 unlock 으로 재생될 때도 호출된다 */
	onPlaying?: () => void;
};

type StreamOptions = {
	/** 첫 오디오 청크가 재생 예약된 시점에 1회 호출 (스피너 해제용) */
	onFirstAudio?: () => void;
	/** 스트림이 끝까지 정상 재생된 경우에만, 수신한 전체 raw PCM과 함께 1회 호출.
	 *  중간에 stop()/다른 재생으로 취소되면 호출되지 않음 (잘린 음원 캐시 방지). */
	onComplete?: (pcm: Uint8Array) => void;
};

/** Gemini TTS raw PCM 포맷 (백엔드 /tts/stream 과 일치) */
const PCM_SAMPLE_RATE = 24000;

type SharedAudioApi = {
	playUrl: (url: string, options?: PlayOptions) => Promise<void>;
	/** 여러 URL을 순차 재생. stop() 또는 새 재생이 시작되면 시퀀스 전체가 취소됨 */
	playUrls: (urls: string[], options?: PlayOptions) => Promise<void>;
	playBlob: (blob: Blob, options?: PlayOptions) => Promise<void>;
	/** raw PCM(24kHz·모노·16bit) 스트림(Response.body)을 Web Audio로 즉시 순차 재생.
	 *  stop()/새 재생 시 취소됨. */
	playPcmStream: (response: Response, options?: StreamOptions) => Promise<void>;
	stop: () => void;
	unlock: () => Promise<void>;
};

const SharedAudioContext = createContext<SharedAudioApi | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const objectUrlRef = useRef<string | null>(null);
	const unlockedRef = useRef(false);
	const pendingPlayRef = useRef<{
		src: string;
		options?: PlayOptions;
		/** waitUntilEnd 호출자를 풀어주는 resolver — 실제 재생 종료(또는 폐기) 시 호출 */
		onSettled?: () => void;
	} | null>(null);
	const playRequestIdRef = useRef(0);
	/** 시퀀스(playUrls) 취소 토큰 — stop()/새 재생 시 증가시켜 진행 중 시퀀스를 무효화 */
	const sequenceTokenRef = useRef(0);

	// --- Web Audio 스트리밍(playPcmStream) 상태 ---
	const audioCtxRef = useRef<AudioContext | null>(null);
	/** 스트림 취소 토큰 — stop()/새 재생 시 증가 */
	const streamTokenRef = useRef(0);
	const streamReaderRef =
		useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
	/** 다음 청크 재생 시작 시각(AudioContext 시간축) — 갭리스 스케줄링 */
	const streamNextTimeRef = useRef(0);
	/** 예약된 BufferSource 들 — 취소 시 stop/disconnect */
	const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

	const UNLOCK_PROBE_SRC = "/sounds/click.mp3";

	const getAudioCtx = (): AudioContext | null => {
		if (typeof window === "undefined") return null;
		if (!audioCtxRef.current) {
			const Ctor =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext?: typeof AudioContext })
					.webkitAudioContext;
			if (!Ctor) return null;
			audioCtxRef.current = new Ctor();
		}
		return audioCtxRef.current;
	};

	/** 진행 중 PCM 스트림 재생을 취소 (reader 중단 + 예약 소스 정리) */
	const cancelStream = () => {
		streamTokenRef.current++;
		streamReaderRef.current?.cancel().catch(() => {});
		streamReaderRef.current = null;
		for (const src of activeSourcesRef.current) {
			try {
				src.stop();
				src.disconnect();
			} catch {
				// 이미 끝난 소스는 무시
			}
		}
		activeSourcesRef.current.clear();
		streamNextTimeRef.current = 0;
	};

	/** Int16LE PCM 바이트를 AudioBuffer로 변환해 갭리스로 예약 재생 */
	const schedulePcm = (ctx: AudioContext, bytes: Uint8Array, token: number) => {
		if (streamTokenRef.current !== token) return;
		const sampleCount = Math.floor(bytes.byteLength / 2);
		if (sampleCount === 0) return;
		const buffer = ctx.createBuffer(1, sampleCount, PCM_SAMPLE_RATE);
		const channel = buffer.getChannelData(0);
		const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
		for (let i = 0; i < sampleCount; i++) {
			channel[i] = view.getInt16(i * 2, true) / 32768;
		}
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(ctx.destination);
		const startAt = Math.max(
			ctx.currentTime,
			streamNextTimeRef.current || ctx.currentTime,
		);
		source.start(startAt);
		streamNextTimeRef.current = startAt + buffer.duration;
		activeSourcesRef.current.add(source);
		source.onended = () => activeSourcesRef.current.delete(source);
	};

	const isAutoplayBlocked = (error: unknown) => {
		if (!(error instanceof Error)) return false;
		const domError = error as DOMException;
		return (
			domError.name === "NotAllowedError" ||
			/notallowed|autoplay|user gesture/i.test(domError.message)
		);
	};

	const isAbortError = (error: unknown) => {
		if (!(error instanceof Error)) return false;
		const domError = error as DOMException;
		return (
			domError.name === "AbortError" || /aborted|abort/i.test(domError.message)
		);
	};

	const clearObjectUrl = () => {
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current);
			objectUrlRef.current = null;
		}
	};

	const waitForEnded = (audio: HTMLAudioElement, requestId: number) =>
		new Promise<void>((resolve) => {
			const onDone = () => {
				audio.removeEventListener("ended", onDone);
				audio.removeEventListener("pause", onDone);
				resolve();
			};
			// 이미 중단됐거나 다른 요청이 들어온 경우 즉시 resolve
			if (playRequestIdRef.current !== requestId) {
				resolve();
				return;
			}
			audio.addEventListener("ended", onDone);
			audio.addEventListener("pause", onDone);
		});

	/** 대기 중이던(자동재생 차단) 재생을 폐기하고, 그걸 기다리던 호출자를 풀어준다 */
	const discardPending = () => {
		const pending = pendingPlayRef.current;
		pendingPlayRef.current = null;
		pending?.onSettled?.();
	};

	/**
	 * 자동재생이 차단됐을 때 재생을 보류한다.
	 * waitUntilEnd 면 unlock 후 실제 재생이 끝날 때까지 resolve 되지 않는 Promise를 돌려준다
	 * (호출자가 "재생됐다"고 착각하고 다음 단계로 넘어가는 것을 막는다).
	 */
	const deferPlay = (src: string, options?: PlayOptions) => {
		options?.onBlocked?.();
		if (!options?.waitUntilEnd) {
			pendingPlayRef.current = { src, options };
			return;
		}
		return new Promise<void>((resolve) => {
			pendingPlayRef.current = { src, options, onSettled: resolve };
		});
	};

	const playWithSrc = async (src: string, options?: PlayOptions) => {
		if (!audioRef.current) return;
		// 새 재생 요청은 보류 중이던 이전 재생을 대체한다
		discardPending();
		const requestId = ++playRequestIdRef.current;
		const audio = audioRef.current;
		const reset = options?.reset ?? true;
		const isSameSrc = audio.src === src;
		if (!audio.paused) {
			audio.pause();
		}

		if (!isSameSrc) {
			audio.src = src;
		} else if (reset) {
			try {
				audio.currentTime = 0;
			} catch {
				// iOS can throw while seeking before metadata is ready.
			}
		}

		const playOnce = async () => {
			await audio.play();
		};

		try {
			await playOnce();
		} catch (error) {
			// newer playback request already superseded this one
			if (playRequestIdRef.current !== requestId) return;

			if (isAutoplayBlocked(error)) {
				return deferPlay(src, options);
			}
			// iOS Safari/Chrome can throw AbortError on fast source switches.
			if (isAbortError(error)) {
				for (let i = 0; i < 3; i++) {
					await new Promise((resolve) => setTimeout(resolve, 120));
					if (playRequestIdRef.current !== requestId) return;
					try {
						await playOnce();
						break;
					} catch (retryError) {
						if (i < 2 && isAbortError(retryError)) {
							continue;
						}
						if (playRequestIdRef.current !== requestId) return;
						if (isAutoplayBlocked(retryError) || isAbortError(retryError)) {
							return deferPlay(src, options);
						}
						throw retryError;
					}
				}
			} else {
				throw error;
			}
		}

		// 여기 도달 = 실제로 재생이 시작됨 (차단된 경우는 위에서 deferPlay 로 빠진다)
		options?.onPlaying?.();

		if (options?.waitUntilEnd) {
			await waitForEnded(audio, requestId);
		}
	};

	const unlock = async () => {
		if (!audioRef.current) return;
		const audio = audioRef.current;

		const replayPending = async () => {
			if (!pendingPlayRef.current) return;
			const pending = pendingPlayRef.current;
			pendingPlayRef.current = null;
			// 재차 차단되면 playWithSrc 가 다시 보류 Promise를 돌려주므로,
			// 이 await 는 실제로 재생이 끝난 뒤에야 풀린다 → 원 호출자도 그때 resolve.
			await playWithSrc(pending.src, pending.options);
			pending.onSettled?.();
		};

		// 이미 unlock 상태여도, 이전에 막힌 pending 재생은 다시 시도해야 함
		if (unlockedRef.current) {
			await replayPending();
			return;
		}

		const hasActiveGesture =
			typeof navigator !== "undefined" &&
			Boolean(navigator.userActivation?.isActive);
		if (!hasActiveGesture && !pendingPlayRef.current) {
			return;
		}

		if (!audio.paused) {
			unlockedRef.current = true;
			await replayPending();
			return;
		}

		const prevSrc = audio.src;
		const prevMuted = audio.muted;
		const prevVolume = audio.volume;
		const prevTime = audio.currentTime;

		try {
			// 실제 공유 오디오 엘리먼트를 사용자 제스처 안에서 play/pause 해야
			// 일부 모바일 브라우저(Chrome)에서도 첫 재생이 안정적으로 동작함.
			audio.muted = true;
			audio.volume = 0;
			audio.src = UNLOCK_PROBE_SRC;
			try {
				audio.currentTime = 0;
			} catch {
				// ignore seek errors before metadata.
			}
			await audio.play();
			audio.pause();
			unlockedRef.current = true;
		} catch {
			return;
		} finally {
			audio.muted = prevMuted;
			audio.volume = prevVolume;
			if (prevSrc) {
				audio.src = prevSrc;
				try {
					audio.currentTime = prevTime;
				} catch {
					// ignore seek restore errors.
				}
			} else {
				audio.removeAttribute("src");
			}
		}

		await replayPending();
	};

	/*
	 * 의존성이 빈 배열인 것은 의도다. 이 값은 컨텍스트로 내려가므로 새로 만들면
	 * **소비자 전부가 리렌더된다** — 그래서 한 번만 만든다.
	 *
	 * 그래도 안전한 이유: 이 파일에는 useState 가 **하나도 없고** useRef 만 열둘이다.
	 * 아래 함수들(cancelStream · discardPending · schedulePcm · unlock ·
	 * playWithSrc · clearObjectUrl · getAudioCtx)이 읽는 것은 전부 ref 의 .current
	 * 라 항상 최신이다. state 를 읽는 곳이 없으니 한 번 만들어 둔 클로저가 낡지 않는다.
	 *
	 * biome 은 그 함수 일곱이 의존성에 없다고 한다(진단 11건). 넣으면 함수들이 매
	 * 렌더마다 새로 만들어지므로 api 도 매번 바뀌어 위의 리렌더 문제가 그대로 생긴다.
	 * 제대로 넣으려면 일곱을 useCallback 으로 감싸야 하는데, ref 만 읽는 함수들이라
	 * 얻는 것이 없다.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: 위 주석 — 컨텍스트 값이라 한 번만 만들고, 안에서 읽는 것은 전부 ref 다
	const api = useMemo<SharedAudioApi>(
		() => ({
			playUrl: async (url, options) => {
				cancelStream(); // 진행 중 PCM 스트림 취소
				sequenceTokenRef.current++; // 진행 중 시퀀스 취소
				clearObjectUrl();
				await playWithSrc(url, options);
			},
			playUrls: async (urls, options) => {
				cancelStream(); // 진행 중 PCM 스트림 취소
				clearObjectUrl();
				const token = ++sequenceTokenRef.current;
				for (const url of urls) {
					// stop() 또는 다른 재생이 시작되면 토큰이 바뀌어 시퀀스 중단
					if (sequenceTokenRef.current !== token) return;
					await playWithSrc(url, { ...options, waitUntilEnd: true });
					// 자동재생 차단(pending) 시 이후 재생도 막히므로 중단
					if (pendingPlayRef.current) return;
				}
			},
			playBlob: async (blob, options) => {
				cancelStream(); // 진행 중 PCM 스트림 취소
				sequenceTokenRef.current++; // 진행 중 시퀀스 취소
				clearObjectUrl();
				const url = URL.createObjectURL(blob);
				objectUrlRef.current = url;
				await playWithSrc(url, options);
			},
			playPcmStream: async (response, options) => {
				// 다른 재생/스트림 모두 취소하고 새 스트림 시작
				sequenceTokenRef.current++;
				if (audioRef.current) audioRef.current.pause();
				cancelStream();
				const token = streamTokenRef.current; // cancelStream이 방금 증가시킨 값이 내 토큰

				const ctx = getAudioCtx();
				const body = response.body;
				if (!ctx || !body) return;
				if (ctx.state === "suspended") {
					try {
						await ctx.resume();
					} catch {
						// 제스처 밖이면 실패할 수 있음 — 전역 제스처 리스너가 이후 resume
					}
				}

				const reader = body.getReader();
				streamReaderRef.current = reader;
				let carry = new Uint8Array(0); // 16bit 경계용 홀수 바이트 이월
				let firstAudioFired = false;
				// onComplete 요청 시에만 수신 청크를 모아둔다 (그 외엔 메모리 점유 없음)
				const collected: Uint8Array[] | null = options?.onComplete ? [] : null;

				try {
					while (true) {
						if (streamTokenRef.current !== token) {
							await reader.cancel().catch(() => {});
							return;
						}
						const { done, value } = await reader.read();
						if (done) break;
						if (!value || value.byteLength === 0) continue;
						collected?.push(value);

						let bytes = value;
						if (carry.byteLength) {
							const merged = new Uint8Array(
								carry.byteLength + value.byteLength,
							);
							merged.set(carry);
							merged.set(value, carry.byteLength);
							bytes = merged;
							carry = new Uint8Array(0);
						}
						const usable = bytes.byteLength - (bytes.byteLength % 2);
						if (usable < bytes.byteLength) carry = bytes.slice(usable);
						if (usable === 0) continue;

						schedulePcm(ctx, bytes.subarray(0, usable), token);
						if (!firstAudioFired) {
							firstAudioFired = true;
							options?.onFirstAudio?.();
						}
					}

					// 스트림 정상 완료 + 미취소일 때만 전체 PCM 전달 (에러/취소 시 도달하지 않음)
					if (collected && streamTokenRef.current === token) {
						const total = collected.reduce((sum, c) => sum + c.byteLength, 0);
						const merged = new Uint8Array(total);
						let offset = 0;
						for (const c of collected) {
							merged.set(c, offset);
							offset += c.byteLength;
						}
						options?.onComplete?.(merged);
					}
				} finally {
					if (streamReaderRef.current === reader)
						streamReaderRef.current = null;
				}
			},
			stop: () => {
				cancelStream(); // 진행 중 PCM 스트림 취소
				sequenceTokenRef.current++; // 진행 중 시퀀스 취소
				discardPending();
				if (audioRef.current) audioRef.current.pause();
			},
			unlock,
		}),
		[],
	);

	// 언마운트 때 한 번만 치운다 — 의존성을 넣으면 값이 바뀔 때마다 치워 버린다.
	// 두 함수는 ref 만 읽으므로 클로저가 낡지 않는다(위 api 주석과 같은 사정).
	// biome-ignore lint/correctness/useExhaustiveDependencies: 언마운트 전용 정리
	useEffect(() => {
		return () => {
			clearObjectUrl();
			cancelStream();
			audioCtxRef.current?.close().catch(() => {});
		};
	}, []);

	// document 에 붙이는 잠금 해제 listener — 마운트 때 한 번만 붙어야 한다.
	// unlock·getAudioCtx 를 의존성에 넣으면 매 렌더마다 떼고 다시 붙는다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 1회 등록
	useEffect(() => {
		const tryUnlock = () => {
			void unlock();
			// iOS 스트리밍 대비 — 제스처 중에 AudioContext 생성/resume 해 미리 잠금 해제
			const ctx = getAudioCtx();
			if (ctx && ctx.state === "suspended") void ctx.resume();
		};

		document.addEventListener("pointerdown", tryUnlock, { passive: true });
		document.addEventListener("click", tryUnlock, { passive: true });
		document.addEventListener("touchstart", tryUnlock, { passive: true });
		document.addEventListener("touchend", tryUnlock, { passive: true });
		document.addEventListener("keydown", tryUnlock);

		return () => {
			document.removeEventListener("pointerdown", tryUnlock);
			document.removeEventListener("click", tryUnlock);
			document.removeEventListener("touchstart", tryUnlock);
			document.removeEventListener("touchend", tryUnlock);
			document.removeEventListener("keydown", tryUnlock);
		};
	}, []);

	return (
		<SharedAudioContext.Provider value={api}>
			{children}
			{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
			<audio ref={audioRef} className="hidden" playsInline preload="auto" />
		</SharedAudioContext.Provider>
	);
}

export function useSharedAudio() {
	const ctx = useContext(SharedAudioContext);
	if (!ctx) throw new Error("useSharedAudio must be used within AudioProvider");
	return ctx;
}
