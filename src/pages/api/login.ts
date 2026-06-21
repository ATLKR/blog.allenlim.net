import type { APIRoute } from "astro";
import { createSession, sessionCookie, verifyPassword } from "../../lib/auth";
import { getUserByEmail } from "../../lib/db";
import { redirect, sameOrigin } from "../../lib/http";

export const POST: APIRoute = async (ctx) => {
	const env = ctx.locals.env;
	if (!env || !sameOrigin(ctx)) return new Response("Forbidden", { status: 403 });

	const form = await ctx.request.formData();
	const email = String(form.get("email") ?? "").trim().toLowerCase();
	const password = String(form.get("password") ?? "");
	const next = String(form.get("next") ?? "/admin");
	const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

	const user = await getUserByEmail(env, email);
	if (!user || !(await verifyPassword(password, user.password_hash))) {
		return redirect(`/admin/login?error=1&next=${encodeURIComponent(safeNext)}`);
	}
	const sid = await createSession(env, {
		id: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
	});
	return redirect(safeNext, sessionCookie(sid));
};
