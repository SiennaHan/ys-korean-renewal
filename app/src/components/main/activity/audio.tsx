import type { ReactNode } from "react";
import { IconVolume } from "./icons";

/**
 * 소리 막대 — 듣기 문제의 제시물.
 *
 * 파형 12칸은 장식이다(aria-hidden). 실제 파형이 아니라 "소리가 있다"를
 * 알리는 표시라서 재생 중에만 움직이면 된다.
 */
export function AudioRow({
	label,
	sub,
	onPlay,
}: {
	label: string;
	sub: ReactNode;
	onPlay?: () => void;
}) {
	return (
		<div className="audio-row">
			<button
				type="button"
				className="audio-play"
				data-action="audio"
				aria-label={label}
				onClick={onPlay}
			>
				<IconVolume />
			</button>
			<span className="audio-copy">
				<b>{label}</b>
				<span>{sub}</span>
			</span>
			<Wave />
		</div>
	);
}

export function Wave() {
	return (
		<span className="wave" aria-hidden="true">
			{Array.from({ length: 12 }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: 칸은 위치가 곧 정체성이다
				<i key={i} />
			))}
		</span>
	);
}
