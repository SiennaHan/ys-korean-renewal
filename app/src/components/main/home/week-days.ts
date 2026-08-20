import { useTranslation } from "react-i18next";

/** 월요일부터. 번역이 비거나 모양이 어긋나도 화면이 죽지 않게 여기서 막는다 */
const FALLBACK = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * 주간 출석과 주간 활동이 같은 요일 이름을 쓴다.
 *
 * i18n 의 배열 반환은 값이 배열이라는 보장을 타입으로 주지 못한다 —
 * 한 번 문자열이 와서 홈이 통째로 흰 화면이 됐다. 여기서 한 번만 확인한다.
 */
export function useWeekDays(): string[] {
	const { t } = useTranslation();
	const days = t("home.days", { returnObjects: true });
	return Array.isArray(days) && days.length === 7
		? (days as string[])
		: FALLBACK;
}
