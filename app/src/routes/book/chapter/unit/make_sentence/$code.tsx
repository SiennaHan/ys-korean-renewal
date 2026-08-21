import { createFileRoute, useRouter } from "@tanstack/react-router";

import HangulTracingCanvas from "@/components/draw/HangulTracingCanvas";
import { ProblemHeader } from "@/components/problem/scene/header";
import { combineHangul } from "@/lib/hangul-utils";
import { chapters } from "@/shared/data/chapter";
import { modules } from "@/shared/data/module";
import { problems } from "@/shared/data/problem";
import { units } from "@/shared/data/unit";
import { type ModuleType, ProblemType } from "@/types/book.types";
import clsx from "clsx";
import { ChevronRight, CircleCheckBig } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/book/chapter/unit/make_sentence/$code")({
	component: RouteComponent,
});

const baseButton =
	"bg-[#4396F4] text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[#4396F4dd] active:bg-[#4396F4cc] \
									  disabled:text-[#bbb] disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-white disabled:hover:bg-white";
const baseCardButton =
	"w-[46px] h-[46px] rounded-[10px] bg-[#E9F2FC] text-[24px] font-bold flex items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300";
const selectedCardButton = "!bg-[#B9DAFF] border-1 border-[#4396F4]";

function RouteComponent() {
	const { code } = Route.useParams();
	const router = useRouter();

	const module: ModuleType | undefined = modules.find(
		(item) => item.code === code,
	);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const problemList = problems.filter(
		(item) => item.module_code === code && item.scene_num === 1,
	);

	const exit = () => {
		router.history.back();
	};

	return (
		<div className="flex h-full flex-col justify-between">
			<div>
				<ProblemHeader chapterSeq={chapter?.seq} unitTitle={unit?.title} />
				<div className="flex flex-col items-center pr-[30px] pl-[30px]">
					<div className="mt-[14px] w-full">
						<div className="font-bold text-[#000] text-[24px]">
							{module?.title}
						</div>
						<div className="text-[#000] text-[18px]">{module?.eng}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
