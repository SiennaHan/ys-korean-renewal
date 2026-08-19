import listenData from "./n3_listen_repeat.json";
import scriptData from "./n3_listen_script.json";
import lineData from "./n3_listen_script_line.json";

export interface ListenScript {
	id: number;
	book_id: number;
	chapter: number;
	seq: number;
	cd_track: string;
	audio_text: string;
}

export interface ListenScriptLine {
	id: number;
	book_id: number;
	chapter: number;
	script_id: number;
	seq: number;
	speaker: string;
	gender: string;
	text: string;
	/** 사전 생성된 음원의 화자 음성 (male/female) */
	voice: string;
}

export interface ListenQuestion {
	id: number;
	book_id: number;
	chapter: number;
	script_id: number;
	seq: number;
	question: string;
	type: "choice" | "ox" | "image";
	selection1: string;
	selection2: string;
	selection3: string;
	selection4: string;
	selection1_image: string;
	selection2_image: string;
	selection3_image: string;
	selection4_image: string;
	answer_index: number;
}

export const listenScriptList: ListenScript[] = scriptData as ListenScript[];
export const listenScriptLineList: ListenScriptLine[] =
	lineData as ListenScriptLine[];
export const listenQuestionList: ListenQuestion[] =
	listenData as ListenQuestion[];

/** 특정 book/chapter에 해당하는 듣기 문제 목록 (script_id, seq 순) */
export function getListenQuestions(
	bookId: number,
	chapter: number,
): ListenQuestion[] {
	return listenQuestionList
		.filter((q) => q.book_id === bookId && q.chapter === chapter)
		.sort((a, b) => a.script_id - b.script_id || a.seq - b.seq);
}

/** 특정 지문의 발화 라인 목록 (seq 순) */
export function getScriptLines(scriptId: number): ListenScriptLine[] {
	return listenScriptLineList
		.filter((l) => l.script_id === scriptId)
		.sort((a, b) => a.seq - b.seq);
}

/** 사전 생성된 듣기 음원 경로: /audio/listen/{scriptId}/{seq}.mp3 */
export function getListenAudioPath(scriptId: number, seq: number): string {
	return `/audio/listen/${scriptId}/${seq}.mp3`;
}

/** 이미지 경로 생성: /textbook/{bookId}/{filename} (파일명에 과·페이지 인코딩됨) */
export function getQuestionImagePath(bookId: number, filename: string): string {
	return `/textbook/${bookId}/${filename}`;
}
