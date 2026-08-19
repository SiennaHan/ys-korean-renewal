/**
 * TTS 오디오 캐시 — 한번 조회한 음원 URL은 저장해두고 재사용
 * key: 텍스트+voice, value: S3 URL
 * (서버가 hash 기준으로 영구 캐싱하므로 여기 캐시는 네트워크 반복 호출만 줄인다.)
 *
 * URL 은 서버가 (provider, voice, text) 해시로 만드는 공개 S3 주소라 만료되지 않는다.
 * 따라서 localStorage 에 얹어 릴로드 후에도 /tts/generate 왕복 없이 바로 재생할 수 있게 한다.
 */

import { getTtsUrl, getWordTtsUrl } from "@/api/chat";

const cache = new Map<string, string>();

const STORAGE_KEY = "speako-tts-url-cache";
/** localStorage 항목 상한 — 초과 시 가장 오래된 항목부터 제거 */
const URL_CACHE_MAX_ENTRIES = 500;

let loaded = false;

/** localStorage 의 URL 캐시를 메모리 Map 으로 1회 로드 */
function loadCache() {
	if (loaded) return;
	loaded = true;
	if (typeof localStorage === "undefined") return;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw) as Record<string, string>;
		for (const [key, url] of Object.entries(parsed)) {
			if (typeof url === "string") cache.set(key, url);
		}
	} catch {
		// 손상된 캐시는 버리고 새로 시작
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// 저장소 접근 불가(사파리 프라이빗 등) — 메모리 캐시만 사용
		}
	}
}

/** 메모리 Map 을 localStorage 에 반영 (실패해도 재생에는 지장 없음) */
function persistCache() {
	if (typeof localStorage === "undefined") return;
	try {
		// Map 은 삽입 순서를 유지하므로 앞쪽이 오래된 항목
		while (cache.size > URL_CACHE_MAX_ENTRIES) {
			const oldest = cache.keys().next().value;
			if (oldest === undefined) break;
			cache.delete(oldest);
		}
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(Object.fromEntries(cache)),
		);
	} catch {
		// 용량 초과/프라이빗 모드 — 메모리 캐시만 사용
	}
}

/** 같은 텍스트에 대한 동시 요청이 API 를 중복 호출하지 않도록 in-flight 공유 */
const inflight = new Map<string, Promise<string | null>>();

async function resolveUrl(
	cacheKey: string,
	fetcher: () => Promise<string | null>,
): Promise<string | null> {
	loadCache();
	const cached = cache.get(cacheKey);
	if (cached) return cached;

	const pending = inflight.get(cacheKey);
	if (pending) return pending;

	const request = fetcher()
		.then((url) => {
			if (url) {
				cache.set(cacheKey, url);
				persistCache();
			}
			return url;
		})
		.finally(() => inflight.delete(cacheKey));

	inflight.set(cacheKey, request);
	return request;
}

/**
 * 텍스트를 음성으로 변환한 S3 URL을 반환.
 * 이미 캐시되어 있으면 API 호출 없이 바로 반환.
 */
export async function getTTSAudio(
	text: string,
	voice = "female",
): Promise<string | null> {
	return resolveUrl(`${voice}::${text}`, () => getTtsUrl(text, voice));
}

/** 이미 브라우저 HTTP 캐시에 받아둔 음원 URL — 중복 프리페치 방지 */
const prefetched = new Set<string>();

/**
 * 재생 전에 URL 조회 + 음원 바이트까지 브라우저 캐시에 미리 받아둔다.
 * (URL 만 캐시하면 첫 재생 때 S3 다운로드 지연이 그대로 남는다.)
 * 실패해도 조용히 무시 — 실제 재생 시 정상 경로로 다시 받는다.
 */
export async function prefetchTTSAudio(
	text: string,
	voice = "female",
): Promise<void> {
	const url = await getTTSAudio(text, voice);
	if (!url || prefetched.has(url)) return;
	prefetched.add(url);
	try {
		// audio 엘리먼트와 같은 no-cors 요청이라야 캐시 항목을 공유한다
		await fetch(url, { mode: "no-cors", cache: "force-cache" });
	} catch {
		prefetched.delete(url);
	}
}

/**
 * 단어(고립 어휘)의 음성 URL을 반환 (단어 학습·플래시카드 전용).
 * /tts/word 는 조회 전용이라 사전생성되지 않은 단어는 null 이 온다(재생 생략).
 */
export async function getWordTTSAudio(
	text: string,
	voice = "female",
): Promise<string | null> {
	return resolveUrl(`word::${voice}::${text}`, () =>
		getWordTtsUrl(text, voice),
	);
}

// --- 미션챗 스트리밍 TTS Blob 캐시 ---
// /tts/stream 은 서버 캐시 없이 매번 Gemini 를 재생성하므로, 한번 끝까지 재생한
// 스트림의 PCM 을 WAV Blob 으로 만들어 메모리에 보관 → 재생 버튼은 재요청 없이 즉시 재생.
// AI 응답은 대화마다 텍스트가 달라 세션을 넘는 재사용 가치가 없어 영속화(IndexedDB)는 하지 않는다.

/** Gemini TTS raw PCM 포맷 (백엔드 /tts/stream 과 일치) */
const PCM_SAMPLE_RATE = 24000;
/** 메모리 상한 — 초과 시 가장 오래된 항목부터 제거 (10초 답변 ≈ 480KB 기준 넉넉한 수준) */
const BLOB_CACHE_MAX_ENTRIES = 60;

const blobCache = new Map<string, Blob>();

/** raw PCM(24kHz·모노·16bit LE)에 44바이트 WAV 헤더를 붙여 Blob 생성 (재인코딩 없음) */
function pcmToWavBlob(pcm: Uint8Array, sampleRate = PCM_SAMPLE_RATE): Blob {
	const dataLen = pcm.byteLength - (pcm.byteLength % 2); // 16bit 경계 보정
	const header = new ArrayBuffer(44);
	const view = new DataView(header);
	const writeAscii = (offset: number, s: string) => {
		for (let i = 0; i < s.length; i++)
			view.setUint8(offset + i, s.charCodeAt(i));
	};
	writeAscii(0, "RIFF");
	view.setUint32(4, 36 + dataLen, true);
	writeAscii(8, "WAVE");
	writeAscii(12, "fmt ");
	view.setUint32(16, 16, true); // fmt 청크 크기
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // 모노
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true); // byteRate
	view.setUint16(32, 2, true); // blockAlign
	view.setUint16(34, 16, true); // bitsPerSample
	writeAscii(36, "data");
	view.setUint32(40, dataLen, true);
	// 복사본 생성 — ArrayBufferLike(SharedArrayBuffer 가능) 뷰는 BlobPart 타입과 호환되지 않음
	return new Blob([header, new Uint8Array(pcm.subarray(0, dataLen))], {
		type: "audio/wav",
	});
}

/** 재생 완료된 스트림의 PCM 을 캐시에 저장 */
export function putCachedTtsPcm(text: string, voice: string, pcm: Uint8Array) {
	const key = `${voice}::${text}`;
	if (!blobCache.has(key) && blobCache.size >= BLOB_CACHE_MAX_ENTRIES) {
		// Map 은 삽입 순서를 유지하므로 첫 키가 가장 오래된 항목
		const oldest = blobCache.keys().next().value;
		if (oldest !== undefined) blobCache.delete(oldest);
	}
	blobCache.set(key, pcmToWavBlob(pcm));
}

/** 캐시된 음성 Blob 반환 (없으면 null) — sharedAudio.playBlob 으로 바로 재생 가능 */
export function getCachedTtsBlob(text: string, voice: string): Blob | null {
	return blobCache.get(`${voice}::${text}`) ?? null;
}
