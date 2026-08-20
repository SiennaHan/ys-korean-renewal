import type { CSSProperties, ReactNode } from "react";

/**
 * 문제 카드 — 지시문 한 줄과 그 아래 제시물.
 *
 * 제시물이 없으면 구분선째로 빠진다. 어휘 미리보기·쓰기 캔버스처럼
 * 지시문만 있는 화면이 그렇다 (목업 gapProblem).
 */
export function ProblemCard({
	instruction,
	children,
	stimulusStyle,
}: {
	instruction: ReactNode;
	children?: ReactNode;
	stimulusStyle?: CSSProperties;
}) {
	return (
		<section className="problem-card">
			<header className="instruction">
				<h2>{instruction}</h2>
			</header>
			{children !== undefined && (
				<div className="stimulus" style={stimulusStyle}>
					{children}
				</div>
			)}
		</section>
	);
}
