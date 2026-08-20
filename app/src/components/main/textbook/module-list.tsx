import { useTranslation } from "react-i18next";

/**
 * 활동 한 줄의 오른쪽 자리는 하나다 — 상태에 따라 갈아 낀다.
 *  · done   완료
 *  · review 완료 + 복습 N   (다 했지만 다시 볼 것이 남았다)
 *  · doing  진행 중
 *  · none   비운다 — 아직 손대지 않은 것을 굳이 "미완료"라 부르지 않는다
 *  · off    잠김. 누를 수 없다
 */
export type ModuleState = "done" | "review" | "doing" | "none" | "off";

export interface ModuleItem {
	id: string;
	title: string;
	state: ModuleState;
	/** review 일 때 다시 볼 문항 수 */
	reviewCount?: number;
}

export interface ModuleSection {
	label: string;
	modules: ModuleItem[];
}

function StateSlot({ item }: { item: ModuleItem }) {
	const { t } = useTranslation();
	if (item.state === "doing")
		return (
			<span className="st">
				<span className="pr">{t("catalog.doing")}</span>
			</span>
		);
	if (item.state === "done")
		return (
			<span className="st">
				<span className="bdg">{t("catalog.done")}</span>
			</span>
		);
	if (item.state === "review")
		return (
			<span className="st">
				<span className="bdg">{t("catalog.done")}</span>
				<span className="rv">
					{t("catalog.review", { count: item.reviewCount ?? 0 })}
				</span>
			</span>
		);
	return <span className="st" />;
}

export function ActRow({
	item,
	onClick,
}: {
	item: ModuleItem;
	onClick: (id: string) => void;
}) {
	const off = item.state === "off";
	return (
		<button
			type="button"
			className={`act ${item.state}`}
			disabled={off}
			aria-disabled={off || undefined}
			onClick={() => onClick(item.id)}
		>
			<span className="nm">{item.title}</span>
			<StateSlot item={item} />
		</button>
	);
}

export function ChapterHead({ seq, title }: { seq: number; title: string }) {
	const { t } = useTranslation();
	return (
		<div className="chapter-head">
			<span className="seq">{t("catalog.chapterSeq", { seq })}</span>
			<strong>{title}</strong>
		</div>
	);
}

export default function ModuleList({
	sections,
	onModuleClick,
}: {
	sections: ModuleSection[];
	onModuleClick: (id: string) => void;
}) {
	return (
		<div className="learning-sections">
			{sections.map((section) => (
				<section className="learning-section" key={section.label}>
					<div className="seclabel">{section.label}</div>
					<div className="acts">
						{section.modules.map((item) => (
							<ActRow key={item.id} item={item} onClick={onModuleClick} />
						))}
					</div>
				</section>
			))}
		</div>
	);
}
