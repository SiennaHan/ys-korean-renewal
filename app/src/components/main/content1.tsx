import RecentActivity from "./item/recent-activity";
import Assignment from "./item/assignment";
import PointBox from "./item/point-box";

export default function Content1() {

	return <div className="p-[20px] bg-[#fff]">
		<div className="flex gap-5">
			<PointBox label={'Point'} value={'13,400'} />
			<PointBox label={'Streak'} value={'280'} />
		</div>

		<div className="text-[16px] font-bold mt-[18px]">Recent Activity</div>
		<RecentActivity unitId={1}/>

		<div className="text-[16px] font-bold mt-[18px]">Assignment</div>
		<Assignment />

		<div className="text-[16px] font-bold mt-[18px]">Statistics</div>
		<div className="flex justify-center mt-[8px] bg-[#efefef] rounded-[10px] p-[10px] text-[12px] text-[#ccc]">
			no data
		</div>
	</div>
}