import { SceneHeader } from "./scene-header";
import { Triangle, Check, ChevronRight } from "lucide-react"
import KSelect from "./k-select";
import { useEffect, useState } from "react";
import { units } from "@/shared/data/unit";
import { ModuleType } from "@/types/book.types";
import { modules } from "@/shared/data/module";
import { useNavigate } from "@tanstack/react-router";
import { chapters } from "@/shared/data/chapter";
import clsx from "clsx";
import { books } from "@/shared/data/book";
import { useJamoBookIdStore, useJamoChapterIdStore, useMissionChatBookIdStore } from "@/shared/store/menu-store";

const gwas = [
	{id: 1, title: '1과'},
	{id: 2, title: '2과'},
	{id: 3, title: '3과'},
];

const buttonBase = "flex items-center justify-center h-[32px] w-[48px] rounded-[8px] font-semibold border-1 border-white text-[14px] text-[#C8CCD3] bg-white hover:opacity-[0.8] active:opacity-[0.9] cursor-pointer";
const selectedButtonBase = "!border-[#59ACFF] !text-[#0A6ACB] !bg-[#DBEDFF]";

export default function Jamo(props: {goBack: ()=> void}) {
	const navigate = useNavigate();

	const {bookId, setBookId} = useJamoBookIdStore()
	const book = books.find(item=>item.id === bookId);

	const [chapterList, setChapterList] = useState(chapters.filter(item=>item.book_id == bookId && item.type == 'jamo'))

	const handleBookId = (bookId: number) => {
		setBookId(bookId);
	}

	const {chapterId, setChapterId} = useJamoChapterIdStore()
	const handleFilter = (chapter: number) => {
		setChapterId(chapter);
	}

	const goProblem = (module: ModuleType) => {
		navigate({to: '/book/chapter/unit/' + module.scene_type + '/' + module.code});
	}

	useEffect(()=>{
		
		if (bookId === 0) {
			const initBookId = books.length > 0 ? books[0].id : 0;
			setBookId(initBookId);

			const _chapters = chapters.filter(item=>item.book_id == initBookId && item.type == 'jamo')
			setChapterList(_chapters)
			
			const initChapterId = _chapters.length > 0 ? _chapters[0].id : 0;
			setChapterId(initChapterId)
		}
	},[])

	return <div className={`flex flex-col h-full w-full flex flex-col`}>
		<SceneHeader goBack={props.goBack} title={'한글 자모 익히기'}/>
		<div className="flex gap-[8px] overflow-x-auto scrollbar-hide px-[16px] py-[10px]">
			{books.filter(item=>item.id === 1).map(book=>{
				if (bookId === book.id) {
					return <div key={book.id} 
										className="flex-shrink-0 w-[40px] h-[44px] px-[4px] text-white rounded-[6px] bg-[#0180ff] shadow-xs hover:opacity-[0.8] cursor-pointer">
						<div className="flex w-[30px] h-[34px] justify-center items-center font-bold">{book.id}</div>
						<div className="w-full h-[6px] rounded-full bg-white"></div>
					</div>
				} else {
					return <div key={book.id} 
										className="flex-shrink-0 w-[40px] h-[44px] flex justify-center items-center text-[#c8ccd3] rounded-[6px] bg-white hover:opacity-[0.8] cursor-pointer" 
										onClick={e=>handleBookId(book.id)}>{book.id}</div>
				}
			})}
		</div>
		<div className="flex-1 overflow-y-auto scrollbar-hide px-[16px]">
			<div className="text-[14px] text-[#359AFF] font-bold mt-[6px] mb-[12px]">{'3주 완성 연세 한국어 '}{book?.title}</div>
			<div className="flex gap-2 mt-[12px] mb-[20px]">
				{chapterList.map(chapter=><button key={chapter.id} onClick={e=>handleFilter(chapter.seq)} 
																	className={clsx(buttonBase, chapter.seq === chapterId ? selectedButtonBase : "")}>{chapter.seq}과</button>
				)}
			</div>
			<div className="grid gap-[12px]">

				{chapterList.length < 1 && <div className="h-[300px] flex justify-center text-[14px] text-[#888]">데이터가 없습니다</div>}

				{chapterList.filter(item=>item.seq === chapterId).map(chapter=>{

					const unitList = units.filter((item) => item.chapter_id == chapter.id)

					return <div key={chapter.id} className="grid gap-3 mb-[10px]">
				
						<div className="flex items-center px-[6px] bg-[#f7f7f7] rounded-[10px]">
							<div className="text-[14px] text-[#7F848D]">제{chapter.seq}과 {chapter.title}</div>
						</div>

						{unitList.map((item) => {
							const moduleList = modules.filter(module=> module.unit_id === item.id)
							const titleText = item.title.split(":")
							const sylList = titleText.length > 1 ? titleText[1].split(",") : []
							return <div key={item.id} className="bg-[#fff] rounded-[10px] py-[12px] min-w-0">
								<div>
									<div className="px-[12px]">
										<div className="text-[14px] text-[#0180FF] font-bold">{titleText[0]}</div>
										<div className="flex gap-1 mt-[10px] overflow-x-auto scrollbar-hide flex-nowrap w-full">
											{sylList.map(syl=><div key={syl} className="size-[28px] flex-shrink-0 flex items-center justify-center rounded-[6px] text-[14px] text-[#24425F] font-bold bg-[#DBEDFF]">
												{syl}
												</div>)}
										</div>
									</div>
									<div className="h-[12px] border-b-1 border-[#F6F7F8] mb-[12px]"></div>
									<div className="grid gap-[10px] px-[12px]">
										{moduleList.map(module=><div key={module.id} onClick={e=>goProblem(module)}
											className="text-[12px] bg-[#F9FAFC] rounded-[5px] h-[46px] pl-[10px] pr-[16px] flex items-center justify-between cursor-pointer hover:opacity-[0.8] active:opacity-[0.9]">
												<div className="text-[14px] text-[#24425F] font-semibold pl-[10px]">{module.title}</div>
												<div className="text-[12px] text-[#ADB3BE] font-semibold bg-[#E5E8EC] rounded-[4px] px-[6px] py-[2px]">미완료</div>
											</div>
										)}
									</div>
								</div>
							</div>
						})}
					</div>
				})}
			</div>
		</div>
	</div>
}