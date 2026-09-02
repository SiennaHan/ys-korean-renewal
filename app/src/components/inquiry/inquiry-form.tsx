import {
	INQUIRY_FILE_TYPES,
	INQUIRY_MAX,
	INQUIRY_MAX_FILES,
	INQUIRY_MAX_FILE_BYTES,
	INQUIRY_REPRO_TOPICS,
	INQUIRY_TOPICS,
	type InquiryTopic,
	sendInquiry,
	toDataUrl,
} from "@/api/inquiry";
import { useAuth } from "@/components/sign/sign-provider";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n";
import { ArrowLeft, CheckCircle2, ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * 문의하기 폼 — docs/legal_draft_v1.html §02 의 「문의처」
 *
 * **전화가 없다.** 이용자 상당수가 국외라 통화가 현실적이지 않아 글로 받는다
 * (기획 확정 2026-08-27). 보낸 글은 슬랙으로 꽂힌다.
 *
 * **게스트도, 로그인 못 하는 사람도 보낼 수 있다.** 그래서 답장 주소를 직접
 * 받는다 — 로그인한 사람은 계정 이메일이 미리 채워지지만 고칠 수 있다.
 *
 * 옷은 인증 화면군과 같은 것을 입는다(`styles/auth.css`) — 비밀번호 재설정에서
 * 바로 넘어오는 화면이라 나란히 놓았을 때 튀면 안 된다.
 *
 * ## 왜 라우트에서 뽑아냈나 (2026-09-02)
 *
 * 부르는 곳이 둘이 됐다 — 페이지(`/inquiry`)와 마이페이지 모달. 로직이
 * 라우트 컴포넌트에 박혀 있어서 **모달 쪽에 복붙하면 유형 분기·3칸/1칸·재현
 * 판정이 두 벌이 되고 반드시 갈라진다.** 그래서 로직과 마크업을 통째로 여기
 * 하나로 두고, 다른 것은 **껍데기 두 가지뿐**이다(아래 `asModal`).
 *
 * `/inquiry` 라우트는 그대로 산다 — `legal-doc-page.tsx`(약관 미준비)와
 * `new-password.tsx`(재설정 막힘)가 아직 그 주소로 보낸다.
 */
export default function InquiryForm({
	fromPath,
	onClose,
	onDone,
	asModal = false,
}: {
	/**
	 * 어느 화면에서 눌러 들어왔나. 재현에 쓴다.
	 *
	 * 처음에는 보낼 때 `location.pathname` 을 읽었는데 그때는 이미 `/inquiry` 라
	 * **자기 자신이 찍혔다**(슬랙에서 확인). 부르는 쪽이 명시로 넘긴다.
	 */
	fromPath: string;
	/** 왼쪽 위 단추 — 페이지는 뒤로, 모달은 닫기 */
	onClose: () => void;
	/** 보낸 뒤 「돌아가기」 — 페이지는 /main, 모달은 닫기 */
	onDone: () => void;
	/**
	 * 껍데기만 바꾼다. **로직은 한 벌이다.**
	 *
	 * 페이지와 모달이 다른 것은 딱 둘이다 — 왼쪽 위 단추의 **아이콘과 라벨**
	 * (뒤로 화살표 ↔ 닫기 X), 그리고 성공 화면에서 그 단추를 감출지 여부다.
	 * 그 둘 때문에 컴포넌트를 가르면 나머지 300줄이 두 벌이 된다.
	 */
	asModal?: boolean;
}) {
	const { t } = useTranslation();
	const { user } = useAuth();

	const [replyEmail, setReplyEmail] = useState(user?.email ?? "");
	const [topic, setTopic] = useState<InquiryTopic>("etc");
	const [message, setMessage] = useState("");
	const [actual, setActual] = useState("");
	const [expected, setExpected] = useState("");
	const [error, setError] = useState("");
	const [sending, setSending] = useState(false);
	const [sentId, setSentId] = useState<number | null>(null);
	/**
	 * 캡처가 몇 장 유실됐나.
	 *
	 * **말하지 않으면 보낸 사람만 캡처를 보냈다고 안다.** 저장은 접수와 따로
	 * 실패할 수 있어서(비공개 저장소에 못 닿는 경우) 그때는 솔직히 알린다 —
	 * 글은 이미 접수됐으므로 "실패" 가 아니라 "캡처만 안 붙었다" 다.
	 */
	const [lostShots, setLostShots] = useState(0);

	/**
	 * 화면 캡처. 미리 보여 주려고 `preview`(blob URL)를 같이 든다.
	 *
	 * **고른 즉시 base64 로 바꿔 둔다** — 보낼 때 한꺼번에 바꾸면 큰 그림 셋을
	 * 읽는 동안 버튼이 멈춘 것처럼 보인다.
	 */
	const [shots, setShots] = useState<
		{ id: string; name: string; preview: string; dataUrl: string }[]
	>([]);
	const fileRef = useRef<HTMLInputElement>(null);

	/** bug·content — 화면이 세 칸을 보여주고 재현 정보를 받는 유형 */
	const isRepro = INQUIRY_REPRO_TOPICS.includes(topic);
	const canSend =
		replyEmail.trim() !== "" &&
		message.trim() !== "" &&
		(!isRepro || actual.trim() !== "") &&
		!sending;

	/**
	 * 유형을 바꿔도 이미 적은 글을 잃지 않는다.
	 *
	 * 세 칸 → 한 칸으로 가면 세 칸을 이어 붙여 `message` 하나에 담고,
	 * 반대로 가면 지금 `message`(한 칸일 때 자유 서술)를 그대로
	 * 「무엇을 했는지」자리에 남긴다 — 세 칸에서 시작하지 않았으므로
	 * `actual`·`expected` 는 채울 것이 없다.
	 */
	const handleTopicChange = (next: InquiryTopic) => {
		const nextRepro = INQUIRY_REPRO_TOPICS.includes(next);
		if (isRepro && !nextRepro) {
			const combined = [message, actual, expected]
				.map((v) => v.trim())
				.filter(Boolean)
				.join("\n\n");
			setMessage(combined.slice(0, INQUIRY_MAX));
			setActual("");
			setExpected("");
		}
		setTopic(next);
	};

	const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const picked = [...(e.target.files ?? [])];
		/* 같은 파일을 다시 고를 수 있게 비운다 — 안 비우면 두 번째 선택이 안 먹는다 */
		e.target.value = "";
		if (!picked.length) return;
		setError("");

		if (shots.length + picked.length > INQUIRY_MAX_FILES) {
			setError(t("inquiry.err_fileTooMany", { max: INQUIRY_MAX_FILES }));
			return;
		}
		const added: typeof shots = [];
		for (const file of picked) {
			if (!INQUIRY_FILE_TYPES.includes(file.type)) {
				setError(t("inquiry.err_fileType"));
				return;
			}
			if (file.size > INQUIRY_MAX_FILE_BYTES) {
				setError(t("inquiry.err_fileTooBig"));
				return;
			}
			added.push({
				id: `${file.name}-${file.size}-${added.length}`,
				name: file.name,
				preview: URL.createObjectURL(file),
				dataUrl: await toDataUrl(file),
			});
		}
		setShots((prev) => [...prev, ...added]);
	};

	const removeShot = (id: string) => {
		setShots((prev) => {
			const gone = prev.find((s) => s.id === id);
			/* blob URL 은 놔두면 탭이 닫힐 때까지 메모리에 남는다 */
			if (gone) URL.revokeObjectURL(gone.preview);
			return prev.filter((s) => s.id !== id);
		});
	};

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSending(true);
		const res = await sendInquiry({
			replyEmail,
			topic,
			message,
			actual: isRepro ? actual : undefined,
			expected: isRepro ? expected : undefined,
			lang: i18n.language,
			fromPath,
			files: shots.map((s) => s.dataUrl),
		});
		setSending(false);
		if (!res.success) {
			const code = res.error ?? "inquiryFailed";
			const key = `inquiry.err_${code}`;
			setError(i18n.exists(key) ? t(key) : code);
			return;
		}
		/*
		 * **담당자에게 닿았으면 경고하지 않는다.** 저장(우리 S3)과 전달(슬랙)은
		 * 다른 사실이라, 저장만 실패했는데 "유실됐다" 고 하면 필요 없는 걱정을 시킨다.
		 * 둘 다 안 됐을 때만 말한다.
		 */
		const reached = Math.max(res.files ?? 0, res.filesDelivered ?? 0);
		setLostShots(Math.max(0, (res.filesAttempted ?? 0) - reached));
		setSentId(res.id ?? 0);
	};

	const sent = sentId !== null;

	/*
	 * 왼쪽 위 단추. 페이지에서는 성공 화면에 아예 안 그린다 — 이미 보낸 폼으로
	 * 되돌아갈 이유가 없어서다(원래 동작). 모달에서는 성공 뒤에도 남긴다 —
	 * 덮개를 치우는 길이 그것뿐이면 곤란하다(아래 「돌아가기」 말고).
	 */
	const showTop = asModal || !sent;

	return (
		<>
			<div className={`auth-topbar${sent ? " auth-topbar--end" : ""}`}>
				{showTop && (
					<button
						type="button"
						onClick={onClose}
						aria-label={t(asModal ? "inquiry.close" : "inquiry.back")}
						className="auth-back"
					>
						{asModal ? <X /> : <ArrowLeft />}
					</button>
				)}
			</div>

			<main
				className={`auth-main ${sent ? "auth-main--center" : "auth-main--flow"}`}
			>
				{/* 보낸 뒤 — 언제 답이 오는지 말하지 않는다. 약속할 수 있는 것만 적는다 */}
				{sent ? (
					<div className="auth-panel auth-panel--center">
						<div className="auth-success-icon">
							<CheckCircle2 aria-hidden="true" />
						</div>
						<div className="auth-heading">
							<h1 className="auth-title">{t("inquiry.doneTitle")}</h1>
							<p className="auth-description">
								{t("inquiry.doneBody", { email: replyEmail })}
							</p>
						</div>
						{lostShots > 0 && (
							<p className="auth-alert">
								{t("inquiry.doneShotsLost", { count: lostShots })}
							</p>
						)}
						<p className="auth-hint">
							{t("inquiry.doneNumber", { id: sentId })}
						</p>
						<Button
							variant="outline"
							size="lg"
							full
							onClick={onDone}
							className="auth-secondary"
						>
							{t("inquiry.doneBack")}
						</Button>
					</div>
				) : (
					<div className="auth-panel">
						<div className="auth-heading">
							<h1 className="auth-title">{t("inquiry.title")}</h1>
							<p className="auth-description">{t("inquiry.lead")}</p>
						</div>

						<form onSubmit={handleSend} className="auth-form">
							<div className="auth-field">
								<label htmlFor="inquiry-topic" className="auth-label">
									{t("inquiry.topic")}
								</label>
								<select
									id="inquiry-topic"
									value={topic}
									onChange={(e) =>
										handleTopicChange(e.target.value as InquiryTopic)
									}
									className="auth-select"
								>
									{INQUIRY_TOPICS.map((v) => (
										<option key={v} value={v}>
											{t(`inquiry.topic_${v}`)}
										</option>
									))}
								</select>
							</div>

							<div className="auth-field">
								<label htmlFor="inquiry-email" className="auth-label">
									{t("inquiry.email")}
								</label>
								<input
									id="inquiry-email"
									type="email"
									value={replyEmail}
									onChange={(e) => setReplyEmail(e.target.value)}
									placeholder="test@gmail.com"
									required
									className="auth-input"
								/>
								<p className="auth-hint">{t("inquiry.emailHint")}</p>
							</div>

							<div className="auth-field">
								<label htmlFor="inquiry-message" className="auth-label">
									{t(isRepro ? "inquiry.steps" : "inquiry.message")}
								</label>
								<textarea
									id="inquiry-message"
									value={message}
									onChange={(e) =>
										setMessage(e.target.value.slice(0, INQUIRY_MAX))
									}
									placeholder={t(
										isRepro
											? "inquiry.stepsPlaceholder"
											: "inquiry.messagePlaceholder",
									)}
									required
									className="auth-textarea"
								/>
								<p className="auth-counter">
									{message.length} / {INQUIRY_MAX}
								</p>
							</div>

							{isRepro && (
								<div className="auth-field">
									<label htmlFor="inquiry-actual" className="auth-label">
										{t("inquiry.actual")}
									</label>
									<textarea
										id="inquiry-actual"
										value={actual}
										onChange={(e) =>
											setActual(e.target.value.slice(0, INQUIRY_MAX))
										}
										placeholder={t("inquiry.actualPlaceholder")}
										required
										className="auth-textarea"
									/>
									<p className="auth-counter">
										{actual.length} / {INQUIRY_MAX}
									</p>
								</div>
							)}

							{isRepro && (
								<div className="auth-field">
									<label htmlFor="inquiry-expected" className="auth-label">
										{t("inquiry.expected")}
									</label>
									<textarea
										id="inquiry-expected"
										value={expected}
										onChange={(e) =>
											setExpected(e.target.value.slice(0, INQUIRY_MAX))
										}
										placeholder={t("inquiry.expectedPlaceholder")}
										className="auth-textarea"
									/>
									<p className="auth-counter">
										{expected.length} / {INQUIRY_MAX}
									</p>
								</div>
							)}

							{/*
							 * 화면 캡처 — 글로만 설명하기 어려운 것이 많다.
							 * **비공개로 저장된다**(학습자 화면에는 이름·이메일·기록이 담긴다).
							 */}
							<div className="auth-field">
								<span className="auth-label">{t("inquiry.shots")}</span>
								<p className="auth-hint">
									{t("inquiry.shotsHint", { max: INQUIRY_MAX_FILES })}
								</p>

								{shots.length > 0 && (
									<ul className="inquiry-shots">
										{shots.map((shot) => (
											<li key={shot.id} className="inquiry-shot">
												<img src={shot.preview} alt={shot.name} />
												<button
													type="button"
													onClick={() => removeShot(shot.id)}
													aria-label={t("inquiry.shotRemove", {
														name: shot.name,
													})}
													className="inquiry-shot-remove"
												>
													<X aria-hidden="true" />
												</button>
											</li>
										))}
									</ul>
								)}

								{shots.length < INQUIRY_MAX_FILES && (
									<button
										type="button"
										onClick={() => fileRef.current?.click()}
										className="inquiry-shot-add"
									>
										<ImagePlus aria-hidden="true" />
										{t("inquiry.shotAdd")}
									</button>
								)}
								<input
									ref={fileRef}
									type="file"
									accept={INQUIRY_FILE_TYPES.join(",")}
									multiple
									onChange={handlePick}
									className="inquiry-shot-input"
								/>
							</div>

							{error && <p className="auth-alert">{error}</p>}

							<Button
								type="submit"
								variant="primary"
								size="lg"
								full
								disabled={!canSend}
								className="auth-primary"
							>
								{sending ? t("inquiry.sending") : t("inquiry.send")}
							</Button>
						</form>
					</div>
				)}
			</main>
		</>
	);
}
