/**
 * 디자인 결정 패널 — **개발 전용**. 실제 화면 위에서 후보 값을 바꿔 보는 도구다.
 *
 * 왜 있나 — `DESIGN.md` §8 이 "정할 값" 을 빈칸으로 두고 있다. 문서만 보고는
 * "주 버튼 높이 56 · 52 · 50" 중 무엇이 나은지 고를 수 없고, **자리표 목업으로도
 * 못 고른다.** 진짜 화면에서 봐야 한다.
 *
 * 어떻게 도나 — CSS 쪽이 `var(--d-btn-h, 56px)` 꼴로 바뀌어 있다. 변수를 아무도
 * 주지 않으면 폴백(오늘 값)이 그대로 쓰이므로 **이 패널을 안 열면 화면이 지금과
 * 100% 같다.** 패널은 프레임 셋에 변수를 얹기만 한다.
 *
 * 화면군마다 오늘 값이 다르다는 것이 요점이다 — 버튼 높이가 활동 56 · 인증 52 ·
 * 내비 50 이다. 그래서 폴백을 각자 두고, 패널은 셋을 **한 값으로 묶어** 덮는다.
 * 그것이 "하나로 볼까" 라는 물음의 모양 그대로다.
 *
 * 프로덕션에 안 들어간다 — `routes/__root.tsx` 가 개발 빌드에서만 그린다.
 */
import { useEffect, useState } from "react";

/** 결정 하나 */
interface Decision {
	/** CSS 변수 이름 */
	v: string;
	label: string;
	/** 후보. 첫째가 "지금 다수" 쪽이다 */
	opts: { value: string; note: string }[];
}

/*
 * 후보 수치는 전부 실제 CSS 에서 뽑은 것이다 — 지어낸 값이 없다.
 * 근거와 "어느 쪽이 다수·정본인가" 는 DESIGN.md §3 · §8 에 있다.
 */
const DECISIONS: Decision[] = [
	{
		v: "--d-btn-h",
		label: "주 버튼 높이",
		opts: [
			{ value: "56px", note: "활동" },
			{ value: "52px", note: "인증" },
			{ value: "50px", note: "내비" },
		],
	},
	{
		v: "--d-btn-r",
		label: "버튼·선택지·입력칸 radius",
		opts: [
			{ value: "12px", note: "활동·인증" },
			{ value: "9px", note: "내비" },
			{ value: "10px", note: "클립" },
		],
	},
	{
		v: "--d-card-r",
		label: "카드 radius",
		opts: [
			{ value: "16px", note: "활동" },
			{ value: "14px", note: "내비" },
			{ value: "10px", note: "클립" },
		],
	},
	{
		v: "--d-chip-r",
		label: "칩 radius",
		opts: [
			{ value: "8px", note: "활동" },
			{ value: "9px", note: "내비" },
			{ value: "999px", note: "알약" },
		],
	},
	{
		v: "--d-appbar-h",
		label: "앱바 높이",
		opts: [
			{ value: "58px", note: "활동" },
			{ value: "56px", note: "인증" },
		],
	},
];

/** 변수를 얹을 자리. 화면군의 프레임 전부 */
const FRAMES = ".activity-frame, .nav-frame, .auth-page, .game-frame, body";
const KEY = "ys-design-decisions";

export default function DesignDecisions() {
	const [open, setOpen] = useState(false);
	const [picked, setPicked] = useState<Record<string, string>>(() => {
		try {
			return JSON.parse(localStorage.getItem(KEY) || "{}");
		} catch {
			return {};
		}
	});

	useEffect(() => {
		const id = "ys-design-decisions-style";
		let el = document.getElementById(id) as HTMLStyleElement | null;
		const body = Object.entries(picked)
			.map(([v, value]) => `${v}:${value};`)
			.join("");
		if (!body) {
			/* 고른 것이 없으면 규칙 자체를 걷는다 — 폴백(오늘 값)으로 돌아간다 */
			el?.remove();
			return;
		}
		if (!el) {
			el = document.createElement("style");
			el.id = id;
			document.head.appendChild(el);
		}
		el.textContent = `${FRAMES}{${body}}`;
		try {
			localStorage.setItem(KEY, JSON.stringify(picked));
		} catch {
			/* 사생활 창 등 — 저장만 못 할 뿐 화면은 돈다 */
		}
	}, [picked]);

	const changed = Object.keys(picked).length;

	if (!open) {
		return (
			<button
				type="button"
				onClick={() => setOpen(true)}
				style={{ ...fab, background: changed ? "#0180ff" : "#24425f" }}
			>
				디자인{changed ? ` ${changed}` : ""}
			</button>
		);
	}

	return (
		<div style={panel}>
			<div style={head}>
				<b>디자인 결정판</b>
				<button type="button" onClick={() => setOpen(false)} style={x}>
					✕
				</button>
			</div>
			<p style={note}>
				고르면 <b>지금 보고 있는 진짜 화면</b>이 그 값으로 그려진다. 아무것도 안
				고르면 지금과 같다.
			</p>

			{DECISIONS.map((d) => (
				<div key={d.v} style={{ marginBottom: 12 }}>
					<div style={label}>{d.label}</div>
					<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
						{d.opts.map((o) => {
							const on = picked[d.v] === o.value;
							return (
								<button
									key={o.value}
									type="button"
									onClick={() =>
										setPicked((p) => {
											const next = { ...p };
											if (on) delete next[d.v];
											else next[d.v] = o.value;
											return next;
										})
									}
									style={{ ...chip, ...(on ? chipOn : null) }}
								>
									{o.value}
									<em style={from}>{o.note}</em>
								</button>
							);
						})}
					</div>
				</div>
			))}

			<div style={{ display: "flex", gap: 6, marginTop: 14 }}>
				<button type="button" onClick={() => setPicked({})} style={btn}>
					지금 값으로
				</button>
				<button
					type="button"
					style={{ ...btn, ...btnPri }}
					onClick={() => {
						const lines = DECISIONS.map((d) => {
							const v = picked[d.v];
							return `- ${d.label}: ${v ?? "(지금 그대로)"}`;
						}).join("\n");
						void navigator.clipboard
							?.writeText(`## DESIGN.md §8 — 정한 값\n${lines}`)
							.catch(() => {
								/* 클립보드가 막히면 조용히 넘어간다 */
							});
					}}
				>
					결정 복사
				</button>
			</div>
			<p style={{ ...note, marginTop: 10 }}>
				고른 값은 브라우저에 남는다. 개발 빌드에만 나온다.
			</p>
		</div>
	);
}

/* 도구라 스타일은 여기 둔다 — 앱 CSS 를 늘리지 않는다 */
const fab: React.CSSProperties = {
	position: "fixed",
	right: 14,
	bottom: 14,
	zIndex: 99999,
	border: 0,
	borderRadius: 999,
	padding: "9px 14px",
	color: "#fff",
	fontSize: 12,
	fontWeight: 700,
	fontFamily: "inherit",
	cursor: "pointer",
	boxShadow: "0 6px 20px rgba(0,0,0,.22)",
};
const panel: React.CSSProperties = {
	position: "fixed",
	right: 14,
	bottom: 14,
	zIndex: 99999,
	width: 288,
	maxHeight: "82vh",
	overflow: "auto",
	padding: 14,
	borderRadius: 14,
	background: "#fff",
	border: "1px solid #dce1e7",
	boxShadow: "0 18px 54px rgba(33,49,65,.24)",
	fontFamily: "inherit",
	color: "#383a3f",
};
const head: React.CSSProperties = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	fontSize: 14,
	color: "#24425f",
};
const x: React.CSSProperties = {
	border: 0,
	background: "none",
	fontSize: 14,
	cursor: "pointer",
	color: "#7f848d",
};
const note: React.CSSProperties = {
	margin: "6px 0 12px",
	fontSize: 11.5,
	lineHeight: 1.55,
	color: "#7f848d",
};
const label: React.CSSProperties = {
	fontSize: 11.5,
	fontWeight: 700,
	color: "#24425f",
	marginBottom: 5,
};
const chip: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	alignItems: "flex-start",
	gap: 1,
	padding: "5px 9px",
	borderRadius: 8,
	border: "1.5px solid #e3e7ec",
	background: "#fff",
	fontSize: 12,
	fontWeight: 700,
	color: "#383a3f",
	fontFamily: "inherit",
	cursor: "pointer",
};
const chipOn: React.CSSProperties = {
	borderColor: "#0180ff",
	background: "#f2f8ff",
	color: "#0180ff",
};
const from: React.CSSProperties = {
	fontStyle: "normal",
	fontSize: 10,
	fontWeight: 500,
	color: "#7f848d",
};
const btn: React.CSSProperties = {
	flex: 1,
	padding: "7px 0",
	borderRadius: 8,
	border: "1px solid #d3d9e0",
	background: "#fff",
	fontSize: 12,
	fontWeight: 700,
	color: "#24425f",
	fontFamily: "inherit",
	cursor: "pointer",
};
const btnPri: React.CSSProperties = {
	background: "#0180ff",
	borderColor: "#0180ff",
	color: "#fff",
};
