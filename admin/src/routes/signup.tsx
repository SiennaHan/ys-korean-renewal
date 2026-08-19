import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/api/api";

export const Route = createFileRoute("/signup")({
	component: SignupPage,
});

function SignupPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (password !== passwordConfirm) {
			setError("비밀번호가 일치하지 않습니다.");
			return;
		}

		if (password.length < 6) {
			setError("비밀번호는 6자 이상이어야 합니다.");
			return;
		}

		setIsLoading(true);

		try {
			const res = await api.post("/auth/signup", { email, password, name });
			if (res.result && res.data) {
				setIsSuccess(true);
			} else {
				setError(res.message || "회원가입에 실패했습니다.");
			}
		} catch {
			setError("서버 연결에 실패했습니다.");
		} finally {
			setIsLoading(false);
		}
	};

	if (isSuccess) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="w-full max-w-sm space-y-6 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500">
						<span className="font-bold text-lg text-white">학</span>
					</div>
					<h1 className="font-bold text-2xl tracking-tight">
						가입 신청 완료
					</h1>
					<p className="text-gray-400 text-sm">
						마스터 관리자의 승인 후 로그인할 수 있습니다.
					</p>
					<button
						type="button"
						className="w-full rounded-full bg-gray-900 py-2.5 font-medium text-sm text-white transition hover:bg-gray-800"
						onClick={() => navigate({ to: "/login" })}
					>
						로그인 페이지로 이동
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-sm space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
				<div className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500">
						<span className="font-bold text-lg text-white">학</span>
					</div>
					<h1 className="font-bold text-2xl tracking-tight">
						관리자 회원가입
					</h1>
					<p className="mt-2 text-gray-400 text-sm">
						가입 후 마스터 관리자의 승인이 필요합니다
					</p>
				</div>

				<form onSubmit={handleSignup} className="space-y-4">
					<div>
						<label
							htmlFor="name"
							className="mb-1.5 block font-medium text-gray-700 text-sm"
						>
							이름
						</label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="홍길동"
							required
						/>
					</div>
					<div>
						<label
							htmlFor="email"
							className="mb-1.5 block font-medium text-gray-700 text-sm"
						>
							이메일
						</label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="admin@example.com"
							required
						/>
					</div>
					<div>
						<label
							htmlFor="password"
							className="mb-1.5 block font-medium text-gray-700 text-sm"
						>
							비밀번호
						</label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="6자 이상"
							required
						/>
					</div>
					<div>
						<label
							htmlFor="passwordConfirm"
							className="mb-1.5 block font-medium text-gray-700 text-sm"
						>
							비밀번호 확인
						</label>
						<Input
							id="passwordConfirm"
							type="password"
							value={passwordConfirm}
							onChange={(e) => setPasswordConfirm(e.target.value)}
							placeholder="비밀번호를 다시 입력하세요"
							required
						/>
					</div>

					{error && (
						<p className="text-center text-red-500 text-sm">
							{error}
						</p>
					)}

					<button
						type="submit"
						className="w-full rounded-full bg-gray-900 py-2.5 font-medium text-sm text-white transition hover:bg-gray-800 disabled:opacity-50"
						disabled={isLoading}
					>
						{isLoading ? "가입 중..." : "회원가입"}
					</button>
				</form>

				<p className="text-center text-gray-400 text-sm">
					이미 계정이 있으신가요?{" "}
					<a
						href="/login"
						className="font-medium text-violet-600 hover:underline"
					>
						로그인
					</a>
				</p>
			</div>
		</div>
	);
}
