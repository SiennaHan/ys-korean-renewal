import InquiryForm from "@/components/inquiry/inquiry-form";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";

export const Route = createFileRoute("/inquiry")({
	/**
	 * 어느 화면에서 눌러 들어왔나. 재현에 쓴다.
	 *
	 * 처음에는 보낼 때 `location.pathname` 을 읽었는데 그때는 이미 `/inquiry` 라
	 * **자기 자신이 찍혔다**(슬랙에서 확인). 부르는 쪽이 명시로 넘긴다.
	 */
	validateSearch: (search: Record<string, unknown>) => ({
		from: typeof search.from === "string" ? search.from : undefined,
	}),
	component: InquiryPage,
});

/**
 * 문의하기 **페이지**.
 *
 * **폼은 여기 없다** — `components/inquiry/inquiry-form.tsx` 가 쥔다(2026-09-02).
 * 마이페이지가 같은 폼을 모달로 열기 때문에, 로직이 여기 박혀 있으면 두 벌이 되고
 * 유형 분기·3칸/1칸·재현 판정이 갈린다. 이 파일에 남은 것은 **주소와 껍데기**뿐이다.
 *
 * 이 라우트를 지우지 마라 — `legal-doc-page.tsx`(약관 미준비)와
 * `new-password.tsx`(재설정 막힘)가 아직 이 주소로 보낸다.
 */
function InquiryPage() {
	const navigate = useNavigate();
	const router = useRouter();
	const { from } = Route.useSearch();

	return (
		<div className="auth-page">
			<InquiryForm
				fromPath={from ?? "-"}
				onClose={() => router.history.back()}
				onDone={() => navigate({ to: "/main" })}
			/>
		</div>
	);
}
