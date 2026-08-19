
import { useNavigate } from "@tanstack/react-router";
import { SceneHeader } from "./scene-header";
import { useEffect, useState } from "react";
import { dialogs } from "@/shared/data/dialog";
import { dialog_keywords } from "@/shared/data/dialog_keyword";
import { Check } from "lucide-react";
import { KoChat } from "@/api/apiType";
import { getChatListByBookId } from "@/api/chat";
import { env } from "@/config/env";
import { books } from "@/shared/data/book";
import { useMissionChatBookIdStore } from "@/shared/store/menu-store";
import clsx from "clsx";

const buttonBase = "flex items-center justify-center h-[32px] w-[48px] rounded-[8px] font-semibold border-1 border-white text-[14px] text-[#C8CCD3] bg-white hover:opacity-[0.8] active:opacity-[0.9] cursor-pointer";
const selectedButtonBase = "!border-[#59ACFF] !text-[#0A6ACB] !bg-[#DBEDFF]";

interface Props {
	goBack: ()=> void;
}

type Status = 'all' | 'completed' | 'started'

export default function MissionChat({goBack}: Props) {
	const navigate = useNavigate();

	const {bookId, setBookId} = useMissionChatBookIdStore()
	const book = books.find(item=>item.id === bookId);

	const handleBookId = (bookId: number) => {
		setBookId(bookId);
	}

	const dialogList = dialogs.filter(item=>item.book_id === bookId);
	const [filteredDialogList, setFilteredDialogList] = useState(dialogList);
	const [chatList, setChatList] = useState<KoChat[]>([]);

	const goChat = (moduleCode: string) => {
		// dialog 로 바로가지 않음
		navigate({to: '/book/chapter/unit/mission_chat/' + moduleCode});
	}

	const [selectedFilter, setSelectedFilter] = useState<Status>('all');
	const handleFilter = (status: Status) => {
		setSelectedFilter(status);
		if (status !== 'all') {
			const completedList = chatList.filter(item=>item.status === 'completed').map(item=>item.dialog_id);
			if (status === 'completed') {
				const filtered = dialogList.filter(item=> completedList.includes(item.id))
				setFilteredDialogList(filtered);
			} else {
				const filtered = dialogList.filter(item=> !completedList.includes(item.id))
				setFilteredDialogList(filtered);
			}
		} else {
			setFilteredDialogList(dialogList);
		}
	}

	useEffect(()=>{
		if (bookId ===  0) {
			const initBookId = books.length > 0 ? books[0].id : 0;
			setBookId(initBookId);
		}
	},[])

	useEffect(()=>{
		const fetch = async () => {
			const chats = await getChatListByBookId(bookId);
			setChatList(chats);
		}
		fetch();
		handleFilter('all');
	}, [bookId])

	return <div className={`flex flex-col h-full w-full flex flex-col`}>
		<SceneHeader goBack={goBack} title={'AI 미션 대화'}/>
		<div className="flex gap-[8px] overflow-x-auto scrollbar-hide px-[20px] py-[10px]">
			{books.map(book=>{
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
		<div className="flex-1 overflow-y-auto scrollbar-hide p-[16px]">
			<div className="text-[14px] text-[#359AFF] font-bold">{'3주 완성 연세 한국어 '}{book?.title}</div>
			<div className="flex gap-2 mt-[12px] mb-[20px]">
				<button onClick={e=>handleFilter('all')} className={clsx(buttonBase, selectedFilter === 'all' ? selectedButtonBase : "")}>전체</button>
				<button onClick={e=>handleFilter('completed')} className={clsx(buttonBase, selectedFilter === 'completed' ? selectedButtonBase : "")}>완료</button>
				<button onClick={e=>handleFilter('started')} className={clsx(buttonBase, selectedFilter === 'started' ? selectedButtonBase : "")}>미완료</button>
			</div>
			{filteredDialogList.map(dialog=>{
				const missions = dialog_keywords.filter(mission=> mission.dialog_id === dialog.id)
				
				const thisChat = chatList.find(chat=>chat.dialog_id === dialog.id)
				let completedList = thisChat ? thisChat.completed_missions ?? [] : []
				const imgUrl = env.RES_URL_ROOT + "/" + dialog.content_img;

				return <div key={dialog.id} onClick={e=>goChat(dialog.module_code)}
						className="mb-[10px] gap-2 p-[8px] bg-white rounded-[8px] cursor-pointer hover:opacity-[0.8] active:opacity-[0.9]">
					<div className="flex justify-between items-center mb-[8px]">
						<div className="text-[14px] text-[#359AFF] semibold">{dialog.chapter}과</div>
						<div className={clsx("w-fit px-[5px] flex items-center h-[22px] rounded-[4px] text-[12px] font-semibold", thisChat?.status === 'completed' ? "text-[#11C378] bg-[#E7FBCE]" : "text-[#ADB3BE] bg-[#E5E8EC]")}>{thisChat?.status === 'completed' ? "완료" : "미완료"}</div>
					</div>
					<div className="flex gap-2">
						<div className="w-[120px] h-[68px]"><img src={imgUrl} className="w-[120px] h-[68px] object-cover"/></div>
						<div className="w-[calc(100%-130px)] pl-[5px]">
							<div className="text-[14px] text-[#383A3F] semibold truncate ...">{dialog.scenario}</div>
							<div className="text-[12px] text-[#979DA8] truncate ...">{dialog.scenario_eng}</div>
							<div className="h-[5px] mb-[5px] border-b-1 border-[#F6F7F8]"></div>
							<div className="flex text-[14px] gap-3 overflow-x-auto scrollbar-hide">
								{missions.map(mission => {
									const iconColor = completedList.includes(mission.keyword) ? "#11C378" : "#d0d0d0";
									return <div key={mission.id} className="flex items-center">
										<Check color={iconColor} strokeWidth={3} size={12} /> 
										<span className={`ml-[3px] text-[12px] text-[${iconColor}] whitespace-nowrap`}>{mission.keyword}</span>
									</div>
								})}
							</div>
						</div>
					</div>
				</div>
			})}
		</div>
	</div>
}