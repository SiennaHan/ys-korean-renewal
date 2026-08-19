import { getListenAudio, getTtsUrl, getWordTtsUrl } from "@/api/chat";
import { getScriptLines } from "@/shared/data/listen-answer";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import samples from "./tts-regen-samples.json";

export const Route = createFileRoute("/test/tts-regen")({
	component: RouteComponent,
});

interface Sample {
	sheet: string;
	id: number;
	label: string;
	sub: string;
	text: string;
	voice: string;
}

type Status = "idle" | "loading" | "ready" | "error";

const SHEET_LABEL: Record<string, string> = {
	n1_word_list: "단어 (n1_word_list)",
	n3_listen_script: "듣기 지문 (n3_listen_script)",
	n3_listen_script_line: "발화 라인 (n3_listen_script_line)",
	n4_blank_question: "빈칸 채워 말하기 (n4_blank_question)",
	n5_read_answer_text: "읽기 지문 (n5_read_answer_text)",
};

function RouteComponent() {
	const list = samples as Sample[];
	const audioRef = useRef<HTMLAudioElement | null>(null);
	// 항목 key = `${sheet}:${id}`
	const [status, setStatus] = useState<Record<string, Status>>({});
	// 듣기 지문은 화자별 라인마다 URL이 나오므로 항목당 URL 배열로 보관한다.
	const [urls, setUrls] = useState<Record<string, string[]>>({});
	const [playingKey, setPlayingKey] = useState<string | null>(null);
	const [bulkRunning, setBulkRunning] = useState(false);

	const grouped = useMemo(() => {
		const g: Record<string, Sample[]> = {};
		for (const s of list) {
			const group = g[s.sheet] ?? [];
			group.push(s);
			g[s.sheet] = group;
		}
		return g;
	}, [list]);

	const keyOf = (s: Sample) => `${s.sheet}:${s.id}`;

	/** URL 확보(캐시된 게 없으면 생성) 후 반환. 듣기 지문은 화자별 라인 URL 배열. */
	async function ensureUrls(s: Sample): Promise<string[] | null> {
		const key = keyOf(s);
		if (urls[key]) return urls[key];
		setStatus((p) => ({ ...p, [key]: "loading" }));
		let out: string[] | null;
		if (s.sheet === "n3_listen_script") {
			// 듣기 지문은 통짜 대화를 단일음성(/tts/generate)으로 보내면 Gemini가 낭독 대신
			// 지시로 반응해 폭주·무한대기한다. 프로덕션과 동일하게 화자별 라인으로 쪼개
			// /tts/listen/audio 경로로 생성한다.
			const lines = getScriptLines(s.id).map((line) => ({
				text: line.text,
				speaker: line.speaker,
				voice: line.voice,
			}));
			out = await getListenAudio(lines);
		} else if (s.sheet === "n1_word_list") {
			// 단어(n1)는 프로덕션과 동일하게 OpenAI 경로(/tts/word)로 생성
			const url = await getWordTtsUrl(s.text, s.voice);
			out = url ? [url] : null;
		} else {
			const url = await getTtsUrl(s.text, s.voice);
			out = url ? [url] : null;
		}
		if (!out || out.length === 0) {
			setStatus((p) => ({ ...p, [key]: "error" }));
			return null;
		}
		setUrls((p) => ({ ...p, [key]: out }));
		setStatus((p) => ({ ...p, [key]: "ready" }));
		return out;
	}

	/** URL 배열을 순서대로 재생(듣기 지문은 화자 라인들을 이어서 들려준다). */
	function playSequential(urlList: string[], onDone: () => void) {
		const audio = audioRef.current;
		if (!audio) return;
		let i = 0;
		const next = () => {
			if (i >= urlList.length) {
				audio.onended = null;
				onDone();
				return;
			}
			audio.src = urlList[i++];
			audio.currentTime = 0;
			audio.play().catch(() => {
				audio.onended = null;
				onDone();
			});
		};
		audio.onended = next;
		next();
	}

	async function handlePlay(s: Sample) {
		const urlList = await ensureUrls(s);
		if (!urlList || !audioRef.current) return;
		setPlayingKey(keyOf(s));
		playSequential(urlList, () => setPlayingKey(null));
	}

	/** 전체 순차 생성(캐시 워밍). 서버 과부하 방지를 위해 하나씩. */
	async function handleBulk() {
		setBulkRunning(true);
		for (const s of list) {
			await ensureUrls(s);
		}
		setBulkRunning(false);
	}

	const doneCount = Object.values(status).filter((v) => v === "ready").length;
	const errCount = Object.values(status).filter((v) => v === "error").length;

	return (
		<div className="mx-auto max-w-3xl p-6">
			<h1 className="text-xl font-bold">음성 재생성 테스트 (v70)</h1>
			<p className="mt-1 text-sm text-gray-500">
				음성재생성_대상_v70.xlsx 기반 문제 지문 {list.length}건. 재생 버튼을
				누르면 프로덕션 경로(/tts/listen/audio → Gemini → S3 캐시)로
				생성·재생됩니다. 180자 초과 라인은 서버가 문장 청크로 나눠 생성 후
				이어붙입니다(gemini.py). 캐시 덮어쓰기 재생성은 generate_tts_samples.py
				로 실행하고, 이 페이지는 재생성 결과 검증용입니다. 이전 목록은 버전별
				JSON으로 보존합니다.
			</p>

			<div className="mt-4 flex items-center gap-3">
				<button
					type="button"
					onClick={handleBulk}
					disabled={bulkRunning}
					className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
				>
					{bulkRunning ? "생성 중…" : "전체 미리 생성"}
				</button>
				<span className="text-sm text-gray-600">
					생성 완료 {doneCount}/{list.length}
					{errCount > 0 && (
						<span className="ml-2 text-red-600">실패 {errCount}</span>
					)}
				</span>
			</div>

			{Object.entries(grouped).map(([sheet, rows]) => (
				<section key={sheet} className="mt-6">
					<h2 className="mb-2 text-sm font-semibold text-gray-700">
						{SHEET_LABEL[sheet] ?? sheet} · {rows.length}건
					</h2>
					<ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
						{rows.map((s) => {
							const key = keyOf(s);
							const st = status[key] ?? "idle";
							const isPlaying = playingKey === key;
							return (
								<li key={key} className="flex items-start gap-3 px-3 py-2">
									<button
										type="button"
										onClick={() => handlePlay(s)}
										disabled={st === "loading"}
										className={`flex size-9 shrink-0 items-center justify-center rounded-full text-white ${
											isPlaying ? "bg-green-600" : "bg-gray-800"
										} disabled:opacity-40`}
										aria-label="재생"
									>
										{st === "loading" ? "…" : "▶"}
									</button>
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium">{s.label}</div>
										<div className="text-xs text-gray-400">
											id {s.id} · {s.sub} · voice: {s.voice}
										</div>
										{s.text !== s.label && (
											<div className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-700">
												{s.text}
											</div>
										)}
									</div>
									{st === "ready" && (
										<span className="text-xs text-green-600">생성됨</span>
									)}
									{st === "error" && (
										<span className="text-xs text-red-600">실패</span>
									)}
								</li>
							);
						})}
					</ul>
				</section>
			))}

			{/* 재생 종료·시퀀스 진행은 playSequential 이 audio.onended 로 직접 처리한다. */}
			{/* biome-ignore lint/a11y/useMediaCaption: playback-only hidden audio */}
			<audio ref={audioRef} className="hidden" />
		</div>
	);
}
