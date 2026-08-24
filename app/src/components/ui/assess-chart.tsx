import {
	Chart as ChartJS,
	type ChartOptions,
	Filler,
	Legend,
	LineElement,
	PointElement,
	RadialLinearScale,
	Tooltip,
} from "chart.js";
import { Radar } from "react-chartjs-2";

interface Props {
	labels: string[];
	data: number[];
}

export default function AssessmentChart(props: Props) {
	ChartJS.register(
		RadialLinearScale,
		PointElement,
		LineElement,
		Filler,
		Tooltip,
		Legend,
	);

	const chartData = {
		labels: props.labels,
		datasets: [
			{
				label: "팀 점수",
				data: props.data,
				fill: true,
				backgroundColor: "rgba(185, 218, 255, 0.50)",
				borderColor: "#377ef8",
				pointRadius: 0,
				pointHoverBackgroundColor: "#fff",
				pointHoverBorderColor: "#377ef8",
			},
		],
	};

	const chartOptions: ChartOptions<"radar"> & ChartOptions = {
		responsive: true,
		elements: {
			line: {
				borderWidth: 2,
				borderColor: "#377ef8",
			},
		},
		scales: {
			r: {
				ticks: {
					stepSize: 25,
					display: false,
				},
				grid: {
					color: "#eee",
				},
				pointLabels: {
					font: {
						size: 14,
						weight: "bold",
						family: "Pretendard",
					},
					color: "#0180FF",
				},
				angleLines: {
					display: false,
				},
				suggestedMin: 0,
				suggestedMax: 100,
			},
		},
		plugins: {
			legend: {
				display: false,
			},
		},
		animation: {
			duration: 2000,
		},
	};

	return (
		<div className="flex justify-center">
			<Radar data={chartData} options={chartOptions} />
		</div>
	);
}
