export type InputMode = "easy" | "hard";
export type DifficultySpeed = "slow" | "normal" | "fast";
export type RoomPhase = "LOBBY" | "COUNTDOWN" | "PLAYING" | "ENDED";
export type RoomStatus = "WAITING" | "PLAYING" | "SUCCESS" | "FAIL";
export type LanguageCode = "en" | "ko";
export type GoldenBonusType = "heart" | "score";

export type VocabQuestion = {
	id: number;
	image?: string;
	english?: string;
	answer: string;
	wrong: string[];
};

export type RoomConfig = {
	pin: string;
	maxPlayers: number;
	inputMode: InputMode;
	gameDurationSec: number;
	difficultySpeed: DifficultySpeed;
	initialHearts: number;
	wrongPenaltyEnabled: boolean;
	goldenMeteorEnabled: boolean;
	studentUiLanguage: LanguageCode;
	questions: VocabQuestion[];
	presetLabel?: string | null;
	customCount?: number | null;
};

export type RoomRuntime = {
	phase: RoomPhase;
	status: RoomStatus;
	createdAt: number;
	expiresAt: number;
	startedAt: number | null;
	endsAt: number | null;
	remainingHearts: number;
	maxHearts: number;
	questionLoopIndex: number;
};

export type Room = {
	pin: string;
	config: RoomConfig;
	runtime: RoomRuntime;
	createdBy: string;
	schoolCode: string;
};

export type Player = {
	pin: string;
	playerId: string;
	nickname: string;
	score: number;
	joinedAt: number;
	lastAnswerAt: number | null;
	language: LanguageCode;
	isConnected: boolean;
};

export type MeteorStatus = "FALLING" | "DESTROYED" | "MISSED";

export type Meteor = {
	pin: string;
	meteorId: string;
	questionIndex: number;
	spawnedAt: number;
	expiresAt: number;
	status: MeteorStatus;
	isGolden: boolean;
	goldenBonusType: string | null;
	destroyedByPlayerId: string | null;
	destroyedAt: number | null;
};

export type AnswerResult = "FIRST" | "GRACE" | "WRONG";

export type AnswerRecord = {
	pin: string;
	meteorId: string;
	playerId: string;
	submittedAt: number;
	answerText: string;
	result: AnswerResult;
	scoreDelta: number;
	playerScore: number | null;
	remainingHearts: number | null;
	meteorStatus: string | null;
};
