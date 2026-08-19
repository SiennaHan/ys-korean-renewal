import type React from "react";
import { useState } from "react";
import { Smartphone } from "lucide-react";
import { M_WIDTH, T_WIDTH } from "@/shared/constants";
import { isMobile } from "react-device-detect";
import { motion } from "framer-motion";

type DeviceType = "mobile" | "tablet";

interface AppLayoutProps {
	children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
	const [device, setDevice] = useState<DeviceType>("mobile");

	const toggleDevice = () => {
		setDevice((prev) => (prev === "mobile" ? "tablet" : "mobile"));
	};

	// On mobile devices: use native browser scrolling
	if (isMobile) {
		return <div className="h-[100dvh] overflow-y-auto">{children}</div>;
	}

	const currentWidth =
		device === "mobile" ? M_WIDTH : T_WIDTH;
	const widthStyle =
		typeof currentWidth === "number" ? `${currentWidth}px` : currentWidth;

	return (
		<>
			<style>{`
				.hide-scrollbar::-webkit-scrollbar { display: none; }
				.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
			`}</style>

			<div className="h-dvh w-full bg-gray-100 dark:bg-gray-900 flex justify-center relative overflow-hidden">
				<motion.div
					initial={false}
					animate={{ maxWidth: widthStyle }}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 30,
					}}
					className="h-full w-full bg-white dark:bg-black shadow-2xl relative flex flex-col overflow-y-auto hide-scrollbar"
					style={{
						"--app-width": widthStyle,
					} as React.CSSProperties}
				>
					{children}
				</motion.div>

				<div className="fixed bottom-15 left-2 flex flex-col gap-2 z-50">
					<button
						type="button"
						className={`inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors shadow-md h-12 w-12 cursor-pointer ${
							device === "mobile"
								? "bg-white text-slate-900 border border-slate-200 hover:bg-slate-100"
								: "bg-slate-800 text-white hover:bg-slate-700"
						}`}
						onClick={toggleDevice}
						title="Toggle device view"
					>
						<Smartphone className="h-5 w-5" />
					</button>
				</div>
			</div>
		</>
	);
}
