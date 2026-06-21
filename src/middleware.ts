import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, parseCookie, readSession } from "./lib/auth";
import { getEnv } from "./lib/env";

export const onRequest = defineMiddleware(async (context, next) => {
	const env = getEnv();
	context.locals.env = env;
	context.locals.user = null;

	const sid = parseCookie(context.request.headers.get("cookie"), SESSION_COOKIE);
	context.locals.user = await readSession(env, sid);

	const { pathname } = context.url;

	// Guard the admin area. /admin/login and /admin/setup are always reachable.
	const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
	const isOpen = pathname.startsWith("/admin/login") || pathname.startsWith("/admin/setup");
	if (isAdmin && !isOpen && !context.locals.user) {
		const to = encodeURIComponent(pathname + context.url.search);
		return context.redirect(`/admin/login?next=${to}`);
	}

	return next();
});
