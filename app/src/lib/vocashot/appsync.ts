import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { env } from "@/config/env";
import type {
	Room,
	Player,
	Meteor,
	AnswerRecord,
	VocabQuestion,
} from "./types";

Amplify.configure({
	API: {
		GraphQL: {
			endpoint: env.APPSYNC_ENDPOINT,
			region: env.APPSYNC_REGION,
			defaultAuthMode: "apiKey",
			apiKey: env.APPSYNC_API_KEY,
		},
	},
});

const client = generateClient();

// ── Queries ──

export async function getRoom(pin: string): Promise<Room | null> {
	const query = /* GraphQL */ `
		query GetRoom($pin: String!) {
			getRoom(pin: $pin) {
				pin
				config {
					pin maxPlayers inputMode gameDurationSec difficultySpeed
					initialHearts wrongPenaltyEnabled goldenMeteorEnabled studentUiLanguage
					presetLabel customCount
					questions { id image english answer wrong }
				}
				runtime {
					phase status createdAt expiresAt startedAt endsAt
					remainingHearts maxHearts questionLoopIndex
				}
				createdBy schoolCode
			}
		}
	`;
	const result = await client.graphql({ query, variables: { pin } });
	return (result as { data: { getRoom: Room | null } }).data.getRoom;
}

export async function listPlayers(pin: string): Promise<Player[]> {
	const query = /* GraphQL */ `
		query ListPlayers($pin: String!) {
			listPlayers(pin: $pin) {
				pin playerId nickname score joinedAt lastAnswerAt language isConnected
			}
		}
	`;
	const result = await client.graphql({ query, variables: { pin } });
	return (result as { data: { listPlayers: Player[] } }).data.listPlayers;
}

export async function listMeteors(pin: string): Promise<Meteor[]> {
	const query = /* GraphQL */ `
		query ListMeteors($pin: String!) {
			listMeteors(pin: $pin) {
				pin meteorId questionIndex spawnedAt expiresAt status
				isGolden goldenBonusType destroyedByPlayerId destroyedAt
			}
		}
	`;
	const result = await client.graphql({ query, variables: { pin } });
	return (result as { data: { listMeteors: Meteor[] } }).data.listMeteors;
}

export async function listRoomsByCreator(
	createdBy: string,
): Promise<Room[]> {
	const query = /* GraphQL */ `
		query ListRoomsByCreator($createdBy: String!) {
			listRoomsByCreator(createdBy: $createdBy) {
				pin
				config { pin maxPlayers inputMode gameDurationSec difficultySpeed initialHearts wrongPenaltyEnabled goldenMeteorEnabled studentUiLanguage presetLabel customCount questions { id image english answer wrong } }
				runtime { phase status createdAt expiresAt startedAt endsAt remainingHearts maxHearts questionLoopIndex }
				createdBy schoolCode
			}
		}
	`;
	const result = await client.graphql({
		query,
		variables: { createdBy },
	});
	return (result as { data: { listRoomsByCreator: Room[] } }).data
		.listRoomsByCreator;
}

// ── Mutations ──

export interface CreateRoomInput {
	pin: string;
	maxPlayers: number;
	inputMode: string;
	gameDurationSec: number;
	difficultySpeed: string;
	initialHearts: number;
	wrongPenaltyEnabled: boolean;
	goldenMeteorEnabled: boolean;
	studentUiLanguage: string;
	questions: VocabQuestion[];
	createdBy: string;
	schoolCode: string;
	presetLabel?: string | null;
	customCount?: number | null;
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
	const mutation = /* GraphQL */ `
		mutation CreateRoom($input: CreateRoomInput!) {
			createRoom(input: $input) {
				pin
				config { pin maxPlayers inputMode gameDurationSec difficultySpeed initialHearts wrongPenaltyEnabled goldenMeteorEnabled studentUiLanguage presetLabel customCount questions { id image english answer wrong } }
				runtime { phase status createdAt expiresAt startedAt endsAt remainingHearts maxHearts questionLoopIndex }
				createdBy schoolCode
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { input },
	});
	return (result as { data: { createRoom: Room } }).data.createRoom;
}

export async function deleteRoom(pin: string): Promise<boolean> {
	const mutation = /* GraphQL */ `
		mutation DeleteRoom($pin: String!) {
			deleteRoom(pin: $pin)
		}
	`;
	await client.graphql({ query: mutation, variables: { pin } });
	return true;
}

export async function startGame(
	pin: string,
	endsAt: number,
): Promise<Room> {
	const mutation = /* GraphQL */ `
		mutation StartGame($pin: String!, $endsAt: Float!) {
			startGame(pin: $pin, endsAt: $endsAt) {
				pin
				config { pin maxPlayers inputMode gameDurationSec difficultySpeed initialHearts wrongPenaltyEnabled goldenMeteorEnabled studentUiLanguage presetLabel customCount questions { id image english answer wrong } }
				runtime { phase status createdAt expiresAt startedAt endsAt remainingHearts maxHearts questionLoopIndex }
				createdBy schoolCode
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { pin, endsAt },
	});
	return (result as { data: { startGame: Room } }).data.startGame;
}

export async function resetRoom(pin: string): Promise<Room> {
	const mutation = /* GraphQL */ `
		mutation ResetRoom($pin: String!) {
			resetRoom(pin: $pin) {
				pin
				config { pin maxPlayers inputMode gameDurationSec difficultySpeed initialHearts wrongPenaltyEnabled goldenMeteorEnabled studentUiLanguage presetLabel customCount questions { id image english answer wrong } }
				runtime { phase status createdAt expiresAt startedAt endsAt remainingHearts maxHearts questionLoopIndex }
				createdBy schoolCode
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { pin },
	});
	return (result as { data: { resetRoom: Room } }).data.resetRoom;
}

export async function endGame(
	pin: string,
	status: string,
): Promise<Room> {
	const mutation = /* GraphQL */ `
		mutation EndGame($pin: String!, $status: String!) {
			endGame(pin: $pin, status: $status) {
				pin
				config { pin maxPlayers inputMode gameDurationSec difficultySpeed initialHearts wrongPenaltyEnabled goldenMeteorEnabled studentUiLanguage presetLabel customCount questions { id image english answer wrong } }
				runtime { phase status createdAt expiresAt startedAt endsAt remainingHearts maxHearts questionLoopIndex }
				createdBy schoolCode
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { pin, status },
	});
	return (result as { data: { endGame: Room } }).data.endGame;
}

export interface SpawnMeteorInput {
	pin: string;
	meteorId: string;
	questionIndex: number;
	spawnedAt: number;
	expiresAt: number;
	isGolden: boolean;
	goldenBonusType: string | null;
}

export async function spawnMeteor(
	input: SpawnMeteorInput,
): Promise<Meteor> {
	const mutation = /* GraphQL */ `
		mutation SpawnMeteor($input: SpawnMeteorInput!) {
			spawnMeteor(input: $input) {
				pin meteorId questionIndex spawnedAt expiresAt status
				isGolden goldenBonusType destroyedByPlayerId destroyedAt
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { input },
	});
	return (result as { data: { spawnMeteor: Meteor } }).data.spawnMeteor;
}

export async function missMeteor(
	pin: string,
	meteorId: string,
): Promise<Meteor> {
	const mutation = /* GraphQL */ `
		mutation MissMeteor($pin: String!, $meteorId: String!) {
			missMeteor(pin: $pin, meteorId: $meteorId) {
				pin meteorId questionIndex spawnedAt expiresAt status
				isGolden goldenBonusType destroyedByPlayerId destroyedAt
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { pin, meteorId },
	});
	return (result as { data: { missMeteor: Meteor } }).data.missMeteor;
}

export async function kickPlayer(
	pin: string,
	playerId: string,
): Promise<Player> {
	const mutation = /* GraphQL */ `
		mutation KickPlayer($pin: String!, $playerId: String!) {
			kickPlayer(pin: $pin, playerId: $playerId) {
				pin playerId nickname score joinedAt language isConnected
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { pin, playerId },
	});
	return (result as { data: { kickPlayer: Player } }).data.kickPlayer;
}

export async function joinRoom(
	pin: string,
	nickname: string,
	language?: string,
): Promise<Player> {
	const mutation = /* GraphQL */ `
		mutation JoinRoom($pin: String!, $nickname: String!, $language: String) {
			joinRoom(pin: $pin, nickname: $nickname, language: $language) {
				pin playerId nickname score joinedAt lastAnswerAt language isConnected
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { pin, nickname, language },
	});
	return (result as { data: { joinRoom: Player } }).data.joinRoom;
}

export async function submitAnswer(input: {
	pin: string;
	meteorId: string;
	playerId: string;
	answerText: string;
}): Promise<AnswerRecord> {
	const mutation = /* GraphQL */ `
		mutation SubmitAnswer($input: SubmitAnswerInput!) {
			submitAnswer(input: $input) {
				pin meteorId playerId submittedAt answerText result scoreDelta
				playerScore remainingHearts meteorStatus
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { input },
	});
	return (result as { data: { submitAnswer: AnswerRecord } }).data
		.submitAnswer;
}

export async function updateRoomHearts(
	pin: string,
	remainingHearts: number,
): Promise<Room> {
	const mutation = /* GraphQL */ `
		mutation UpdateRoomHearts($pin: String!, $remainingHearts: Int!) {
			updateRoomHearts(pin: $pin, remainingHearts: $remainingHearts) {
				pin
				config { pin maxPlayers inputMode gameDurationSec difficultySpeed initialHearts wrongPenaltyEnabled goldenMeteorEnabled studentUiLanguage presetLabel customCount questions { id image english answer wrong } }
				runtime { phase status createdAt expiresAt startedAt endsAt remainingHearts maxHearts questionLoopIndex }
				createdBy schoolCode
			}
		}
	`;
	const result = await client.graphql({
		query: mutation,
		variables: { pin, remainingHearts },
	});
	return (result as { data: { updateRoomHearts: Room } }).data
		.updateRoomHearts;
}

// ── Subscriptions ──

export function subscribeRoomUpdate(
	pin: string,
	callback: (room: Room) => void,
) {
	const query = /* GraphQL */ `
		subscription OnRoomUpdate($pin: String!) {
			onRoomUpdate(pin: $pin) {
				pin
				config { pin maxPlayers inputMode gameDurationSec difficultySpeed initialHearts wrongPenaltyEnabled goldenMeteorEnabled studentUiLanguage presetLabel customCount questions { id image english answer wrong } }
				runtime { phase status createdAt expiresAt startedAt endsAt remainingHearts maxHearts questionLoopIndex }
				createdBy schoolCode
			}
		}
	`;
	const sub = client.graphql({ query, variables: { pin } });
	return (sub as { subscribe: (opts: { next: (val: { data: { onRoomUpdate: Room } }) => void }) => { unsubscribe: () => void } }).subscribe({
		next: (val) => {
			if (val.data?.onRoomUpdate) callback(val.data.onRoomUpdate);
		},
	});
}

export function subscribePlayerJoin(
	pin: string,
	callback: (player: Player) => void,
) {
	const query = /* GraphQL */ `
		subscription OnPlayerJoin($pin: String!) {
			onPlayerJoin(pin: $pin) {
				pin playerId nickname score joinedAt lastAnswerAt language isConnected
			}
		}
	`;
	const sub = client.graphql({ query, variables: { pin } });
	return (sub as { subscribe: (opts: { next: (val: { data: { onPlayerJoin: Player } }) => void }) => { unsubscribe: () => void } }).subscribe({
		next: (val) => {
			if (val.data?.onPlayerJoin) callback(val.data.onPlayerJoin);
		},
	});
}

export function subscribePlayerUpdate(
	pin: string,
	callback: (player: Player) => void,
) {
	const query = /* GraphQL */ `
		subscription OnPlayerUpdate($pin: String!) {
			onPlayerUpdate(pin: $pin) {
				pin playerId nickname score joinedAt lastAnswerAt language isConnected
			}
		}
	`;
	const sub = client.graphql({ query, variables: { pin } });
	return (sub as { subscribe: (opts: { next: (val: { data: { onPlayerUpdate: Player } }) => void }) => { unsubscribe: () => void } }).subscribe({
		next: (val) => {
			if (val.data?.onPlayerUpdate) callback(val.data.onPlayerUpdate);
		},
	});
}

export function subscribeMeteorSpawned(
	pin: string,
	callback: (meteor: Meteor) => void,
) {
	const query = /* GraphQL */ `
		subscription OnMeteorSpawned($pin: String!) {
			onMeteorSpawned(pin: $pin) {
				pin meteorId questionIndex spawnedAt expiresAt status
				isGolden goldenBonusType destroyedByPlayerId destroyedAt
			}
		}
	`;
	const sub = client.graphql({ query, variables: { pin } });
	return (sub as { subscribe: (opts: { next: (val: { data: { onMeteorSpawned: Meteor } }) => void }) => { unsubscribe: () => void } }).subscribe({
		next: (val) => {
			if (val.data?.onMeteorSpawned) callback(val.data.onMeteorSpawned);
		},
	});
}

export function subscribeMeteorUpdate(
	pin: string,
	callback: (meteor: Meteor) => void,
) {
	const query = /* GraphQL */ `
		subscription OnMeteorUpdate($pin: String!) {
			onMeteorUpdate(pin: $pin) {
				pin meteorId questionIndex spawnedAt expiresAt status
				isGolden goldenBonusType destroyedByPlayerId destroyedAt
			}
		}
	`;
	const sub = client.graphql({ query, variables: { pin } });
	return (sub as { subscribe: (opts: { next: (val: { data: { onMeteorUpdate: Meteor } }) => void }) => { unsubscribe: () => void } }).subscribe({
		next: (val) => {
			if (val.data?.onMeteorUpdate) callback(val.data.onMeteorUpdate);
		},
	});
}

export function subscribeAnswerSubmitted(
	pin: string,
	callback: (answer: AnswerRecord) => void,
) {
	const query = /* GraphQL */ `
		subscription OnAnswerSubmitted($pin: String!) {
			onAnswerSubmitted(pin: $pin) {
				pin meteorId playerId submittedAt answerText result scoreDelta
				playerScore remainingHearts meteorStatus
			}
		}
	`;
	const sub = client.graphql({ query, variables: { pin } });
	return (sub as { subscribe: (opts: { next: (val: { data: { onAnswerSubmitted: AnswerRecord } }) => void }) => { unsubscribe: () => void } }).subscribe({
		next: (val) => {
			if (val.data?.onAnswerSubmitted)
				callback(val.data.onAnswerSubmitted);
		},
	});
}
