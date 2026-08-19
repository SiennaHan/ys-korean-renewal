import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { api, setAccessToken } from "@/api/api";
import type { LoginToken } from "@/api/apiType";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const res = await api.post<LoginToken>("/auth/login", {
				email,
				password,
			});
			if (res.result && res.data) {
				setAccessToken(res.data.token);
				localStorage.setItem("adminUser", JSON.stringify(res.data.user));
				navigate({ to: "/student" });
			} else {
				setError(res.message || "로그인에 실패했습니다.");
			}
		} catch {
			setError("서버 연결에 실패했습니다.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-sm space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
				<div className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500">
						<span className="font-bold text-lg text-white">학</span>
					</div>
					<h1 className="font-bold text-2xl tracking-tight">
						한국어학당
					</h1>
					<p className="mt-2 text-gray-400 text-sm">
						관리자 계정으로 로그인하세요
					</p>
				</div>

				<form onSubmit={handleLogin} className="space-y-4">
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
							placeholder="비밀번호를 입력하세요"
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
						{isLoading ? "로그인 중..." : "로그인"}
					</button>
				</form>

				<p className="text-center text-gray-400 text-sm">
					계정이 없으신가요?{" "}
					<a
						href="/signup"
						className="font-medium text-violet-600 hover:underline"
					>
						회원가입
					</a>
				</p>
			</div>
		</div>
	);
}
