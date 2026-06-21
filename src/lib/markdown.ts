import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

const WORDS_PER_MINUTE = 200;
const CJK_PER_MINUTE = 500;
const CJK_RE = /\p{Script=Han}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}/gu;

/** Render markdown body to HTML (admin-authored, single-trust content). */
export function renderMarkdown(md: string): string {
	return marked.parse(md ?? "", { async: false }) as string;
}

/** Plain text from markdown, for excerpts / counts. */
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
