import i18n from "@/i18n";
import type { Preview } from "@storybook/react";
import "@/styles/globals.css";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";

/**
 * 전역 토글 2개는 §5.1 이 필수로 못박은 것이다.
 *  · UI 언어 5종 — §7 "가장 긴 문자열" 검사가 클릭 한 번이 된다
 *  · 뷰포트 360 / 320 — 320 에서 선택지 칸 높이가 96 → 72 로 줄어야 한다
 * 이 둘이 없으면 Storybook 이 컴포넌트 카탈로그에 그친다.
 */
const preview: Preview = {
	globalTypes: {
		locale: {
			description: "UI 언어",
			defaultValue: "ko",
			toolbar: {
				icon: "globe",
				items: [
					{ value: "ko", title: "한국어" },
					{ value: "en", title: "English" },
					{ value: "ja", title: "日本語" },
					{ value: "zh", title: "中文" },
					{ value: "vi", title: "Tiếng Việt" },
				],
				dynamicTitle: true,
			},
		},
	},
	parameters: {
		viewport: {
			options: {
				w360: { name: "360 기준", styles: { width: "360px", height: "780px" } },
				w320: { name: "320 최소", styles: { width: "320px", height: "700px" } },
			},
		},
		layout: "centered",
	},
	initialGlobals: { viewport: { value: "w360", isRotated: false } },
	decorators: [
		(Story, context) => {
			const locale = context.globals.locale as string;
			useEffect(() => {
				if (i18n.language !== locale) i18n.changeLanguage(locale);
			}, [locale]);
			return (
				<I18nextProvider i18n={i18n}>
					<Story />
				</I18nextProvider>
			);
		},
	],
};

export default preview;
