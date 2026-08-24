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
					// 프로덕션 빌드에서 테스트 라우트를 뺀다 (dev_spec_v1 §4).
					// 개발에서는 그대로 두어야 /test/** 로 디버깅할 수 있다.
					//
					// 패턴은 경로가 아니라 **한 칸의 이름**과 비교된다 —
					// router-generator 의 getRouteNodes 가 d.name.match(re) 를 한다.
					// 그래서 "routes/test/" 는 슬래시 때문에 어떤 이름과도 안 맞았고,
					// 2026-08-24 까지 테스트 라우트 아홉이 프로덕션에 그대로 실려 나갔다.
					// ^test$ 로 디렉터리 이름만 정확히 집는다.
					//
					// 빈 스텁 넷은 이 방법으로 뺄 수 없어서 파일을 지웠다 —
					// flashcard.tsx 가 스텁·routes/learn/·routes/test/ 셋에 다 있어서
					// 이름으로 거르면 진짜 학습 화면까지 사라진다.
					routeFileIgnorePattern:
						process.env.NODE_ENV === "production" ? "^test$" : undefined,
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
