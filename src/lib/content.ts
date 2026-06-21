import type { Env } from "../env";
import {
	type ContentType,
	type PostRow,
	type Term,
	type Visibility,
	PUBLICLY_REACHABLE,
	nowIso,
} from "./db";
import { autoExcerpt, readingStats, toPlainText } from "./markdown";
import { bodyKey, deleteObject, getBody, putBody } from "./r2";
import { newId, slugify } from "./slug";

export interface PostWithTerms extends PostRow {
	tags: Term[];
	categories: Term[];
}

// Public visibility, accounting for scheduled (future published_at) posts.
const PUBLIC_LIVE = `visibility = 'public' AND (published_at IS NULL OR published_at <= datetime('now'))`;

// --- listing (metadata only; bodies are NOT loaded here) ---

export interface ListOpts {
	includeHidden?: boolean; // admin views: include draft/private/scheduled
	type?: ContentType | "all";
	tag?: string;
	category?: string;
	limit?: number;
	offset?: number;
	pinnedFirst?: boolean;
}

export async function listPosts(env: Env, opts: ListOpts = {}): Promise<PostWithTerms[]> {
	const { rows } = await queryPosts(env, opts);
	return hydrateTerms(env, rows);
}

export async function countPosts(env: Env, opts: ListOpts = {}): Promise<number> {
	const { where, binds } = buildWhere(opts);
	const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts p ${where}`)
		.bind(...binds)
		.first<{ n: number }>();
	return r?.n ?? 0;
}

function buildWhere(opts: ListOpts) {
	const where: string[] = [];
	const binds: unknown[] = [];
	const type = opts.type ?? "post";
	if (type !== "all") {
		where.push("p.type = ?");
		binds.push(type);
	}
	if (!opts.includeHidden) where.push(`p.${PUBLIC_LIVE}`);
	if (opts.tag) {
		where.push("p.id IN (SELECT post_id FROM post_tags WHERE tag_slug = ?)");
		binds.push(opts.tag);
	}
	if (opts.category) {
		where.push("p.id IN (SELECT post_id FROM post_categories WHERE category_slug = ?)");
		binds.push(opts.category);
	}
	return { where: where.length ? `WHERE ${where.join(" AND ")}` : "", binds };
}

async function queryPosts(env: Env, opts: ListOpts) {
	const { where, binds } = buildWhere(opts);
	const order = opts.includeHidden
		? "ORDER BY p.updated_at DESC"
		: `ORDER BY ${opts.pinnedFirst ? "p.pinned DESC, " : ""}p.published_at DESC, p.created_at DESC`;
	const limit = opts.limit ? `LIMIT ${Number(opts.limit)}` : "";
	const offset = opts.offset ? `OFFSET ${Number(opts.offset)}` : "";
	const { results } = await env.DB.prepare(`SELECT p.* FROM posts p ${where} ${order} ${limit} ${offset}`)
		.bind(...binds)
		.all<PostRow>();
	return { rows: results ?? [] };
}

async function hydrateTerms(env: Env, rows: PostRow[]): Promise<PostWithTerms[]> {
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.id);
	const ph = ids.map(() => "?").join(",");
	const [tagRows, catRows] = await Promise.all([
		env.DB.prepare(
			`SELECT pt.post_id, t.slug, t.label FROM post_tags pt JOIN tags t ON t.slug = pt.tag_slug WHERE pt.post_id IN (${ph})`,
		)
			.bind(...ids)
			.all<{ post_id: string; slug: string; label: string }>(),
		env.DB.prepare(
			`SELECT pc.post_id, c.slug, c.label FROM post_categories pc JOIN categories c ON c.slug = pc.category_slug WHERE pc.post_id IN (${ph})`,
		)
			.bind(...ids)
			.all<{ post_id: string; slug: string; label: string }>(),
	]);
	const tagsBy = new Map<string, Term[]>();
	const catsBy = new Map<string, Term[]>();
	for (const r of tagRows.results ?? [])
		(tagsBy.get(r.post_id) ?? tagsBy.set(r.post_id, []).get(r.post_id)!).push({ slug: r.slug, label: r.label });
	for (const r of catRows.results ?? [])
		(catsBy.get(r.post_id) ?? catsBy.set(r.post_id, []).get(r.post_id)!).push({ slug: r.slug, label: r.label });
	return rows.map((r) => ({ ...r, tags: tagsBy.get(r.id) ?? [], categories: catsBy.get(r.id) ?? [] }));
}

// --- single entry (metadata + body from R2) ---

export async function getPostMetaBySlug(env: Env, slug: string): Promise<PostWithTerms | null> {
	const row = await env.DB.prepare("SELECT * FROM posts WHERE slug = ?").bind(slug).first<PostRow>();
	if (!row) return null;
	return (await hydrateTerms(env, [row]))[0];
}

export async function getPostMetaById(env: Env, id: string): Promise<PostWithTerms | null> {
	const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<PostRow>();
	if (!row) return null;
	return (await hydrateTerms(env, [row]))[0];
}

export const loadBody = (env: Env, post: PostRow) => getBody(env, post.body_key);

/** Can an anonymous visitor reach this entry now? (scheduling-aware) */
export function isReachable(post: PostRow, loggedIn: boolean): boolean {
	if (loggedIn) return true;
	if (!PUBLICLY_REACHABLE.includes(post.visibility)) return false;
	if (post.visibility === "public" && post.published_at && new Date(post.published_at) > new Date())
		return false; // scheduled for the future
	return true;
}

// --- neighbors + related ---

export async function getPrevNext(env: Env, post: PostRow) {
	const base = `FROM posts WHERE type = 'post' AND ${PUBLIC_LIVE}`;
	const anchor = post.published_at ?? post.created_at;
	const [prev, next] = await Promise.all([
		env.DB.prepare(`SELECT id,slug,title ${base} AND COALESCE(published_at, created_at) < ? ORDER BY COALESCE(published_at, created_at) DESC LIMIT 1`)
			.bind(anchor)
			.first<{ id: string; slug: string; title: string }>(),
		env.DB.prepare(`SELECT id,slug,title ${base} AND COALESCE(published_at, created_at) > ? ORDER BY COALESCE(published_at, created_at) ASC LIMIT 1`)
			.bind(anchor)
			.first<{ id: string; slug: string; title: string }>(),
	]);
	return { prev, next };
}

export async function relatedPosts(env: Env, post: PostWithTerms, limit = 3): Promise<PostWithTerms[]> {
	const tagSlugs = post.tags.map((t) => t.slug);
	if (tagSlugs.length === 0) return [];
	const ph = tagSlugs.map(() => "?").join(",");
	const { results } = await env.DB.prepare(
		`SELECT p.*, COUNT(*) AS shared FROM posts p
		 JOIN post_tags pt ON pt.post_id = p.id
		 WHERE pt.tag_slug IN (${ph}) AND p.id != ? AND p.type='post' AND p.${PUBLIC_LIVE}
		 GROUP BY p.id ORDER BY shared DESC, p.published_at DESC LIMIT ?`,
	)
		.bind(...tagSlugs, post.id, limit)
		.all<PostRow>();
	return hydrateTerms(env, results ?? []);
}

// --- search (FTS) ---

export async function searchPosts(env: Env, q: string, includeHidden = false): Promise<PostWithTerms[]> {
	const term = q.trim();
	if (term.length < 2) return [];
	const { results } = await env.DB.prepare(
		`SELECT p.* FROM posts_fts f JOIN posts p ON p.id = f.post_id
		 WHERE posts_fts MATCH ? ${includeHidden ? "" : `AND p.${PUBLIC_LIVE}`}
		 ORDER BY rank LIMIT 50`,
	)
		.bind(term)
		.all<PostRow>();
	return hydrateTerms(env, results ?? []);
}

async function syncFts(env: Env, id: string, title: string, excerpt: string, body: string) {
	await env.DB.batch([
		env.DB.prepare("DELETE FROM posts_fts WHERE post_id = ?").bind(id),
		env.DB.prepare("INSERT INTO posts_fts (post_id, title, excerpt, body) VALUES (?,?,?,?)").bind(
			id,
			title,
			excerpt,
			toPlainText(body),
		),
	]);
}

// --- mutations ---

export interface PostInput {
	title: string;
	slug?: string;
	excerpt?: string | null;
	visibility: Visibility;
	type?: ContentType;
	pinned?: boolean;
	cover_url?: string | null;
	body: string;
	publishedAt?: string | null;
	authorId?: string | null;
	tags?: string[];
	categories?: string[];
}

async function uniqueSlug(env: Env, desired: string, exceptId?: string): Promise<string> {
	const base = slugify(desired);
	let slug = base;
	for (let i = 2; ; i++) {
		const row = await env.DB.prepare("SELECT id FROM posts WHERE slug = ?").bind(slug).first<{ id: string }>();
		if (!row || row.id === exceptId) return slug;
		slug = `${base}-${i}`;
	}
}

export async function createPost(env: Env, input: PostInput): Promise<string> {
	const id = newId();
	const slug = await uniqueSlug(env, input.slug || input.title);
	const key = await putBody(env, id, input.body);
	const { minutes, words } = readingStats(input.body);
	const excerpt = input.excerpt ?? autoExcerpt(input.body);
	const ts = nowIso();
	const publishedAt = input.publishedAt ?? (input.visibility === "public" ? ts : null);
	await env.DB.prepare(
		`INSERT INTO posts (id,slug,title,excerpt,visibility,type,pinned,cover_url,body_key,format,reading_time,word_count,featured_media_id,author_id,published_at,created_at,updated_at)
		 VALUES (?,?,?,?,?,?,?,?,?, 'md', ?,?,?,?,?,?,?)`,
	)
		.bind(
			id, slug, input.title, excerpt, input.visibility, input.type ?? "post", input.pinned ? 1 : 0,
			input.cover_url ?? null, key, minutes, words, null, input.authorId ?? null, publishedAt, ts, ts,
		)
		.run();
	await setTerms(env, id, input.tags ?? [], input.categories ?? []);
	await syncFts(env, id, input.title, excerpt ?? "", input.body);
	return id;
}

export async function updatePost(env: Env, id: string, input: PostInput): Promise<void> {
	const existing = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<PostRow>();
	if (!existing) throw new Error("post not found");
	const slug = await uniqueSlug(env, input.slug || input.title, id);
	const key = existing.body_key ?? bodyKey(id);
	await putBody(env, id, input.body);
	const { minutes, words } = readingStats(input.body);
	const excerpt = input.excerpt ?? autoExcerpt(input.body);
	const ts = nowIso();
	const publishedAt =
		input.publishedAt !== undefined
			? input.publishedAt
			: input.visibility === "public"
				? existing.published_at ?? ts
				: existing.published_at;
	await env.DB.prepare(
		`UPDATE posts SET slug=?,title=?,excerpt=?,visibility=?,type=?,pinned=?,cover_url=?,body_key=?,reading_time=?,word_count=?,published_at=?,updated_at=? WHERE id=?`,
	)
		.bind(
			slug, input.title, excerpt, input.visibility, input.type ?? existing.type, input.pinned ? 1 : 0,
			input.cover_url ?? null, key, minutes, words, publishedAt, ts, id,
		)
		.run();
	await setTerms(env, id, input.tags ?? [], input.categories ?? []);
	await syncFts(env, id, input.title, excerpt ?? "", input.body);
}

export async function deletePost(env: Env, id: string): Promise<void> {
	const row = await env.DB.prepare("SELECT body_key FROM posts WHERE id = ?").bind(id).first<{ body_key: string | null }>();
	await deleteObject(env, row?.body_key);
	await env.DB.batch([
		env.DB.prepare("DELETE FROM posts_fts WHERE post_id = ?").bind(id),
		env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id),
	]);
}

export async function setTerms(env: Env, postId: string, tagSlugs: string[], categorySlugs: string[]): Promise<void> {
	const stmts = [
		env.DB.prepare("DELETE FROM post_tags WHERE post_id = ?").bind(postId),
		env.DB.prepare("DELETE FROM post_categories WHERE post_id = ?").bind(postId),
	];
	for (const slug of dedupe(tagSlugs)) {
		stmts.push(env.DB.prepare("INSERT OR IGNORE INTO tags (slug,label) VALUES (?,?)").bind(slug, labelize(slug)));
		stmts.push(env.DB.prepare("INSERT OR IGNORE INTO post_tags (post_id,tag_slug) VALUES (?,?)").bind(postId, slug));
	}
	for (const slug of dedupe(categorySlugs)) {
		stmts.push(env.DB.prepare("INSERT OR IGNORE INTO categories (slug,label) VALUES (?,?)").bind(slug, labelize(slug)));
		stmts.push(env.DB.prepare("INSERT OR IGNORE INTO post_categories (post_id,category_slug) VALUES (?,?)").bind(postId, slug));
	}
	await env.DB.batch(stmts);
}

export async function getTerm(env: Env, kind: "tags" | "categories", slug: string): Promise<Term | null> {
	return env.DB.prepare(`SELECT slug,label FROM ${kind} WHERE slug = ?`).bind(slug).first<Term>();
}

export async function listTerms(env: Env, kind: "tags" | "categories"): Promise<Array<Term & { count: number }>> {
	const join = kind === "tags" ? "post_tags pt ON pt.tag_slug = t.slug" : "post_categories pt ON pt.category_slug = t.slug";
	const { results } = await env.DB.prepare(
		`SELECT t.slug, t.label, COUNT(pt.post_id) AS count FROM ${kind} t LEFT JOIN ${join} GROUP BY t.slug ORDER BY count DESC, t.label`,
	).all<Term & { count: number }>();
	return results ?? [];
}

/** Published pages for the nav bar (lightweight: slug + title only). */
export async function listNavPages(env: Env): Promise<Array<{ slug: string; title: string }>> {
	const { results } = await env.DB.prepare(
		`SELECT slug, title FROM posts WHERE type = 'page' AND ${PUBLIC_LIVE} ORDER BY title`,
	).all<{ slug: string; title: string }>();
	return results ?? [];
}

const dedupe = (a: string[]) => [...new Set(a.map((s) => slugify(s)).filter(Boolean))];
const labelize = (slug: string) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
