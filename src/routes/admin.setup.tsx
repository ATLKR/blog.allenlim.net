import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { setupFn } from "#/lib/server";

export const Route = createFileRoute("/admin/setup")({
	beforeLoad: ({ context }) => {
		if (!context.me.needsSetup) throw redirect({ to: context.me.user ? "/admin" : "/admin/login" });
	},
	component: Setup,
});

function Setup() {
	const router = useRouter();
	const [f, setF] = useState({ name: "", email: "", password: "" });
	const [err, setErr] = useState<string | null>(null);
	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const res = await setupFn({ data: f });
		if (!res.ok) return setErr(res.error ?? "Setup failed.");
		await router.invalidate();
		router.navigate({ to: "/admin" });
	}
	return (
		<div className="admin-main">
			<div className="auth">
				<h1 style={{ fontSize: "1.5rem" }}>Create your admin account</h1>
				<p className="muted" style={{ margin: ".4rem 0 1.5rem", fontSize: ".9rem" }}>First-run setup — the single owner account.</p>
				{err && <div className="notice error">{err}</div>}
				<form onSubmit={submit}>
					<div className="field"><label>Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
					<div className="field"><label>Email</label><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
					<div className="field"><label>Password <span className="hint">(≥ 8 chars)</span></label><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
					<button type="submit" className="btn">Create account</button>
				</form>
			</div>
		</div>
	);
}
