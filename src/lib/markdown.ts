import { marked } from "marked";
import { slugify } from "./slug";

marked.setOptions({ gfm: true, breaks: false });

const WORDS_PER_MINUTE = 200;
const CJK_PER_MINUTE = 500;
const CJK_RE = /\p{Script=Han}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}/gu;

export interface TocItem {
	level: number;
	text: string;
	id: string;
}

/** Render markdown to HTML. Admin-authored (single-trust) content. */
export function renderMarkdown(md: string): string {
	return marked.parse(md ?? "", { async: false }) as string;
}

/** Render markdown, injecting heading ids and returning a table of contents. */
export function renderWithToc(md: string): { html: string; toc: TocItem[] } {
	const toc: TocItem[] = [];
	const seen = new Set<string>();
	let html = renderMarkdown(md);
	html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_m, lvl: string, inner: string) => {
		const level = Number(lvl);
		const text = inner.replace(/<[^>]+>/g, "").trim();
		let id = slugify(text) || "section";
		let n = 2;
		while (seen.has(id)) id = `${slugify(text)}-${n++}`;
		seen.add(id);
		if (level === 2 || level === 3) toc.push({ level, text, id });
		return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
	});
	return { html, toc };
}

export function toPlainText(md: string): string {
	return (md ?? "")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`]*`/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[#>*_~\-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function readingStats(md: string): { minutes: number; words: number } {
	const text = toPlainText(md);
	const cjk = text.match(CJK_RE)?.length ?? 0;
	const words = text.replace(CJK_RE, " ").split(/\s+/).filter(Boolean).length;
	const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE + cjk / CJK_PER_MINUTE));
	return { minutes, words: words + cjk };
}

export function autoExcerpt(md: string, max = 200): string {
	const t = toPlainText(md);
	return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}
