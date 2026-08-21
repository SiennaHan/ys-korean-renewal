import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/book/")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigatge = useNavigate();

	const goBook = (id: number) => {
		navigatge({ to: "/book/" + id });
	};

	return (
		<div className="p-[18px]">
			<div className="mt-[6px] font-bold text-[#000] text-[24px]">
				3주완성 연세 한국어
			</div>
			<div
				className="mt-[20px] flex flex-col gap-[16px]"
				onClick={(e) => goBook(1)}
			>
				<div className="block h-[163px] cursor-pointer rounded-[15px] bg-[#6BC0E5] p-[10px] shadow-[0_0px_6px_0.5px_rgb(94,129,169,0.3)]">
					<div className="flex justify-between rounded-[8px] border-[#ffffff] border-[3px] border-solid p-[13px]">
						<div>
							<img src="/images/image_yonsei_korean_in3weeks.png" />
						</div>
						<div>
							<img src="/images/image_no_1.png" />
						</div>
					</div>
					<div className="mt-[10px] ml-[14px] text-left font-bold text-[#fff] text-[15px]">
						3주완성 연세한국어 1
					</div>
				</div>
				{[2, 3, 4, 5, 6, 7, 8].map((id) => {
					return (
						<button
							onClick={(e) => goBook(id)}
							className="h-[40px] cursor-pointer rounded-[15px] bg-white pl-[24px] text-left text-black shadow-[0_0px_6px_0.5px_rgb(94,129,169,0.2)] hover:bg-gray-200"
						>
							3주완성 연세한국어 {id}
						</button>
					);
				})}
			</div>
		</div>
	);
}
