/**
 * 자모 — 한 라우트가 여섯 활동을 갈라 낸다 (dev_spec §4 "6→1 통합")
 *
 * 전에는 라우트가 여섯이었다.
 *   /learn/jamo/pronounce?code=YK0001   listen-repeat
 *   /learn/jamo/combine?code=YK0002     write
 *   /learn/jamo/word-repeat?code=YK0003 listen-repeat2
 *   /learn/jamo/word-write?code=YK0004  read-write
 *   /learn/jamo/choose?code=YK0005      listen
 *   /learn/jamo/combine3?code=YK0032    write3
 *
 * 지금은 하나다 — `/learn/jamo?level&lesson&group&sub`. 화면은 그대로고
 * 라우트에서 컴포넌트로 옮겼다(components/learn/jamo/). 콘텐츠 ID 는
 * URL 에서 빠졌다. 데이터는 module_code 를 계속 들고 있다 — wordgroup 처럼
 * 그 키로 조인하는 옛 표가 아직 있다.
 *
 * 옛 `?code=` 링크는 파서가 주소로 풀어 준다 — 같은 화면이 나온다.
 */
import JamoChoose from "@/components/learn/jamo/choose";
import JamoCombine from "@/components/learn/jamo/combine";
import JamoCombine3 from "@/components/learn/jamo/combine3";
import JamoPronounce from "@/components/learn/jamo/pronounce";
import JamoWordRepeat from "@/components/learn/jamo/word-repeat";
import JamoWordWrite from "@/components/learn/jamo/word-write";
import { resolveJamo } from "@/shared/data/jamo";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type JamoSearch, parseJamoSearch } from "./-jamo-search";

export const Route = createFileRoute("/learn/jamo")({
	validateSearch: (search: Record<string, unknown>): JamoSearch =>
		parseJamoSearch(search),
	component: RouteComponent,
});

/** sub 번호 → 화면. shared/data/jamo.ts 의 JAMO_SUBS 와 같은 순서다 */
const SCREENS: Record<
	number,
	(props: { moduleCode: string }) => React.ReactElement
> = {
	1: JamoPronounce,
	2: JamoCombine,
	3: JamoWordRepeat,
	4: JamoWordWrite,
	5: JamoChoose,
	6: JamoCombine3,
};

function RouteComponent() {
	const { lesson, group, sub } = Route.useSearch();
	const router = useRouter();
	const { t } = useTranslation();

	const { moduleCode } = resolveJamo({ lesson, group, sub });
	const Screen = sub ? SCREENS[sub] : undefined;

	/*
	 * 주소가 비었거나 그 자리에 콘텐츠가 없을 때. 3과(받침·겹받침)는 활동이
	 * [1,4,5,6] 이라 2·3 을 물으면 여기로 온다 — 빈 화면을 내지 말고 말해 준다.
	 */
	if (!Screen || !moduleCode) {
		return (
			<div className="activity-frame">
				<div className="catalog-empty">
					<p>{t("catalog.noModules")}</p>
					<button
						type="button"
						className="ux-control"
						onClick={() => router.history.back()}
					>
						{t("player.exit")}
					</button>
				</div>
			</div>
		);
	}

	return <Screen moduleCode={moduleCode} />;
}
