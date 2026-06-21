import type { APIRoute } from "astro";

/** Serves uploaded media straight from R2 (key = media/<...>). */
export const GET: APIRoute = async ({ params, locals }) => {
	const env = locals.env;
	const key = params.key;
	if (!env || !key) return new Response(null, { status: 404 });
	const obj = await env.MEDIA.get(`media/${key}`);
	if (!obj) return new Response(null, { status: 404 });
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("etag", obj.httpEtag);
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	return new Response(obj.body, { headers });
};
