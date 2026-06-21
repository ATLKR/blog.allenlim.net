import type { APIContext } from "astro";

/** Reject cross-origin mutations (defense-in-depth atop SameSite=Lax cookies). */
export function sameOrigin(ctx: APIContext): boolean {
	const origin = ctx.request.headers.get("origin");
	if (!origin) return true; // non-browser / same-origin navigations may omit it
	try {
		return new URL(origin).host === ctx.url.host;
	} catch {
		return false;
	}
}

export function redirect(to: string, cookie?: string): Response {
	const headers = new Headers({ Location: to });
	if (cookie) headers.append("Set-Cookie", cookie);
	return new Response(null, { status: 303, headers });
}

export function badRequest(message: string): Response {
	return new Response(JSON.stringify({ error: message }), {
		status: 400,
		headers: { "Content-Type": "application/json" },
	});
}
