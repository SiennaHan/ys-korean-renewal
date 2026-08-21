import { BookHeader } from "@/components/ui/book-header";
import { HeaderBackButton } from "@/components/ui/header-back-button";
import { books } from "@/shared/data/book";
import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/book/list")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();

	const goBook = (id: number) => {
		console.log("id=>", id);
		navigate({ to: "/book/" + id });
	};

	const bookList = books.filter((item) => item.id > 1);

	const previousPage = "/main";

	return (
		<motion.div
			initial={{ opacity: 0, x: "100%" }}
			animate={{ opacity: 100, x: "0%" }}
			exit={{ opacity: 0, x: "-100%" }}
			className="h-full"
			transition={{ duration: 1 }}
		>
			<div className="">
				<BookHeader title="3주완성 연세한국어" previousPage={previousPage} />
				<div className="mt-[20px] flex flex-col gap-[16px] pr-[18px] pl-[18px]">
					<div
						onClick={(e) => goBook(1)}
						className="block h-[163px] cursor-pointer rounded-[15px] bg-[#6BC0E5] p-[10px] shadow-[0_0px_6px_0.5px_rgb(94,129,169,0.3)]"
					>
						<div className="flex justify-between rounded-[8px] border-[#ffffff] border-[3px] border-solid p-[13px]">
							<div>
								<img src="/images/image-yonsei-korean-in3weeks.png" />
							</div>
							<div>
								<img src="/images/image-no-1.png" />
							</div>
						</div>
						<div className="mt-[10px] ml-[14px] text-left font-bold text-[#fff] text-[15px]">
							3주완성 연세한국어 1
						</div>
					</div>
					{bookList.map((item) => {
						return (
							<button
								key={item.id}
								onClick={(e) => goBook(item.id)}
								className="h-[40px] cursor-pointer rounded-[15px] bg-white pl-[24px] text-left text-black shadow-[0_0px_6px_0.5px_rgb(94,129,169,0.2)] hover:bg-gray-200"
							>
								{item.title}
							</button>
						);
					})}
				</div>
			</div>
		</motion.div>
	);
}
