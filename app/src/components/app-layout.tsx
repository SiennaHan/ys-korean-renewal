import { M_WIDTH, T_WIDTH } from "@/shared/constants";
import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { isMobile } from "react-device-detect";

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

	const currentWidth = device === "mobile" ? M_WIDTH : T_WIDTH;
	const widthStyle =
		typeof currentWidth === "number" ? `${currentWidth}px` : currentWidth;

	return (
		<>
			<style>{`
				.hide-scrollbar::-webkit-scrollbar { display: none; }
				.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
			`}</style>

			<div className="relative flex h-dvh w-full justify-center overflow-hidden bg-gray-100 dark:bg-gray-900">
				<motion.div
					initial={false}
					animate={{ maxWidth: widthStyle }}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 30,
					}}
					className="hide-scrollbar relative flex h-full w-full flex-col overflow-y-auto bg-white shadow-2xl dark:bg-black"
					style={
						{
							"--app-width": widthStyle,
						} as React.CSSProperties
					}
				>
					{children}
				</motion.div>

				<div className="fixed bottom-15 left-2 z-50 flex flex-col gap-2">
					<button
						type="button"
						className={`inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full font-medium text-sm shadow-md transition-colors ${
							device === "mobile"
								? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
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
