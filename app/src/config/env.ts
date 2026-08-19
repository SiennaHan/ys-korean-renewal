// src/config/env.ts
export const env = {
	KOREAN_API_URL: process.env.PUBLIC_KOREAN_API_URL || "",
	SPEAK_API_URL: process.env.PUBLIC_SPEAK_API_URL || "",
	WRITE_API_URL: process.env.PUBLIC_WRITE_API_URL || "",
	RES_URL_ROOT: process.env.PUBLIC_RES_URL_ROOT || "",
	APPSYNC_ENDPOINT: process.env.PUBLIC_APPSYNC_ENDPOINT || "",
	APPSYNC_REGION: process.env.PUBLIC_APPSYNC_REGION || "ap-northeast-2",
	APPSYNC_API_KEY: process.env.PUBLIC_APPSYNC_API_KEY || "",
	QR_WEB_REDIRECT_URL: process.env.PUBLIC_QR_WEB_REDIRECT_URL || "/",
} as const;

export type Env = typeof env;
