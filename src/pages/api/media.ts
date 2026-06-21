import type { APIRoute } from "astro";
import { nowIso } from "../../lib/db";
import { sameOrigin } from "../../lib/http";
import { mediaKey, putMedia } from "../../lib/r2";
import { newId, slugify } from "../../lib/slug";

export const POST: APIRoute = async (ctx) => {
	const env = ctx.locals.env;
	if (!env) return new Response("No env", { status: 500 });
	if (!ctx.locals.user) return new Response("Unauthorized", { status: 401 });
	if (!sameOrigin(ctx)) return new Response("Forbidden", { status: 403 });

	const form = await ctx.request.formData();
	const file = form.get("file");
	if (!(file instanceof File)) return new Response("No file", { status: 400 });

	const id = newId();
	const dot = file.name.lastIndexOf(".");
	const ext = dot > -1 ? file.name.slice(dot) : "";
	const base = slugify(dot > -1 ? file.name.slice(0, dot) : file.name);
	const filename = `${base}${ext}`;
	const key = mediaKey(id, filename);
	const mime = file.type || "application/octet-stream";

	await putMedia(env, key, await file.arrayBuffer(), mime);
	await env.DB.prepare(
		"INSERT INTO media (id, key, filename, mime, size, created_at) VALUES (?,?,?,?,?,?)",
	)
		.bind(id, key, filename, mime, file.size, nowIso())
		.run();

	// Public URL served by src/pages/media/[...key].ts
	const url = `/media/${id}/${filename}`;
	return new Response(JSON.stringify({ id, url, markdown: `![${base}](${url})` }), {
		headers: { "Content-Type": "application/json" },
	});
};
