import type { InstructedItem } from "./instruction";

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

export interface ListenQuestion extends InstructedItem {
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

/*
 * **번들의 배열 셋을 걷었다**(2026-08-31 · DEV-05). 듣기는 지문·줄·문항 **표 셋**을
 * 쓰는 가장 복잡한 활동인데, 서버가 그 셋을 한 묶음으로 준다
 * (`useChapterContent(bookId, chapterSeq, "listen-answer")` → `scripts`·`lines`·`questions`).
 *
 * 아래 함수들은 **거르고 정렬하는 일만** 한다 — 그 과의 것만 오므로 급·과로 거를
 * 것이 없다. 순수 함수가 되어 시험하기도 쉬워졌다.
 */

/** 듣기 문제를 지문·순서대로 세운다 */
export function getListenQuestions(
	questions: ListenQuestion[],
): ListenQuestion[] {
	return [...questions].sort(
		(a, b) => a.script_id - b.script_id || a.seq - b.seq,
	);
}

/** 그 지문의 발화 줄 (seq 순) */
export function getScriptLines(
	lines: ListenScriptLine[],
	scriptId: number,
): ListenScriptLine[] {
	return lines
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
