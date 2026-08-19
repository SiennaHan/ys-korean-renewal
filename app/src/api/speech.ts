import { api } from "./api";

interface SpeechEvaluateResult {
	pass: boolean;
	reason: string;
}

interface GenerateLineResult {
	text: string;
}

interface ScenarioTurnInput {
	turn_seq: number;
	ko: string;
	speaker: "ai" | "user";
}

interface GenerateScenarioResult {
	turns: { turn_seq: number; text: string }[];
}

/**
 * OpenAI 기반 발화 유사도 평가
 * @param expected 기대 문장 (정답)
 * @param actual STT 결과 (사용자 발화)
 */
export async function evaluateSpeech(
	expected: string,
	actual: string,
): Promise<SpeechEvaluateResult> {
	try {
		const res = await api.post<SpeechEvaluateResult>("/speech/evaluate", {
			expected,
			actual,
		});
		return res.data ?? { pass: false, reason: "응답 없음" };
	} catch {
		return { pass: false, reason: "평가 실패" };
	}
}

/**
 * 템플릿 문장에서 구체적 한국어 문장 생성
 * @param template "[나라] 사람이에요." 같은 템플릿
 * @param context 이전 대화 맥락 (선택)
 */
export async function generateLine(
	template: string,
	context?: string,
): Promise<string> {
	try {
		const res = await api.post<GenerateLineResult>("/speech/generate-line", {
			template,
			context: context ?? "",
		});
		return res.data?.text ?? template;
	} catch {
		return template;
	}
}

/**
 * 시나리오 전체 턴을 한 세트로 생성 (대화 맥락 일관성 유지)
 * @param turns 시나리오의 모든 턴 목록
 * @returns turn_seq → 생성된 문장 매핑
 */
export async function generateScenario(
	turns: ScenarioTurnInput[],
): Promise<Record<number, string>> {
	try {
		const res = await api.post<GenerateScenarioResult>(
			"/speech/generate-scenario",
			{ turns },
		);
		const map: Record<number, string> = {};
		if (res.data?.turns) {
			for (const t of res.data.turns) {
				map[t.turn_seq] = t.text;
			}
		}
		return map;
	} catch {
		return {};
	}
}

/**
 * 템플릿 기반 유연한 발화 평가 (플레이스홀더/대체문 허용)
 * @param template "[나라] 사람이에요." 같은 템플릿
 * @param actual STT 결과 (사용자 발화)
 */
export async function evaluateSpeechFlexible(
	template: string,
	actual: string,
): Promise<SpeechEvaluateResult> {
	try {
		const res = await api.post<SpeechEvaluateResult>(
			"/speech/evaluate-flexible",
			{ template, actual },
		);
		return res.data ?? { pass: false, reason: "응답 없음" };
	} catch {
		return { pass: false, reason: "평가 실패" };
	}
}
