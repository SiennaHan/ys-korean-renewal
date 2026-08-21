import { useAuth } from "@/components/sign/sign-provider";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type React from "react";
import { useEffect } from "react";

const IntroSection: React.FC = () => {
	const navigate = useNavigate();
	const { isSignedIn, isLoading } = useAuth();

	useEffect(() => {
		if (isLoading) return;

		const timer = setTimeout(() => {
			// 게스트 토큰이 있어도 홈으로 — /main 과 같은 기준이다
			if (isSignedIn) {
				navigate({ to: "/main" });
			} else {
				navigate({ to: "/login" });
			}
		}, 2000);

		return () => clearTimeout(timer);
	}, [isLoading, isSignedIn, navigate]);

	return (
		<div className="flex h-full items-center justify-center bg-[#0180FF]">
			<motion.div
				initial={{ opacity: 0, scale: 0.5 }}
				animate={{ opacity: 1, scale: 1.0 }}
				exit={{ opacity: 0, scale: 2.0 }}
				transition={{ duration: 1 }}
			>
				{/* <img src="/images/main-logo.png" width="247" height="103"/> */}

				<div className="text-center font-bold text-[32px] text-white">
					연세 글로벌 한국어
				</div>
				<div className="text-center font-semibold text-[12px] text-white">
					YONSEI GLOBAL KOREAN
				</div>
			</motion.div>
		</div>
	);
};

export default IntroSection;
