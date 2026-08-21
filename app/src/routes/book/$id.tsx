import { BookHeader } from "@/components/ui/book-header";
import { books } from "@/shared/data/book";
import { chapters } from "@/shared/data/chapter";
import { units } from "@/shared/data/unit";
import type { ChapterType } from "@/types/book.types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/book/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams(); // 여기서 파라미터를 가져옵니다.
	const bookId = Number(id ?? 0);
	const previousPage = "/main";

	const navigate = useNavigate();

	const goChapter = (id: number, seq: number) => {
		console.log("id=>", id);
		if (seq > 3) navigate({ to: "/book/chapter/" + id });
	};

	const goUnit = (id: number) => {
		console.log("unitId=>", id);
		navigate({ to: "/book/chapter/unit/" + id });
	};

	const book = books.find((item) => item.id === bookId);
	const chapterList = chapters.filter((item) => item.book_id === bookId);

	const ChapterView = (chapter: ChapterType) => {
		const unitList = units.filter((item) => item.chapter_id === chapter.id);

		return (
			<div className="flex rounded-[5px] bg-white shadow-[0_0px_6px_0.5px_rgb(94,129,169,0.2)]">
				<div className="w-[5px] rounded-l-[5px] bg-[#037]"></div>
				<div className="flex w-full flex-col">
					<div
						onClick={(e) => goChapter(chapter.id, chapter.seq)}
						className={
							chapter.seq > 3
								? "flex h-[53px] cursor-pointer items-center hover:bg-gray-200 active:bg-gray-300"
								: "flex h-[53px] items-center"
						}
					>
						<div className="flex w-[40px] justify-center pl-[15px] font-extrabold text-[#037] text-[32px]">
							{chapter.seq}
						</div>
						<div className="flex flex-col pl-[15px]">
							<div className="text-[14px]">{chapter.title}</div>
							<div className="text-[#999] text-[10px]">{chapter.eng}</div>
						</div>
					</div>
					{chapter.is_show_unit &&
						unitList.map((item) => {
							return (
								<div
									key={item.id}
									onClick={(e) => goUnit(item.id)}
									className="flex h-[40px] cursor-pointer items-center border-gray-100 border-t-1 pl-[15px] text-[14px] hover:bg-gray-200 active:bg-gray-300"
								>
									{item.title}
								</div>
							);
						})}
				</div>
			</div>
		);
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 1 }}
			className="h-full"
		>
			<div className="h-full bg-[#f8f8f8]">
				<div className="sticky top-0 items-center bg-[#f8f8f8]">
					<BookHeader title={book?.title} previousPage={previousPage} />
				</div>
				<div className="mt-[15px] flex flex-col gap-[15px] pr-[10px] pb-[18px] pl-[10px]">
					{chapterList.map((item, idx) => (
						<ChapterView {...item} key={idx} />
					))}
				</div>
			</div>
		</motion.div>
	);
}
