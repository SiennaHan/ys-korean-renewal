import { useNavigate, useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";

interface TitleInterface {
	title?: string;
	subtitle?: string;
}

export function ModuleTitle({ title, subtitle }: TitleInterface) {
	return (
		<div className="w-full py-[8px]">
			<div className="font-bold text-[#383A3F] text-[20px]">{title}</div>
			{subtitle && <div className="text-[#7F848D] text-[14px]">{subtitle}</div>}
		</div>
	);
}
