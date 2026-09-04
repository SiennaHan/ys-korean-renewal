export interface ServerResponse<T> {
	result: boolean;
	code: number;
	message: string | null;
	data: T | null;
}

export interface GuestToken {
	status: "new" | "exist";
	token: string;
	guestId: string;
}

export interface LoginToken {
	token: string;
	user: {
		id: number;
		email: string;
		name: string;
		role: string;
		schoolCode: string | null;
	};
}

export interface LoginError {
	error: string;
}

export interface KoChatRequest {
	dialogId: string;
	chatId: number;
	msg: string;
	lang?: string;
	/** 녹음 원본(base64). 있으면 서버가 발음 축을 실제로 잰다. 키보드 입력은 없다 */
	audio?: string;
	/** STT 결과를 학습자가 고쳤나 — 고친 발화는 발음 분모에서 뺀다 */
	edited?: boolean;
}

export interface KoChatMissionResponse {
	chat: KoChat;
	first_msg: string;
	mission: KoDialogMissionItem[];
}

export interface KoChat {
	id: number;
	user_id: string;
	book_id: number;
	dialog_id: string;
	idx: number;
	is_deleted: false;
	deleted_at: null;
	summary: string;
	updated_at: Date;
	created_at: Date;
	status: string;
	report: string;
	completed_missions: string[];
}

export interface KoDialogMissionItem {
	mission: string;
	descr: string;
}

export interface CheckMission {
	is_logic_valid: boolean;
	completed_missions: string[];

	status: string;
	is_context_natural: boolean;
	is_vocabulary_natural: boolean;
	is_grammar_correct: boolean;
	is_pronunciation_correct: boolean;

	feedback: string;
	recommend_example: string;
	// description: string;
	is_all_natural: boolean;
	/**
	 * 음향 발음 점수. **`is_pronunciation_correct` 와 다른 것이다** — 그쪽은
	 * 「표기(맞춤법)」이고 이쪽이 실제 소리다.
	 *
	 * `measured: false` 이면 못 잰 것이다(키보드 입력 · 발음평가 비활성 · 타임아웃).
	 * **0점이 아니다** — 리포트가 분모에서 빼야 한다.
	 */
	pron?: {
		measured: boolean;
		reason?: string;
		score?: number;
		weakWords?: { text?: string; score?: number }[];
		edited?: boolean;
	};
}

export interface MsgResponse {
	msgs: ChatItem[];
	feedbacks: FeedbackItem[];
}

export interface ChatItem {
	id: number;
	chat_id: number;
	is_bot: boolean;
	msg: string;
	user_id: string;
	created_at: Date;
}

export interface QuestionContentItem {
	type: string;
	text: string;
}

export interface QuestionItem {
	role: string;
	content: QuestionContentItem[];
}

export interface FeedbackItem {
	id: number;
	chat_id: number;
	user_id: string;
	question: QuestionItem;
	answer: CheckMission;
	created_at: Date;
}

export interface ChatResponse {
	chat_id: number;
	answer: string;
}

export interface TranslateResponse {
	translated: string;
}

export interface ReportResponse {
	chat: KoChat;
	feedbacks: FeedbackItem[];
}

export interface ReportItem {
	id?: number;
	category: string;
	target_id: string;

	error_code?: string;
	error_msg?: string;
	/** 검색어(진단용) — 정렬·제외 키가 아니다 */
	content?: string;
	/** 구간 시작 초 · 검색에 걸린 대본 줄 — 영상 단위 신고는 둘 다 없다 (DEV-02) */
	segment_start?: number;
	matched_line?: string;
	/** 슬랙 알림에만 쓴다 — 서버 컬럼이 아니다 */
	title?: string;
	clip_category?: string;
	user_id?: string | null;
	created_at?: Date;
}

// flashcard
export interface UserFlashcardRequest {
	bookId: number;
	flashcardId: number;
	cardType: string;
}

export interface UserFlashcard {
	id: number;
	user_id: string;
	book_id: number;
	flashcard_id: number;
	card_type: string;
	known: number;
	unknown: number;
	status: string;
	updated_at: Date;
}

// flashcard word
export interface UserFlashcardWordRequest {
	flashcardId: number;
	cardType: string;
	cardId: string;
	status: string;
}

export interface UserFlashcardWord {
	id: number;
	user_id: string;
	flashcard_id: number;
	card_type: string;
	card_id: string;
	status: string;
	updated_at: Date;
}

export interface UserFlashcardStatusRequest {
	flashcardId: number;
	cardType: string;
	status: string;
}

// learning record
export interface LearningRecordRequest {
	bookId: number;
	chapterSeq: number;
	menuType: string;
	questionId: number;
	selectedAnswer: string;
	isCorrect: boolean;
	/** 자모처럼 한 과 안에서 갈래가 갈리는 활동의 하위 번호 */
	sub?: number;
	/** 안 풀고 넘어간 것. 오답과 다른 이유로 다시 풀기에 들어간다 */
	skipped?: boolean;
	/**
	 * **다시 풀기 세션에서 온 저장인가.** 서버가 이걸 봐야 큐에서 뺀다
	 * (`business/learning_record.py`). 안 보내면 맞혀도 큐에 그대로 남아
	 * 홈의 「다시 풀 문항」이 영원히 줄지 않는다 — 실제로 그랬다(2026-08-26).
	 */
	review?: boolean;
}

export interface LearningRecord {
	id: number;
	user_id: string;
	book_id: number;
	chapter_seq: number;
	menu_type: string;
	question_id: number;
	selected_answer: string | null;
	is_correct: boolean;
	created_at: string;
	updated_at: string;
}

export interface LearningProgress {
	[menuType: string]: {
		total: number;
		correct: number;
	};
}

// game progress
export interface GameProgressRequest {
	gameName: string;
	stageId: string;
	score?: number | null;
	extra?: Record<string, unknown> | null;
	completed?: boolean;
}

export interface GameProgressRecord {
	id: number;
	user_id: string;
	game_name: string;
	stage_id: string;
	score: number | null;
	extra_data: string | null;
	extra: Record<string, unknown> | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}
