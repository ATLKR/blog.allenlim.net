import type { APIRoute } from "astro";
import { listPosts } from "../lib/content";
import { getSiteIdentity } from "../lib/site";

const esc = (s: string) =>
	s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export const GET: APIRoute = async ({ locals, site }) => {
	const env = locals.env;
	const { title, tagline } = await getSiteIdentity(env);
	// Public only — unlisted/private/draft never appear in the feed.
	const posts = env ? await listPosts(env, { limit: 50 }) : [];
	const base = (site ?? new URL("https://blog.allenlim.net")).origin;
	const items = posts
		.map(
			(p) => `<item>
	<title>${esc(p.title)}</title>
	<link>${base}/posts/${p.slug}</link>
	<guid>${base}/posts/${p.slug}</guid>
	${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}
	${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ""}
</item>`,
		)
		.join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
	<title>${esc(title)}</title>
	<link>${base}</link>
	<description>${esc(tagline)}</description>
	${items}
</channel></rss>`;
	return new Response(xml, {
		headers: { "Content-Type": "application/xml; charset=utf-8" },
	});
};
