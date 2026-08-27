import {
	INQUIRY_MAX,
	INQUIRY_TOPICS,
	type InquiryTopic,
	sendInquiry,
} from "@/api/inquiry";
import { useAuth } from "@/components/sign/sign-provider";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
 * 문의하기 — phase1/legal_draft_v1.html §02 의 「문의처」
 *
 * **전화가 없다.** 이용자 상당수가 국외라 통화가 현실적이지 않아 글로 받는다
 * (기획 확정 2026-08-27). 보낸 글은 슬랙으로 꽂힌다.
 *
 * **게스트도 보낼 수 있다.** 그래서 답장 주소를 직접 받는다 — 로그인한 사람은
 * 계정 이메일이 미리 채워지지만 고칠 수 있다.
 */
function InquiryPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const router = useRouter();
	const { from } = Route.useSearch();

	const { user } = useAuth();
	const [replyEmail, setReplyEmail] = useState(user?.email ?? "");
	const [topic, setTopic] = useState<InquiryTopic>("etc");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [sending, setSending] = useState(false);
	const [sentId, setSentId] = useState<number | null>(null);

	const canSend = replyEmail.trim() !== "" && message.trim() !== "" && !sending;

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSending(true);
		const res = await sendInquiry({
			replyEmail,
			topic,
			message,
			lang: i18n.language,
			fromPath: from ?? "-",
		});
		setSending(false);
		if (!res.success) {
			const code = res.error ?? "inquiryFailed";
			const key = `inquiry.err_${code}`;
			setError(i18n.exists(key) ? t(key) : code);
			return;
		}
		setSentId(res.id ?? 0);
	};

	/* 보낸 뒤 — 언제 답이 오는지 말하지 않는다. 약속할 수 있는 것만 적는다 */
	if (sentId !== null) {
		return (
			<div className="flex min-h-full flex-col bg-white">
				<div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
					<CheckCircle2 className="h-12 w-12 text-blue-600" />
					<h1 className="font-bold text-gray-900 text-xl">
						{t("inquiry.doneTitle")}
					</h1>
					<p className="text-gray-500 text-sm leading-relaxed">
						{t("inquiry.doneBody", { email: replyEmail })}
					</p>
					<p className="text-gray-400 text-xs">
						{t("inquiry.doneNumber", { id: sentId })}
					</p>
					<Button
						type="button"
						variant="outline"
						size="lg"
						onClick={() => navigate({ to: "/main" })}
						className="mt-2 rounded-lg border-gray-300 text-gray-700"
					>
						{t("inquiry.doneBack")}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-full flex-col bg-white">
			<div className="flex items-center px-4 pt-3">
				<button
					type="button"
					onClick={() => router.history.back()}
					aria-label={t("inquiry.back")}
					className="p-1 text-gray-500 hover:text-gray-700"
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
			</div>

			<div className="flex flex-1 flex-col items-center px-6 pt-4 pb-8">
				<div className="w-full max-w-sm space-y-6">
					<div>
						<h1 className="font-bold text-2xl text-gray-900">
							{t("inquiry.title")}
						</h1>
						<p className="mt-2 text-gray-500 text-sm leading-relaxed">
							{t("inquiry.lead")}
						</p>
					</div>

					<form onSubmit={handleSend} className="space-y-5">
						<div className="space-y-1.5">
							<label
								htmlFor="inquiry-topic"
								className="block font-medium text-gray-700 text-sm"
							>
								{t("inquiry.topic")}
							</label>
							<select
								id="inquiry-topic"
								value={topic}
								onChange={(e) => setTopic(e.target.value as InquiryTopic)}
								className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							>
								{INQUIRY_TOPICS.map((v) => (
									<option key={v} value={v}>
										{t(`inquiry.topic_${v}`)}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="inquiry-email"
								className="block font-medium text-gray-700 text-sm"
							>
								{t("inquiry.email")}
							</label>
							<input
								id="inquiry-email"
								type="email"
								value={replyEmail}
								onChange={(e) => setReplyEmail(e.target.value)}
								placeholder="test@gmail.com"
								required
								className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							/>
							<p className="text-gray-500 text-xs">{t("inquiry.emailHint")}</p>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="inquiry-message"
								className="block font-medium text-gray-700 text-sm"
							>
								{t("inquiry.message")}
							</label>
							<textarea
								id="inquiry-message"
								value={message}
								onChange={(e) =>
									setMessage(e.target.value.slice(0, INQUIRY_MAX))
								}
								placeholder={t("inquiry.messagePlaceholder")}
								rows={7}
								required
								className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							/>
							<p className="text-right text-gray-400 text-xs">
								{message.length} / {INQUIRY_MAX}
							</p>
						</div>

						{error && (
							<p className="text-center text-red-500 text-sm">{error}</p>
						)}

						<Button
							type="submit"
							variant="primary"
							size="lg"
							full
							disabled={!canSend}
							className="rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
						>
							{sending ? t("inquiry.sending") : t("inquiry.send")}
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
