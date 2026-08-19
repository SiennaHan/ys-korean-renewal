import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * 선택지 — 구현 사양 §5 · §6
 *
 * 즉시 채점이다. 누르는 순간이 곧 응답이고 [정답 확인] 같은 동작은 없다.
 * 오답이어도 정답을 공개하지 않고 선택지를 비활성화하지도 않는다 —
 * 재시도형이라 맞힐 때까지 다시 고르게 한다.
 */
export type ChoiceVerdict = "correct" | "wrong";

/** 정렬은 질문 단위 메타데이터다. 같은 질문 안에서 선택지별로 섞지 않는다 (§5) */
export type ContentKind = "jamo" | "word" | "phrase" | "sentence";

const TYPO: Record<ContentKind, string> = {
	jamo: "text-[24px] leading-[32px] font-semibold text-center",
	word: "text-[22px] leading-[30px] font-semibold text-center",
	phrase: "text-[18px] leading-[27px] font-medium text-start",
	sentence: "text-[17px] leading-[26px] font-medium text-start",
};

/** 오답 표면은 약 650ms 뒤 기본으로 돌아온다 (§6) */
const WRONG_RESET_MS = 650;

export interface Choice {
	id: string;
	label: string;
}

export interface ChoiceGroupProps {
	choices: Choice[];
	contentKind?: ContentKind;
	/** 맞힌 선택지. 다음 문항 전까지 유지된다 */
	correctId?: string;
	/** 선택지를 누를 때마다 부른다. 같은 오답을 또 눌러도 매번 부른다 */
	onSelect?: (id: string, verdict: ChoiceVerdict) => void;
	/** 채점 함수 — 셸이 아니라 활동이 정답을 안다 */
	judge?: (id: string) => ChoiceVerdict;
	disabled?: boolean;
}

export function ChoiceGroup({
	choices,
	contentKind = "word",
	correctId,
	onSelect,
	judge,
	disabled,
}: ChoiceGroupProps) {
	// 몇 번째 누름인지까지 들고 있어야 같은 오답을 또 눌렀을 때 진동이 다시 난다 (§6).
	const [wrong, setWrong] = useState<{ id: string; nonce: number } | null>(
		null,
	);
	const nonce = useRef(0);

	useEffect(() => {
		if (!wrong) return;
		const t = setTimeout(() => setWrong(null), WRONG_RESET_MS);
		return () => clearTimeout(t);
	}, [wrong]);

	const handle = (id: string) => {
		if (disabled) return;
		const verdict = judge ? judge(id) : id === correctId ? "correct" : "wrong";
		if (verdict === "wrong") {
			nonce.current += 1;
			setWrong({ id, nonce: nonce.current });
		}
		onSelect?.(id, verdict);
	};

	return (
		<ul className="flex flex-col gap-[10px]">
			{choices.map((c) => {
				const isWrong = wrong?.id === c.id;
				return (
					<li key={c.id}>
						<ChoiceButton
							choice={c}
							contentKind={contentKind}
							isCorrect={correctId === c.id}
							isWrong={isWrong}
							shakeNonce={isWrong ? wrong.nonce : 0}
							disabled={disabled}
							onPress={() => handle(c.id)}
						/>
					</li>
				);
			})}
		</ul>
	);
}

interface ChoiceButtonProps {
	choice: Choice;
	contentKind: ContentKind;
	isCorrect: boolean;
	isWrong: boolean;
	/** 오를 때마다 진동을 다시 재생한다. 0 이면 재생하지 않는다 */
	shakeNonce: number;
	disabled?: boolean;
	onPress: () => void;
}

/**
 * 선택지 하나. 자기 애니메이션 컨트롤을 들고 있다 —
 * 컨트롤을 부모에 하나만 두면 어느 선택지를 눌러도 전부 흔들리고,
 * animate 를 조건부로 붙이면 누른 순간엔 아직 연결돼 있지 않아 아무 일도 일어나지 않는다.
 */
function ChoiceButton({
	choice,
	contentKind,
	isCorrect,
	isWrong,
	shakeNonce,
	disabled,
	onPress,
}: ChoiceButtonProps) {
	const ref = useRef<HTMLButtonElement>(null);
	const reduce = useReducedMotion();

	// key 를 갈아 다시 그리면 진동은 재생되지만 노드가 새로 만들어져 포커스가 날아간다.
	// 키보드·스위치 조작이 §13 의 요구사항이라 그렇게 할 수 없어, 같은 노드에서 다시 재생한다.
	useEffect(() => {
		const el = ref.current;
		if (!shakeNonce || !el) return;
		const anim = reduce
			? // 위치를 흔들면 쓴 것이 지워진 듯 보일 수 있어, 줄임 설정에서는 깜빡임만 준다 (§6)
				el.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], {
					duration: 200,
				})
			: // 좌우 ±6 · 왕복 3회 · 300ms · ease-out · 제자리 복귀 (§6)
				el.animate(
					[-6, 6, -6, 6, -6, 0].map((x) => ({
						transform: `translateX(${x}px)`,
					})),
					{ duration: 300, easing: "ease-out" },
				);
		return () => anim.cancel();
	}, [shakeNonce, reduce]);

	const surface = isCorrect
		? "bg-background-correct border-fill-correct"
		: isWrong
			? "bg-background-wrong border-fill-wrong"
			: "bg-background-surface border-line-normal";

	return (
		<button
			ref={ref}
			type="button"
			onClick={onPress}
			disabled={disabled}
			className={`flex w-full items-center rounded-[14px] border p-4 ${surface} ${TYPO[contentKind]} min-h-[68px] text-text-strong outline-none transition-colors focus-visible:border-2 focus-visible:border-line-focus active:border-fill-primary active:bg-background-choice`}
		>
			<span className="flex-1">{choice.label}</span>
			{isCorrect && <Mark kind="correct" />}
			{isWrong && <Mark kind="wrong" />}
		</button>
	);
}

function Mark({ kind }: { kind: ChoiceVerdict }) {
	return (
		<span
			aria-hidden
			className={`ml-2 shrink-0 text-[20px] ${
				kind === "correct" ? "text-fill-correct" : "text-fill-wrong"
			}`}
		>
			{kind === "correct" ? "✓" : "✕"}
		</span>
	);
}
