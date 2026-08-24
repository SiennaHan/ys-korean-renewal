import { BookHeader } from "@/components/ui/book-header";
import { books } from "@/shared/data/book";
import { chapters } from "@/shared/data/chapter";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import type { ModuleType } from "@/types/book.types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/book/chapter/unit/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams(); // 여기서 파라미터를 가져옵니다.
	const unitId = Number(id ?? 0);

	const navigate = useNavigate();

	const unit = units.find((item) => item.id === unitId);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const book = books.find((item) => item.id === chapter?.book_id);

	const moduleList: ModuleType[] = modules.filter(
		(item) => item.unit_id === unitId,
	);

	const goProblem = (module: ModuleType) => {
		navigate({
			to: `/book/chapter/unit/${module.scene_type}/${module.code}`,
		});
	};

	const previousPage = `/book/${book?.id}`;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 1 }}
			className="h-full"
		>
			<div className="h-full bg-[#f8f8f8]">
				<BookHeader title={book?.title} previousPage={previousPage} />
				<div className="flex bg-white">
					<div className="w-[5px] bg-[#037]" />
					<div className="flex h-[53px] items-center">
						<div className="flex w-[40px] justify-center pl-[15px] font-extrabold text-[#037] text-[32px]">
							{chapter?.seq}
						</div>
						<div className="flex flex-col pl-[15px]">
							<div className="text-[14px]">{chapter?.title}</div>
							<div className="text-[#999] text-[10px]">{chapter?.eng}</div>
						</div>
					</div>
				</div>

				<div className="my-[12px] flex items-center pl-[20px] text-[#5e5e5e] text-[14px]">
					{unit?.title}
				</div>

				<div className="pr-[15px] pl-[15px]">
					{moduleList.map((item) => (
						<button
							type="button"
							key={item.id}
							onClick={() => goProblem(item)}
							className="mb-[7px] flex cursor-pointer rounded-[5px] border-1 border-[#efefef] bg-[#fff] px-[8px] py-[6px] text-left shadow-[0_0px_6px_0.5px_rgb(94,129,169,0.1)] hover:bg-[#e9f2fc] active:bg-[#e9f2ff]"
						>
							<div className="flex w-[20px] items-center justify-center">
								<ChevronRight />
							</div>
							<div className="ml-[10px]">
								<div className="font-bold text-[14px]">{item.title}</div>
								<div className="text-[#bbb] text-[10px]">{item.eng}</div>
							</div>
						</button>
					))}
				</div>
			</div>
		</motion.div>
	);
}
