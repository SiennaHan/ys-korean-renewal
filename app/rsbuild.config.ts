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
					// routeFileIgnorePattern 은 쓰지 않는다.
					// 2026-08-24 에 src/routes/test/ 아홉 개를 지워서 프로덕션에서 뺄 것이
					// 남지 않았다. 환경마다 라우트 트리가 갈리지 않는 것이 이 설정의 값어치다 —
					// 갈리면 생성물 routeTree.gen.ts 를 어느 판으로 커밋할지가 문제가 된다.
					//
					// 다시 넣을 일이 있으면 알아 둘 것: 패턴은 경로가 아니라 **한 칸의 이름**과
					// 비교된다(router-generator 의 getRouteNodes 가 d.name.match(re)).
					// "routes/test/" 처럼 슬래시를 넣으면 어떤 이름과도 안 맞고, 조용히 통과한다.
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
