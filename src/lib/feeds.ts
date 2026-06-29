import type { Env } from "../env";
import { SESSION_COOKIE, parseCookie, readSession } from "./auth";
import { listPosts } from "./content";
import { nowIso } from "./db";
import { mediaKey, putMedia } from "./r2";
import { getSiteIdentity } from "./site";
import { newId, slugify } from "./slug";

const esc = (s: string) =>
	s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export async function rssResponse(env: Env, url: URL): Promise<Response> {
	const { title, tagline } = await getSiteIdentity(env);
	const posts = await listPosts(env, { type: "post", limit: 50, pinnedFirst: false });
	const base = url.origin;
	const items = posts
		.map(
			(p) => `<item>
	<title>${esc(p.title)}</title>
	<link>${base}/${p.locale}/posts/${p.url_slug}</link>
	<guid>${base}/${p.locale}/posts/${p.url_slug}</guid>
	${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}
	${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ""}
</item>`,
		)
		.join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
	<title>${esc(title)}</title>
	<link>${base}</link>
	<atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
	<description>${esc(tagline)}</description>
	${items}
</channel></rss>`;
	return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

export async function sitemapResponse(env: Env, url: URL): Promise<Response> {
	const base = url.origin;
	const [posts, pages, notes] = await Promise.all([
		listPosts(env, { type: "post", limit: 1000 }),
		listPosts(env, { type: "page", limit: 1000 }),
		listPosts(env, { type: "note", limit: 1000 }),
	]);
	const urls = [
		`<url><loc>${base}/en</loc></url>`,
		`<url><loc>${base}/ko</loc></url>`,
		`<url><loc>${base}/en/posts</loc></url>`,
		`<url><loc>${base}/ko/posts</loc></url>`,
		`<url><loc>${base}/en/notes</loc></url>`,
		`<url><loc>${base}/ko/notes</loc></url>`,
		`<url><loc>${base}/en/tags</loc></url>`,
		`<url><loc>${base}/ko/tags</loc></url>`,
		...posts.map((p) => `<url><loc>${base}/${p.locale}/posts/${p.url_slug}</loc><lastmod>${(p.updated_at || "").slice(0, 10)}</lastmod></url>`),
		...notes.map((p) => `<url><loc>${base}/${p.locale}/notes/${p.url_slug}</loc><lastmod>${(p.updated_at || "").slice(0, 10)}</lastmod></url>`),
		...pages.map((p) => `<url><loc>${base}/${p.locale}/${p.url_slug}</loc><lastmod>${(p.updated_at || "").slice(0, 10)}</lastmod></url>`),
	].join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
	return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

export function robotsResponse(url: URL): Response {
	const body = `User-agent: *
Allow: /
Disallow: /admin
Sitemap: ${url.origin}/sitemap.xml
`;
	return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function mediaResponse(env: Env, url: URL): Promise<Response> {
	const key = decodeURIComponent(url.pathname.slice(1)); // "media/<id>/<file>"
	const obj = await env.MEDIA.get(key);
	if (!obj) return new Response("Not found", { status: 404 });
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("etag", obj.httpEtag);
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	return new Response(obj.body, { headers });
}

/** POST /api/media — authenticated multipart upload to R2. */
export async function uploadResponse(env: Env, request: Request, url: URL): Promise<Response> {
	const origin = request.headers.get("origin");
	if (origin && new URL(origin).host !== url.host) return new Response("Forbidden", { status: 403 });
	const user = await readSession(env, parseCookie(request.headers.get("cookie"), SESSION_COOKIE));
	if (!user) return new Response("Unauthorized", { status: 401 });
	const form = await request.formData();
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
	await env.DB.prepare("INSERT INTO media (id,key,filename,mime,size,created_at) VALUES (?,?,?,?,?,?)")
		.bind(id, key, filename, mime, file.size, nowIso())
		.run();
	const publicUrl = `/media/${id}/${filename}`;
	return Response.json({ id, url: publicUrl, markdown: `![${base}](${publicUrl})` });
}
