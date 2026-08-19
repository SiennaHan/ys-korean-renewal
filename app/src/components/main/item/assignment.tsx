import { useNavigate } from "@tanstack/react-router";
import { CircleChevronRight } from "lucide-react";

const textButtonBase = "flex items-center cursor-pointer hover:opacity-75 active:opacity-100 \
												ml-[5px] mt-[10px] bg-[#fff] rounded-[10px] p-[10px] shadow-[0px_2px_10px_rgba(0,0,0,0.1)]"

export default function Assignment() {

	const navigate = useNavigate()
			
	const goStudy = (moduleName: string, moduleCode: string) => {
		navigate({to: '/book/chapter/unit/' + moduleName + "/" + moduleCode});
	}

	const Item = (p : {module: string, code: string, title: string, eng: string}) => {
		return <div onClick={e=>goStudy(p.module, p.code)} className={textButtonBase}>
			<div>
				<CircleChevronRight size={20} color={"#4396F4"} strokeWidth={2}/>
			</div>
			<div className="ml-[10px]">
				<span className="text-[14px] font-normal">{p.title}</span>
				<div className="text-[12px] text-[#ccc]">{p.eng}</div>
			</div>
		</div>
	}

	return <div className="mt-[8px]">
		<Item module={'listen-repeat'} code={'YK0001'} title={'1과 - 모음1: 단어 듣고 따라하기'} eng={'Ch.1 - Vowel 1: Listen and Repeat'}/>
		<Item module={'write'} code={'YK0002'} title={'1과 - 모음 1: 자음-모음 조합하고 쓰기'} eng={'Ch.1 - Vowel 1: Consonant-Vowel Writing'}/>
	</div>
}