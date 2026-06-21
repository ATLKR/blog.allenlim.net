import type { APIRoute } from "astro";
import { createSession, hashPassword, sessionCookie } from "../../lib/auth";
import { countUsers, nowIso } from "../../lib/db";
import { redirect, sameOrigin } from "../../lib/http";
import { newId } from "../../lib/slug";

export const POST: APIRoute = async (ctx) => {
	const env = ctx.locals.env;
	if (!env || !sameOrigin(ctx)) return new Response("Forbidden", { status: 403 });
	if ((await countUsers(env)) > 0) return redirect("/admin/login");

	const form = await ctx.request.formData();
	const name = String(form.get("name") ?? "").trim();
	const email = String(form.get("email") ?? "").trim().toLowerCase();
	const password = String(form.get("password") ?? "");
	if (!email || password.length < 8) return redirect("/admin/setup?error=1");

	const id = newId();
	await env.DB.prepare(
		"INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?,?,?,?, 'admin', ?)",
	)
		.bind(id, email, name || null, await hashPassword(password), nowIso())
		.run();

	const sid = await createSession(env, { id, email, name: name || null, role: "admin" });
	return redirect("/admin", sessionCookie(sid));
};
