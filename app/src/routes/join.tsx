/**
 * 기관 발급 코드 입력 — 학교가 준 코드를 넣으면 그 학교 학생으로 가입한다.
 *
 * 들어오는 길이 둘이다.
 *   ① 인쇄된 QR·주소 → `/join?code=ABCD2345` (칸이 채워지고 바로 확인한다)
 *   ② 로그인 화면 아래의 「코드 입력」 → `/join` (빈 칸)
 *
 * **찾은 뒤에 한 박자를 둔다.** 오타가 *다른 유효한 코드*에 떨어질 수 있고,
 * 그러면 학생은 남의 학교 학생이 된다. 되돌릴 길이 지금 없다 — 학생이 스스로
 * 잡을 수 있는 유일한 단서가 학교 이름이라 그것을 보여 주고 한 번 더 누르게 한다.
 *
 * **코드는 URL 로 들고 간다. `localStorage` 를 쓰지 않는다** — 학교 컴퓨터에서
 * 한 학생이 가입하고 나가면 다음 사람이 그 학교로 가입한다.
 */
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import {
	formatCode,
	joinCodeErrorKey,
	normalizeCode,
	verifyJoinCode,
} from "@/api/join-code";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/join")({
	validateSearch: (search: Record<string, unknown>) => ({
		code: typeof search.code === "string" ? search.code : undefined,
	}),
	component: JoinPage,
});

function JoinPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const { code: codeFromUrl } = Route.useSearch();

	const [value, setValue] = useState(() => formatCode(codeFromUrl ?? ""));
	const [isChecking, setIsChecking] = useState(false);
	const [schoolName, setSchoolName] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const check = useCallback(
		async (raw: string) => {
			const normalized = normalizeCode(raw);
			if (!normalized) {
				setError(t("joinCode.err_codeRequired"));
				return;
			}
			setIsChecking(true);
			setError(null);
			const res = await verifyJoinCode(normalized);
			setIsChecking(false);

			if (res.valid) {
				setSchoolName(res.schoolName ?? null);
				return;
			}
			// 못 옮기는 코드는 그대로 보여 준다 — 뭉개면 이유가 사라진다
			const key = joinCodeErrorKey(res.reason);
			setError(key && i18n.exists(key) ? t(key) : (res.reason ?? t("joinCode.err_codeCheckFailed")));
		},
		[t, i18n],
	);

	/*
	 * 인쇄된 QR 로 들어오면 칸이 채워진 채 시작하므로 바로 확인한다.
	 * **한 번만 돈다** — `check` 가 바뀌어도 다시 부르지 않는다.
	 */
	const autoRan = useRef(false);
	useEffect(() => {
		if (autoRan.current || !codeFromUrl) return;
		autoRan.current = true;
		void check(codeFromUrl);
	}, [codeFromUrl, check]);

	const goSignUp = () => {
		navigate({ to: "/signup", search: { code: normalizeCode(value) } });
	};

	return (
		<div className="auth-page">
			<div className="auth-topbar">
				<button
					type="button"
					onClick={() => navigate({ to: "/login" })}
					aria-label={t("signup.back")}
					className="auth-back"
				>
					<ArrowLeft />
				</button>
				<LanguageSelector />
			</div>

			<main className="auth-main auth-main--center">
				<div className="auth-panel">
					<div className="auth-heading">
						<h1 className="auth-title">{t("joinCode.title")}</h1>
						<p className="auth-description">{t("joinCode.lead")}</p>
					</div>

					{schoolName !== null ? (
						/* 찾음 — 한 박자 둔다 */
						<>
							<div className="auth-info">
								<p className="auth-info-title">
									{t("joinCode.foundTitle", { school: schoolName })}
								</p>
								<p className="auth-info-body">
									{t("joinCode.foundBody", { school: schoolName })}
								</p>
							</div>
							<Button type="button" size="lg" full onClick={goSignUp}>
								{t("joinCode.foundContinue")}
							</Button>
							<button
								type="button"
								onClick={() => {
									setSchoolName(null);
									setError(null);
								}}
								className="auth-link"
							>
								{t("joinCode.retype")}
							</button>
						</>
					) : (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								void check(value);
							}}
							className="auth-form"
						>
							<div className="auth-field">
								<label htmlFor="join-code" className="auth-label">
									{t("joinCode.label")}
								</label>
								<input
									id="join-code"
									type="text"
									inputMode="text"
									autoCapitalize="characters"
									autoComplete="off"
									autoCorrect="off"
									spellCheck={false}
									maxLength={9}
									required
									value={value}
									onChange={(e) => setValue(formatCode(e.target.value))}
									placeholder={t("joinCode.placeholder")}
									disabled={isChecking}
									className="auth-input"
								/>
								<p className="auth-hint">{t("joinCode.hint")}</p>
							</div>

							{error && (
								<p className="auth-alert" role="alert">
									<CircleAlert aria-hidden="true" />
									<span>{error}</span>
								</p>
							)}

							<Button type="submit" size="lg" full disabled={isChecking}>
								{isChecking ? t("joinCode.checking") : t("joinCode.submit")}
							</Button>
						</form>
					)}

					{/*
					 * 코드 없이 가는 길. **막다른 길이라는 것을 같이 말한다** —
					 * 지금은 가입한 뒤에 코드를 넣는 방법이 없다.
					 */}
					<div className="auth-support">
						<button
							type="button"
							onClick={() => navigate({ to: "/signup", search: { code: undefined } })}
							className="auth-link"
						>
							{t("joinCode.withoutCode")}
						</button>
						<p className="auth-hint">{t("joinCode.withoutCodeNote")}</p>
					</div>
				</div>
			</main>
		</div>
	);
}
