import { useTranslation } from "react-i18next";

/**
 * 지시문은 원장이 쥔다.
 *
 * 문항마다 다르기 때문이다 — 같은 읽기 활동이어도 객관식과 O/X 의 지시문이
 * 다르고, 원장은 그것을 문항 단위로 5개 언어까지 들고 있다. i18n 키 하나로는
 * 그 구분이 표현되지 않아서 실제로 O/X 문항 177개가 객관식 지시문을 달고
 * 있었다. i18n 의 activity.instr* 는 원장이 비어 있을 때의 대비책으로 남는다.
 */

/** 원장은 jp·cn 을 쓰고 앱 로케일은 ja·zh 를 쓴다 */
const LEDGER_LANG: Record<string, string> = {
	ko: "ko",
	en: "en",
	ja: "jp",
	zh: "cn",
	vi: "vi",
};

/** 원장에서 나온 문항이 갖는 지시문 열 */
export interface InstructedItem {
	instruction_ko?: string;
	instruction_en?: string;
	instruction_jp?: string;
	instruction_cn?: string;
	instruction_vi?: string;
	/** n3 만 남아 있는 옛 단일 열 */
	instruction?: string;
}

function pick(item: InstructedItem | undefined, lang: string): string {
	if (!item) return "";
	const suffix = LEDGER_LANG[lang.split("-")[0]] ?? "en";
	const value = (item as Record<string, unknown>)[`instruction_${suffix}`];
	if (typeof value === "string" && value.trim()) return value.trim();
	return "";
}

/**
 * 화면은 두 줄을 쓴다 — 배울 한국어와 이해를 돕는 번역.
 * 브리핑·리포트 제목과 같은 방식이다.
 *
 * @param fallbackKey 원장이 비었을 때 쓸 i18n 키 (activity.instr*)
 */
export function useInstruction(
	item: InstructedItem | undefined,
	fallbackKey: string,
): { ko: string; translated: string } {
	const { t, i18n } = useTranslation();
	const lang = i18n.language || "ko";

	const ko = pick(item, "ko") || item?.instruction?.trim() || t(fallbackKey);
	// 한국어 화면에서는 아래 줄이 같은 말을 되풀이하므로 비운다
	const translated = lang.startsWith("ko") ? "" : pick(item, lang);

	return { ko, translated };
}
