import { useNavigate } from "@tanstack/react-router";

export default function Course() {
	const navigate = useNavigate()
	
	const goBookList = () => {
		const id = 1;
		navigate({to: '/book/' + id});
	}
	
	return <div className="flex mt-[8px] gap-2">
		<div onClick={goBookList} className="cursor-pointer border-[#efefef] p-2 border-1 rounded-[10px] hover:border-1 hover:bg-gray-100 active:bg-gray-200 shadow-[0px_2px_10px_rgba(0,0,0,0.1)]">
			<div><img src="/images/book_img_sample1.jpg" className=""/></div>
			<div className="text-[12px] text-center mt-[10px]">3주완성 연세 한국어 1-8</div>
		</div>
		<div className="border-1 border-[#efefef] p-2 border-1 rounded-[10px]">
			<div><img src="/images/book_img_sample2.jpg" className="" /></div>
			<div className="text-[12px] text-center mt-[5px]">새 연세한국어 1-6</div>
		</div>
	</div>
}