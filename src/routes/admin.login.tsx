import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { loginFn } from "#/lib/server";

export const Route = createFileRoute("/admin/login")({
	beforeLoad: ({ context }) => {
		if (context.me.needsSetup) throw redirect({ to: "/admin/setup" });
		if (context.me.user) throw redirect({ to: "/admin" });
	},
	component: Login,
});

function Login() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [err, setErr] = useState<string | null>(null);
	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const res = await loginFn({ data: { email, password } });
		if (!res.ok) return setErr(res.error ?? "Login failed.");
		await router.invalidate();
		router.navigate({ to: "/admin" });
	}
	return (
		<div className="admin-main">
			<div className="auth">
				<h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Log in</h1>
				{err && <div className="notice error">{err}</div>}
				<form onSubmit={submit}>
					<div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></div>
					<div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
					<button type="submit" className="btn">Log in</button>
				</form>
			</div>
		</div>
	);
}
