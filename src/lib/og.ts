import type { Env } from "../env";
import { getEntryByUrlSlug } from "./content";

const xml = (s: string) =>
	s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** Wrap a title into <=3 lines (char-based, works for CJK + Latin). */
function wrap(title: string, max = 20): string[] {
	const words = title.split(/(\s+)/);
	const lines: string[] = [];
	let cur = "";
	for (const w of words) {
		if ((cur + w).length > max && cur) {
			lines.push(cur.trim());
			cur = "";
		}
		cur += w;
		while (cur.length > max) {
			lines.push(cur.slice(0, max));
			cur = cur.slice(max);
		}
	}
	if (cur.trim()) lines.push(cur.trim());
	if (lines.length > 3) return [...lines.slice(0, 3).slice(0, 2), `${lines[2].slice(0, max - 1)}…`];
	return lines;
}

/**
 * Dynamic share card as SVG. Cover images (raster) remain the primary og:image;
 * this is the fallback for entries without one.
 */
export async function ogResponse(env: Env, url: URL): Promise<Response> {
	const locale = url.searchParams.get("l") === "ko" ? "ko" : "en";
	const postsM = url.pathname.match(/^\/og\/posts\/(.+)\.svg$/);
	const notesM = url.pathname.match(/^\/og\/notes\/(.+)\.svg$/);
	const pageM = url.pathname.match(/^\/og\/(.+)\.svg$/);
	const slug = postsM ? decodeURIComponent(postsM[1]) : notesM ? decodeURIComponent(notesM[1]) : pageM ? decodeURIComponent(pageM[1]) : null;
	const entry = slug ? await getEntryByUrlSlug(env, slug, locale) : null;

	const title = entry?.title ?? "allenlim.net";
	const tag = entry?.tags?.[0]?.label ?? entry?.categories?.[0]?.label ?? "";
	const lines = wrap(title, 20);
	const startY = 300 - (lines.length - 1) * 40;
	const tspans = lines
		.map((ln, i) => `<text x="80" y="${startY + i * 78}" class="t">${xml(ln)}</text>`)
		.join("");

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0d1b2a"/><stop offset="1" stop-color="#0066cc"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <style>
    .t{ font-family:'Inter','Apple SD Gothic Neo','Noto Sans KR',sans-serif; font-size:64px; font-weight:700; fill:#fff; }
    .k{ font-family:sans-serif; font-size:26px; fill:#cfe3ff; letter-spacing:2px; text-transform:uppercase; }
    .s{ font-family:sans-serif; font-size:30px; fill:#cfe3ff; }
  </style>
  ${tag ? `<text x="80" y="120" class="k">${xml(tag)}</text>` : ""}
  ${tspans}
  <text x="80" y="560" class="s">allenlim.net</text>
</svg>`;
	return new Response(svg, {
		headers: {
			"Content-Type": "image/svg+xml; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
}
