import { Triangle } from "lucide-react";

interface KSelectDataType {
	id: number;
	title: string;
}
interface KSelectInterface {
	data: KSelectDataType[];
	onSelected: (id: number) => void;
}
export default function KSelect(props: KSelectInterface) {
	return <div className="relative">
		<select 
			onChange={e=>props.onSelected(parseInt(e.target.value))}
			className="appearance-none bg-white w-full py-[2px] pl-3 pr-6 rounded-full">
			{props.data.map(item=> <option key={item.id} value={item.id}>{item.title}</option>)}
		</select>
		<div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
			<Triangle style={{ transform: 'rotate(180deg)' }} size={8} strokeWidth={0} fill={'#4396f4'}/>
		</div>
	</div>
}