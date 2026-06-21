import type { APIRoute } from "astro";
import { SESSION_COOKIE, clearCookie, destroySession, parseCookie } from "../../lib/auth";
import { redirect } from "../../lib/http";

export const POST: APIRoute = async (ctx) => {
	const env = ctx.locals.env;
	const sid = parseCookie(ctx.request.headers.get("cookie"), SESSION_COOKIE);
	if (env) await destroySession(env, sid);
	return redirect("/admin/login", clearCookie());
};
