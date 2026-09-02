import InquiryForm from "@/components/inquiry/inquiry-form";
import Dialog from "@/components/ui/dialog";

/**
 * 마이페이지에서 여는 문의하기 — **페이지 이동 없이** 그 자리에서 연다.
 *
 * ## 왜 모달인가
 *
 * 전에는 이 버튼이 `/my-profile`(마이페이지에서 「프로필 수정」을 한 번 더 눌러야
 * 나오는 하위 화면) 안에 있었다. 그 화면 주석은 "앱 안에서 도움을 청할 수 있는
 * 유일한 자리" 라고 적어 뒀는데 **두 번 눌러야 닿아서 사실상 없는 것과 같았다.**
 * 최상위 My 로 끌어올리면서, 설정 목록을 떠나지 않도록 모달로 바꿨다(2026-09-02).
 *
 * ## 폼은 여기 없다
 *
 * `components/inquiry/inquiry-form.tsx` 하나가 쥔다 — `/inquiry` 페이지와 **같은
 * 컴포넌트**다. 복붙했으면 유형 분기(`INQUIRY_REPRO_TOPICS`)와 3칸/1칸 전환이
 * 두 벌이 되고 반드시 갈라진다.
 *
 * ## 높이
 *
 * 폼이 길다(유형·이메일·본문 + 재현 두 칸 + 캡처). `Dialog` 상자는 높이를 안 정하므로
 * **여기서 화면 높이의 80%로 묶고 안에서 스크롤**시킨다 — 안 묶으면 긴 유형(`bug`)에서
 * 보내기 버튼이 화면 밖으로 나간다.
 */
export default function InquiryModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	if (!open) return null;
	return (
		<Dialog isOpen={open} onClose={onClose}>
			<div className="max-h-[80vh] w-[320px] overflow-y-auto">
				{/*
				 * `fromPath` 는 하드코딩이다. 전에는 `search: { from: "/my-profile" }` 로
				 * 라우트 파라미터를 넘겼는데, 이제 페이지 이동이 없어서 넘길 자리가 없다 —
				 * 그리고 실제로 누른 자리가 최상위 My 다.
				 */}
				<InquiryForm
					fromPath="/main/my"
					onClose={onClose}
					onDone={onClose}
					asModal
				/>
			</div>
		</Dialog>
	);
}
