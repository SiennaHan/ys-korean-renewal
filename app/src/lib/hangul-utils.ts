// 초성/중성/종성의 순서 정의 (인덱스 맵)
const CHOSEONG_LIST = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

const JUNGSEONG_LIST = [
    'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
    'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
];

const JONGSEONG_LIST = [
    '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
    'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

const HANGUL_BASE = 0xAC00; // 44032
const JUNGSEONG_COUNT = 28; // 종성 개수 (받침 없음 포함)
const CHOSEONG_UNIT = 588;  // 21 * 28

/**
 * 초성, 중성, 종성 문자를 입력받아 하나의 한글 음절로 조합합니다.
 * @param {string} chosung 초성 문자
 * @param {string} jungsung 중성 문자
 * @param {string} [jongsung=''] 종성 문자 (선택 사항, 없으면 빈 문자열)
 * @returns {string} 조합된 한글 음절 문자
 */
export function combineHangul(chosung: string | undefined, jungsung: string | undefined, jongsung = '') {
	if (!chosung) return jungsung;
	if (!jungsung) return chosung;
	// 1. 각 자모의 인덱스 찾기
	const chosungIndex = CHOSEONG_LIST.indexOf(chosung);
	const jungsungIndex = JUNGSEONG_LIST.indexOf(jungsung);
	const jongsungIndex = JONGSEONG_LIST.indexOf(jongsung);

	console.log("combineHangul", `'${chosung}'`,chosungIndex,`'${jungsung}'`,jungsungIndex,`'${jongsung}'`,jongsungIndex)

	// 유효성 검사 (찾지 못하면 -1)
	if (chosungIndex === -1 || jungsungIndex === -1 || jongsungIndex === -1) {
			console.error('유효하지 않은 초성, 중성 또는 종성이 포함되어 있습니다.');
			// 합치지 못한 자모를 그대로 반환하거나 에러 처리를 할 수 있습니다.
			return chosung + jungsung + jongsung; 
	}

	// 2. 유니코드 공식에 따라 코드 포인트 계산
	const unicodeValue = HANGUL_BASE + 
												(chosungIndex * CHOSEONG_UNIT) + 
												(jungsungIndex * JUNGSEONG_COUNT) + 
												jongsungIndex;

	// 3. 코드 포인트를 문자열로 변환하여 반환
	return String.fromCharCode(unicodeValue);
}
