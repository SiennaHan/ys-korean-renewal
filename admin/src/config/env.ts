export const env = {
	ADMIN_API_URL: process.env.PUBLIC_ADMIN_API_URL || "",
	APPSYNC_ENDPOINT: process.env.PUBLIC_APPSYNC_ENDPOINT || "",
	APPSYNC_REGION: process.env.PUBLIC_APPSYNC_REGION || "ap-northeast-2",
	APPSYNC_API_KEY: process.env.PUBLIC_APPSYNC_API_KEY || "",
} as const;
