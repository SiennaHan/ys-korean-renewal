import { useNavigate, useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";

interface TitleInterface {
	title?: string;
	subtitle?: string;
}

export function ModuleTitle ({title, subtitle}: TitleInterface) {
	return <div className="w-full py-[8px]">
			<div className="text-[20px] text-[#383A3F] font-bold">{title}</div>
			{subtitle && (
				<div className="text-[14px] text-[#7F848D]">{subtitle}</div>
			)}
		</div>
}