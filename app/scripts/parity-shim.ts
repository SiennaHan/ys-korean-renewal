/** i18n 이 모듈 최상단에서 localStorage 를 읽는다. node 에는 없으므로 먼저 깔아 준다 */
(globalThis as unknown as { localStorage: Storage }).localStorage = {
	getItem: () => "ko",
	setItem: () => {},
	removeItem: () => {},
	clear: () => {},
	key: () => null,
	length: 0,
} as Storage;
