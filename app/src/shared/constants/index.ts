export const DEFAULT_PAGE_SIZE = 20 as const;

export const M_HEIGHT = 667 as const;
export const M_WIDTH = 375 as const;
export const T_HEIGHT = 1024 as const;
export const T_WIDTH = 768 as const;

/**
 * 월 구독료(원). **`PD-01` 확정 2026-09-04 — 월 7,900원 · KRW 단일 · 부가세 포함.**
 *
 * **숫자를 여기 한 곳에만 둔다.** i18n 다섯 파일에 완성된 금액을 박으면 가격이 바뀔 때
 * 다섯 곳을 고쳐야 하고, 한 곳을 빠뜨리면 그 언어만 옛 값을 보여 준다 — 이 저장소가
 * 「기계가 세는 숫자는 주인 하나에만」으로 정한 것과 같은 이유다.
 * i18n 은 **자리만** 갖는다(`{{amount}}` + 통화 표기).
 *
 * **`paywall-panel.tsx` 에 있던 것을 2026-09-09 에 여기로 옮겼다** — 런칭 이벤트
 * 배너(홈)가 「11월 1일부터는 월 7,900원」을 말하기로 정해지면서(시안 G-1 (C) 승인)
 * 같은 숫자를 읽는 화면이 둘이 됐다. 페이월 컴포넌트에서 가져오면 홈이 페이월
 * 모듈(과 그것이 끌고 오는 인증 컨텍스트)에 매달린다.
 */
export const MONTHLY_PRICE_KRW = 7900 as const;
