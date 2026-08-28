import Dialog from "@/components/ui/dialog";
import { useEntitlement } from "@/shared/store/entitlement-store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * 학기가 끝났다고 알리는 모달 — 앱에 들어올 때 한 번 뜬다.
 *
 * **처음에는 홈에 정보 카드로 뒀는데 아무도 안 읽는다.** 기획자가 화면을 보고
 * 바로 지적했다(2026-08-28) — 카드는 홈의 다른 것들과 섞여서 눈에 안 걸린다.
 * 그래서 덮고 막는 모달로 바꿨다. 학생이 「확인」을 눌러야 지나간다.
 *
 * **한 번만 뜬다.** 매번 뜨면 앱을 열 때마다 치우는 동작이 하나 늘어난다.
 * 대신 잠긴 것을 누르면 페이월이 같은 말을 다시 한다(`paywall.schoolExpired*`) —
 * 잊었을 때 다시 알 길이 그쪽에 있으므로 이 모달은 한 번이면 된다.
 *
 * 기억하는 키에 **만료 시각을 같이 넣는다.** 다음 학기에 학교가 또 끊으면
 * `access_ended_at` 이 새 값이 되므로 그때 한 번 더 뜬다. 사용자 id 도 넣는다 —
 * 학교 컴퓨터에서 다른 학생이 로그인하면 그 학생에게는 처음이다.
 *
 * 색은 **semantic 토큰**으로 쓴다 — `tokens.css` 가 "화면 코드는 semantic 만 쓴다"
 * 고 정해 뒀다. `token-literal-check.py` 는 지금 CSS 파일만 보므로 여기 hex 를
 * 박아도 안 걸리지만, 걸리지 않는 것과 맞는 것은 다르다.
 *
 * **판정은 서버가 한다.** 여기서 계산하는 것은 없다 — `source:"school"` 이고
 * `expires_at` 이 과거면 끝난 것이다(`api/business/entitlement.py` 의 학교 분기).
 */
const SEEN_KEY = "koreanSemesterNoticeSeen";

/** 이 학생이 이 만료를 이미 봤나. 저장소가 막혀 있으면 "안 봤다" 로 본다 */
function alreadySeen(mark: string): boolean {
	try {
		return localStorage.getItem(SEEN_KEY) === mark;
	} catch {
		return false;
	}
}

function remember(mark: string) {
	try {
		localStorage.setItem(SEEN_KEY, mark);
	} catch {
		/* 사파리 비공개 모드처럼 저장이 막힌 곳이 있다 — 그래도 모달은 닫혀야 한다 */
	}
}

export default function SemesterEndedModal({ userId }: { userId?: number }) {
	const { t } = useTranslation();
	const { entitlement, ready } = useEntitlement();
	const [open, setOpen] = useState(false);

	const endedAt = entitlement?.expires_at ?? null;
	const ended =
		ready &&
		entitlement?.source === "school" &&
		!!endedAt &&
		new Date(endedAt).getTime() < Date.now();
	const mark = `${userId ?? "?"}:${endedAt ?? ""}`;

	useEffect(() => {
		/*
		 * `ready` 가 참이 될 때까지 아무것도 하지 않는다 — 답이 오기 전에 띄우면
		 * 잠깐 잘못된 말을 하게 된다. 게스트는 `source` 가 `guest` 라 여기 안 온다.
		 */
		if (!ended) return;
		if (alreadySeen(mark)) return;
		setOpen(true);
	}, [ended, mark]);

	const close = () => {
		remember(mark);
		setOpen(false);
	};

	if (!open) return null;

	return (
		<Dialog isOpen={open} onClose={close}>
			<div className="px-6 pt-6 pb-5">
				<h2 className="text-center font-bold text-[18px] text-[var(--color-text-heading)] leading-[26px]">
					{t("home.semesterEndedTitle")}
				</h2>
				<p className="mt-3 text-center text-[14px] text-[var(--color-text-sub)] leading-[22px] [word-break:keep-all]">
					{t("home.semesterEndedBody")}
				</p>
				{/*
				 * 버튼이 하나다. 「닫기」와 「확인」을 같이 두면 무엇이 다른지 묻게 되는데
				 * 여기서 학생이 고를 것이 없다 — 알리는 것뿐이다.
				 * 바깥을 눌러도 · Esc 를 눌러도 닫힌다(Dialog 가 한다).
				 */}
				<button
					type="button"
					onClick={close}
					className="mt-6 h-12 w-full rounded-[12px] bg-[var(--color-fill-primary)] font-semibold text-[15px] text-[var(--color-text-inverse)]"
				>
					{t("home.semesterEndedConfirm")}
				</button>
			</div>
		</Dialog>
	);
}
