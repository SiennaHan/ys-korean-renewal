import type { StorybookConfig } from "storybook-react-rsbuild";

/**
 * Phase 1 §5.1 — Storybook 은 목업을 대체하지 않는다.
 * 구현한 셸 컴포넌트를 목업과 대조하고, 이후 수정 요청을 주고받는 통로다.
 * 셸 9종만 올린다. 나머지 화면은 이미 앱에 있으므로 대상이 아니다.
 */
const config: StorybookConfig = {
	stories: ["../src/components/**/*.stories.@(ts|tsx)"],
	framework: { name: "storybook-react-rsbuild", options: {} },
	typescript: { reactDocgen: "react-docgen-typescript" },
};

export default config;
