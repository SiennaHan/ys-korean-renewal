import { api, authFetch } from "@/api/api";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/tts-test")({
	component: TtsTestPage,
});

type Provider = "gemini" | "openai";

const PROVIDERS: { key: Provider; label: string }[] = [
	{ key: "gemini", label: "Gemini" },
	{ key: "openai", label: "OpenAI" },
];

const DEFAULT_TEXT = "안녕하세요. 오늘 날씨가 정말 좋네요.";

function ProviderCard({
	provider,
	label,
	voices,
	text,
}: {
	provider: Provider;
	label: string;
	voices: string[];
	text: string;
}) {
	const [voice, setVoice] = useState(voices[0] ?? "");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!voice && voices.length > 0) setVoice(voices[0]);
	}, [voices, voice]);

	useEffect(() => {
		return () => {
			if (audioUrl) URL.revokeObjectURL(audioUrl);
		};
	}, [audioUrl]);

	const handlePlay = async () => {
		if (!text.trim()) {
			setError("텍스트를 입력하세요.");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const response = await authFetch("/tts/test", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ provider, text, voice }),
			});
			if (!response.ok) {
				const msg = await response.text();
				throw new Error(msg || `HTTP ${response.status}`);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			if (audioUrl) URL.revokeObjectURL(audioUrl);
			setAudioUrl(url);
			const audio = new Audio(url);
			void audio.play();
		} catch (e) {
			console.error(`${provider} tts failed:`, e);
			setError(e instanceof Error ? e.message : "TTS 생성 실패");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
			<h2 className="font-semibold text-gray-900">{label}</h2>

			<label className="flex flex-col gap-1 text-sm">
				<span className="text-gray-500">목소리</span>
				<select
					value={voice}
					onChange={(e) => setVoice(e.target.value)}
					className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
					disabled={voices.length === 0}
				>
					{voices.map((v) => (
						<option key={v} value={v}>
							{v}
						</option>
					))}
				</select>
			</label>

			<button
				type="button"
				onClick={() => void handlePlay()}
				disabled={loading || voices.length === 0}
				className="flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-3 py-2 font-medium text-sm text-white transition hover:bg-violet-600 disabled:opacity-50"
			>
				{loading ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Volume2 className="h-4 w-4" />
				)}
				재생
			</button>

			{error && <p className="text-rose-600 text-xs">{error}</p>}

			{audioUrl && (
				// biome-ignore lint/a11y/useMediaCaption: TTS 결과 미리듣기, 캡션 없음
				<audio controls src={audioUrl} className="w-full" />
			)}
		</div>
	);
}

function TtsTestPage() {
	const [text, setText] = useState(DEFAULT_TEXT);
	const [voicesByProvider, setVoicesByProvider] = useState<
		Record<Provider, string[]>
	>({ gemini: [], openai: [] });
	const [loadingVoices, setLoadingVoices] = useState(true);

	useEffect(() => {
		(async () => {
			try {
				const res =
					await api.get<Record<Provider, string[]>>("/tts/test/voices");
				if (res.data) setVoicesByProvider(res.data);
			} catch (e) {
				console.error("failed to load tts voices:", e);
			} finally {
				setLoadingVoices(false);
			}
		})();
	}, []);

	const cards = useMemo(() => PROVIDERS, []);

	return (
		<div>
			<div className="mb-6">
				<h1 className="flex items-center gap-2 font-bold text-2xl text-gray-900">
					<Volume2 className="h-6 w-6 text-violet-500" />
					TTS 비교 (Gemini / OpenAI)
				</h1>
				<p className="mt-1 text-gray-500 text-sm">
					같은 문장을 두 TTS 엔진으로 각각 재생해 목소리 품질을 비교합니다.
				</p>
			</div>

			<div className="mb-6">
				<label className="flex flex-col gap-1">
					<span className="text-gray-500 text-sm">테스트할 한글 문장</span>
					<textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						rows={3}
						className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
						placeholder="한글 문장을 입력하세요"
					/>
				</label>
			</div>

			{loadingVoices ? (
				<div className="flex items-center gap-2 text-gray-500 text-sm">
					<Loader2 className="h-4 w-4 animate-spin" />
					목소리 목록 불러오는 중…
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					{cards.map((p) => (
						<ProviderCard
							key={p.key}
							provider={p.key}
							label={p.label}
							voices={voicesByProvider[p.key] ?? []}
							text={text}
						/>
					))}
				</div>
			)}
		</div>
	);
}
