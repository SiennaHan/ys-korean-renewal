import { flashcards } from "@/shared/data/flashcard";
import { SceneHeader } from "./scene-header";
import { useEffect, useState } from "react";
import { books } from "@/shared/data/book";
import clsx from "clsx";
import { Triangle, Circle } from 'lucide-react';
import { useNavigate } from "@tanstack/react-router";
import { useFlashcardBookIdStore, useSelectedCardTypeStore } from "@/shared/store/menu-store";
import { db, UserFlashcardWordTable } from "@/shared/db";
import { flashcard_words } from "@/shared/data/flashcard_word";

const buttonBase = "bg-[#f9fafc] rounded-[8px] p-[10px] rounded-[10px] p-[12px] cursor-pointer hover:opacity-[0.8] active:opacity-[0.9]"

export default function Flashcard(props: {goBack: ()=> void}) {
	const navigate = useNavigate();
	
	const bookIdArray = flashcards.map(item=>item.book_id);
	const bookIds = [...new Set(bookIdArray)];

	const {bookId, setBookId} = useFlashcardBookIdStore()

	const book = books.find(item=>item.id === bookId);

	const handleBookId = (bookId: number) => {
		setBookId(bookId);
	}

	const flashcardList = flashcards.filter(item=>item.book_id === bookId);

	const cardTypes:('wm'|'mw')[] = ["wm", "mw"];
	const { cardType, setCardType } = useSelectedCardTypeStore();
	
	const openFlashcard = (id: number, type: "wm"| "mw") => {
		setCardType(type)

		navigate({
			to: '/book/chapter/unit/flashcard/' + id
		});
	}

	const [userFlashcardList, setUserFlashcardList] = useState<UserFlashcardWordTable[]>([]);
	
	useEffect(()=>{
		const selectedBookId = bookIds.length > 0 ? bookIds[0] : 0
		if (bookId === 0) 
			setBookId(selectedBookId);
	}, [])

	useEffect(()=>{
		const fetch = async () => {
			const userCardList = await db.user_flashcard_word.where('book_id').equals(bookId).toArray();
			setUserFlashcardList(userCardList);
		}
		fetch();
	}, [bookId])
	
	return <div className={`flex flex-col h-full w-full flex flex-col`}>
		<SceneHeader goBack={props.goBack} title={'단어 플래시카드'}/>
		<div className="flex gap-[8px] overflow-x-auto scrollbar-hide pl-[20px] py-[10px]">
			{bookIds.map(id=>{
				if (id === bookId) {
					return <div key={id} className="w-[40px] h-[44px] px-[4px] text-white rounded-[6px] bg-[#0180ff] shadow-xs">
						<div className="flex w-[30px] h-[34px] justify-center items-center font-bold">{id}</div>
						<div className="w-full h-[6px] rounded-full bg-white"></div>
					</div>
				} else {
					return <div key={id} className="flex justify-center items-center w-[40px] h-[44px] text-[#c8ccd3] rounded-[6px] bg-white" 
											onClick={e=>handleBookId(id)}>{id}</div>
				}
			})}
		</div>
		<div className="flex-1 overflow-y-auto scrollbar-hide px-[16px] mt-[10px]">
			<div className="text-[14px] text-[#359AFF] font-bold">{book?.title}</div>
			<div className="flex flex-col gap-[16px] py-[16px]">
				{flashcardList.map(card=><div key={card.id} className="bg-white rounded-[14px] p-[12px]">
					<div className="flex justify-between items-center">
						<div className="text-[14px] text-[#359AFF] font-semibold">{card.chapter}과</div>
						<div className="h-[26px] flex items-center bg-[#f9fafc] rounded-[6px] text-[12px] text-[#7f848d] font-semibold px-[5px]">{card.card_count} 단어</div>
					</div>
					<div className="h-[40px] flex items-center text-[16px] text-[#383A3F] font-bold truncate ...">{card.title}</div>
					<div className="grid gap-[10px] mt-[2px]">
						{cardTypes.map(type=> {
							const wordList = flashcard_words.filter(word=>word.flashcard_id === card.id);
							const typeCards = userFlashcardList.filter(userCard=> userCard.flashcard_id === card.id && userCard.type === type);
							const known = typeCards.filter(card=> card.status === 'known' ).length;
							const unknown = typeCards.filter(card=> card.status === 'unknown').length;

							const isCompleted = wordList.length <= typeCards.length;
							// 여기서 db 정보 매핑
							return <div key={type} className={clsx(buttonBase, "")} onClick={e=>openFlashcard(card.id, type)}>
								<div className="flex justify-between items-center mb-[10px]">
									<div className="text-[14px] text-[#4B505A] font-bold">{type === 'wm' ? '단어 보고 뜻 맞히기' : '뜻 보고 단어 맞히기'}</div>
									<div className={clsx("w-fit px-[5px] flex items-center h-[22px] rounded-[4px] text-[12px] font-semibold", isCompleted ? "text-[#11C378] bg-[#E7FBCE]" : "text-[#ADB3BE] bg-[#E5E8EC]")}>{isCompleted ? "완료" : "미완료"}</div>
								</div>
								<div className="flex gap-[4px]">
									<div className="rounded-full flex p-[4px] border-1 border-[#e5e8ec]">
										<div className="size-[22px] rounded-full bg-[#FFCB13] flex justify-center items-center">
											<Triangle color="white" size="13px"/>
										</div>
										<div className="w-[28px] text-[12px] flex justify-center items-center">{unknown ?? 0}</div>
									</div>
									<div className="rounded-full flex p-[4px] border-1 border-[#e5e8ec]">
										<div className="size-[22px] rounded-full bg-[#359AFF] flex justify-center items-center">
											<Circle color="white" size="12px"/>
										</div>
										<div className="w-[28px] text-[12px] flex justify-center items-center">{known ?? 0}</div>
									</div>
								</div>
							</div>
						})}
					</div>
				</div>)}
			</div>
		</div>
	</div>
}