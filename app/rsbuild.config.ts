import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";

export default defineConfig({
	plugins: [pluginReact()],
	source: {
		entry: { index: "./src/main.tsx" },
	},
	html: {
		template: "./index.html",
	},
	tools: {
		rspack: {
			plugins: [
				TanStackRouterRspack({
					target: "react",
					autoCodeSplitting: true,
					// 프로덕션 빌드에서 테스트 라우트를 뺀다 (Phase 1 §4).
					// 개발에서는 그대로 두어야 /test/** 로 디버깅할 수 있다.
					routeFileIgnorePattern:
						process.env.NODE_ENV === "production" ? "routes/test/" : undefined,
				}),
			],
		},
	},
	// @ts-ignore
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ["postcss-loader"],
				type: "css",
			},
		],
	},
});
