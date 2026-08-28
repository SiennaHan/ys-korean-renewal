export const env = {
	ADMIN_API_URL: process.env.PUBLIC_ADMIN_API_URL || "",
	/**
	 * 학생 앱의 주소. 코드 인쇄 카드의 가입 링크와 QR 에 쓴다.
	 * **비면 카드에 "가입 주소가 설정되지 않았습니다" 를 적는다** —
	 * 빈 링크가 인쇄돼 학생 손에 가는 것보다 낫다.
	 */
	STUDENT_APP_URL: process.env.PUBLIC_STUDENT_APP_URL || "",
	APPSYNC_ENDPOINT: process.env.PUBLIC_APPSYNC_ENDPOINT || "",
	APPSYNC_REGION: process.env.PUBLIC_APPSYNC_REGION || "ap-northeast-2",
	APPSYNC_API_KEY: process.env.PUBLIC_APPSYNC_API_KEY || "",
} as const;
