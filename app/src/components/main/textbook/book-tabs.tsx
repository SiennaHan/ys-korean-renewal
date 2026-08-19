import { useRef, useEffect } from "react";
import clsx from "clsx";

interface BookTab {
	id: number | "jamo";
	label: string;
}

interface BookTabsProps {
	tabs: BookTab[];
	activeId: number | "jamo";
	onSelect: (id: number | "jamo") => void;
}

export default function BookTabs({ tabs, activeId, onSelect }: BookTabsProps) {
	const activeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		activeRef.current?.scrollIntoView({
			behavior: "smooth",
			inline: "center",
			block: "nearest",
		});
	}, [activeId]);

	return (
		<div className="flex gap-[11px] px-[16px] py-[8px] overflow-x-auto scrollbar-hide">
			{tabs.map((tab) => {
				const isActive = tab.id === activeId;
				return (
					<button
						key={tab.id}
						ref={isActive ? activeRef : null}
						type="button"
						onClick={() => onSelect(tab.id)}
						className={clsx(
							"shrink-0 h-[44px] w-[40px] rounded-[6px] px-[4px] cursor-pointer transition-colors flex flex-col items-center",
							isActive
								? "bg-[#0180FF] shadow-[0px_4px_8px_0px_rgba(127,132,141,0.25)]"
								: "bg-[#E5E8EC]",
						)}
					>
						<span className={clsx(
							"flex-1 flex items-center justify-center text-[16px] font-bold w-full",
							isActive ? "text-white" : "text-white",
						)}>
							{tab.label}
						</span>
						<div className={clsx(
							"w-[32px] h-[6px] rounded-[3px] mb-[4px]",
							isActive ? "bg-white" : "bg-[#F6F7F8]",
						)} />
					</button>
				);
			})}
		</div>
	);
}
