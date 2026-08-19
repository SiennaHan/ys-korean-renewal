export interface ServerResponse<T> {
	result: boolean;
	code: number;
	message: string | null;
	data: T | null;
}

export interface GuestToken {
	status: 'new' | 'exist';
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
	dialogId: string
	chatId: number
	msg: string
	lang?: string
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
}

export interface MsgResponse {
	msgs: ChatItem[]
	feedbacks: FeedbackItem[]
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
	feedbacks: FeedbackItem [];
}

export interface ReportItem {
	id?: number;
	category: string;
	target_id: string;

	error_code?: string;
	error_msg?: string;
	content?: string;
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