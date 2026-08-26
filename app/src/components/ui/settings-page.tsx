import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * 설정 성격의 화면(마이페이지에서 밀려 들어오는 화면) 공통 골격.
 *
 * 프로필 수정과 비밀번호 변경이 같은 모양을 각자 적고 있었고, 그래서
 * 조금씩 갈려 있었다 — 주 버튼 반경이 10px(활동 셸은 12px)이었고,
 * 가운데 제목이 `absolute` 인데 부모에 `relative` 가 없어 화면 폭에 기대
 * 우연히 가운데 서 있었다. 값은 활동 셸의 `.primary`(56px · 12px · 600)를 따른다.
 */
export function SettingsPage({
	title,
	onBack,
	children,
	bodyClassName,
	submit,
}: {
	title: string;
	onBack: () => void;
	children: ReactNode;
	/** 본문 칸 사이 간격만 화면마다 다르다 */
	bodyClassName?: string;
	submit: { label: string; disabled?: boolean; onClick: () => void };
}) {
	const { t } = useTranslation();
	return (
		<div className="flex min-h-full flex-col bg-background-base">
			{/* 앱바 */}
			<div className="relative flex h-[58px] items-center px-[16px]">
				<button
					type="button"
					onClick={onBack}
					className="flex size-[24px] items-center justify-center"
					aria-label={t("mypage.back")}
				>
					<ChevronLeft className="size-[24px] stroke-[2] text-text-strong" />
				</button>
				<h1 className="-translate-x-1/2 absolute left-1/2 font-semibold text-[17px] text-text-strong leading-[26px]">
					{title}
				</h1>
			</div>

			<div
				className={`flex flex-1 flex-col px-[16px] pb-[24px] ${bodyClassName ?? "gap-[16px]"}`}
			>
				{children}
			</div>

			{/* 하단 주 버튼 — 활동 셸 .primary 와 같은 값 */}
			<div className="px-[16px] pb-[16px]">
				<button
					type="button"
					onClick={submit.onClick}
					disabled={submit.disabled}
					className="flex h-[56px] w-full items-center justify-center rounded-[12px] bg-fill-primary font-semibold text-[16px] text-text-inverse leading-[24px] disabled:bg-background-disable disabled:text-text-disable"
				>
					{submit.label}
				</button>
			</div>
		</div>
	);
}
