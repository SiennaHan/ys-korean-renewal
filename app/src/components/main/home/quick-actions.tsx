import { AlignCenter, BookOpen, Star } from "lucide-react";

interface QuickAction {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
}

interface QuickActionsProps {
	onHangul: () => void;
	onClip: () => void;
	onGame: () => void;
}

export default function QuickActions({
	onHangul,
	onClip,
	onGame,
}: QuickActionsProps) {
	const actions: QuickAction[] = [
		{
			icon: (
				<div className="flex items-center justify-center size-[44px] rounded-[12px] bg-[#DBEDFF]">
					<AlignCenter className="size-[22px] text-[#0180FF]" />
				</div>
			),
			label: "한글 복습",
			onClick: onHangul,
		},
		{
			icon: (
				<div className="flex items-center justify-center size-[44px] rounded-[12px] bg-[#F3E8FF]">
					<BookOpen className="size-[22px] text-[#8B5CF6]" />
				</div>
			),
			label: "표현 클립",
			onClick: onClip,
		},
		{
			icon: (
				<div className="flex items-center justify-center size-[44px] rounded-[12px] bg-[#E8FFF3]">
					<Star className="size-[22px] text-[#10B981]" />
				</div>
			),
			label: "게임",
			onClick: onGame,
		},
	];

	return (
		<div className="flex gap-[10px]">
			{actions.map((action) => (
				<button
					key={action.label}
					type="button"
					onClick={action.onClick}
					className="flex-1 flex flex-col items-center gap-[8px] bg-[#F6F7F8] rounded-[16px] py-[16px] cursor-pointer hover:bg-[#EDEEF0] active:bg-[#E5E6E8] transition-colors"
				>
					{action.icon}
					<span className="text-[13px] font-semibold text-[#24425F]">
						{action.label}
					</span>
				</button>
			))}
		</div>
	);
}
