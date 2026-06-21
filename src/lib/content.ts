import type { Env } from "../env";
import {
	type PostRow,
	type Term,
	type Visibility,
	PUBLICLY_REACHABLE,
	nowIso,
} from "./db";
import { autoExcerpt, readingStats } from "./markdown";
import { bodyKey, deleteObject, getBody, putBody } from "./r2";
import { newId, slugify } from "./slug";

export interface PostWithTerms extends PostRow {
	tags: Term[];
	categories: Term[];
}

// --- listing (metadata only; bodies are NOT loaded here) ---

export interface ListOpts {
	/** When true, include draft/private (admin views). Default false = public only. */
	includeHidden?: boolean;
	tag?: string;
	category?: string;
	limit?: number;
	offset?: number;
}

export async function listPosts(env: Env, opts: ListOpts = {}): Promise<PostWithTerms[]> {
	const where: string[] = [];
	const binds: unknown[] = [];
	if (!opts.includeHidden) {
		where.push("p.visibility = 'public'");
	}
	if (opts.tag) {
		where.push("p.id IN (SELECT post_id FROM post_tags WHERE tag_slug = ?)");
		binds.push(opts.tag);
	}
	if (opts.category) {
		where.push("p.id IN (SELECT post_id FROM post_categories WHERE category_slug = ?)");
		binds.push(opts.category);
	}
	const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
	const order = opts.includeHidden
		? "ORDER BY p.updated_at DESC"
		: "ORDER BY p.published_at DESC, p.created_at DESC";
	const limit = opts.limit ? `LIMIT ${Number(opts.limit)}` : "";
	const offset = opts.offset ? `OFFSET ${Number(opts.offset)}` : "";
	const { results } = await env.DB.prepare(
		`SELECT p.* FROM posts p ${whereSql} ${order} ${limit} ${offset}`,
	)
		.bind(...binds)
		.all<PostRow>();
	return hydrateTerms(env, results ?? []);
}

async function hydrateTerms(env: Env, rows: PostRow[]): Promise<PostWithTerms[]> {
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.id);
	const ph = ids.map(() => "?").join(",");
	const tagRows = await env.DB.prepare(
		`SELECT pt.post_id, t.slug, t.label FROM post_tags pt JOIN tags t ON t.slug = pt.tag_slug WHERE pt.post_id IN (${ph})`,
	)
		.bind(...ids)
		.all<{ post_id: string; slug: string; label: string }>();
	const catRows = await env.DB.prepare(
		`SELECT pc.post_id, c.slug, c.label FROM post_categories pc JOIN categories c ON c.slug = pc.category_slug WHERE pc.post_id IN (${ph})`,
	)
		.bind(...ids)
		.all<{ post_id: string; slug: string; label: string }>();
	const tagsBy = new Map<string, Term[]>();
	const catsBy = new Map<string, Term[]>();
	for (const r of tagRows.results ?? [])
		(tagsBy.get(r.post_id) ?? tagsBy.set(r.post_id, []).get(r.post_id)!).push({
			slug: r.slug,
			label: r.label,
		});
	for (const r of catRows.results ?? [])
		(catsBy.get(r.post_id) ?? catsBy.set(r.post_id, []).get(r.post_id)!).push({
			slug: r.slug,
			label: r.label,
		});
	return rows.map((r) => ({
		...r,
		tags: tagsBy.get(r.id) ?? [],
		categories: catsBy.get(r.id) ?? [],
	}));
}

// --- single post (metadata + body from R2) ---

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

/** Can an anonymous visitor reach this post at its direct URL? */
export const isReachable = (v: Visibility, loggedIn: boolean) =>
	loggedIn || PUBLICLY_REACHABLE.includes(v);

// --- mutations ---

export interface PostInput {
	title: string;
	slug?: string;
	excerpt?: string | null;
	visibility: Visibility;
	body: string;
	featured_media_id?: string | null;
	authorId?: string | null;
	tags?: string[]; // slugs
	categories?: string[]; // slugs
}

async function uniqueSlug(env: Env, desired: string, exceptId?: string): Promise<string> {
	const base = slugify(desired);
	let slug = base;
	for (let i = 2; ; i++) {
		const row = await env.DB.prepare("SELECT id FROM posts WHERE slug = ?")
			.bind(slug)
			.first<{ id: string }>();
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
	const publishedAt = input.visibility === "public" ? ts : null;
	await env.DB.prepare(
		`INSERT INTO posts (id, slug, title, excerpt, visibility, body_key, format, reading_time, word_count, featured_media_id, author_id, published_at, created_at, updated_at)
		 VALUES (?,?,?,?,?,?, 'md', ?,?,?,?,?,?,?)`,
	)
		.bind(
			id,
			slug,
			input.title,
			excerpt,
			input.visibility,
			key,
			minutes,
			words,
			input.featured_media_id ?? null,
			input.authorId ?? null,
			publishedAt,
			ts,
			ts,
		)
		.run();
	await setTerms(env, id, input.tags ?? [], input.categories ?? []);
	return id;
}

export async function updatePost(env: Env, id: string, input: PostInput): Promise<void> {
	const existing = await env.DB.prepare("SELECT * FROM posts WHERE id = ?")
		.bind(id)
		.first<PostRow>();
	if (!existing) throw new Error("post not found");
	const slug = await uniqueSlug(env, input.slug || input.title, id);
	const key = existing.body_key ?? bodyKey(id);
	await putBody(env, id, input.body);
	const { minutes, words } = readingStats(input.body);
	const excerpt = input.excerpt ?? autoExcerpt(input.body);
	const ts = nowIso();
	// Stamp published_at the first time it becomes public.
	const publishedAt =
		input.visibility === "public" ? existing.published_at ?? ts : existing.published_at;
	await env.DB.prepare(
		`UPDATE posts SET slug=?, title=?, excerpt=?, visibility=?, body_key=?, reading_time=?, word_count=?, featured_media_id=?, published_at=?, updated_at=? WHERE id=?`,
	)
		.bind(
			slug,
			input.title,
			excerpt,
			input.visibility,
			key,
			minutes,
			words,
			input.featured_media_id ?? null,
			publishedAt,
			ts,
			id,
		)
		.run();
	await setTerms(env, id, input.tags ?? [], input.categories ?? []);
}

export async function deletePost(env: Env, id: string): Promise<void> {
	const row = await env.DB.prepare("SELECT body_key FROM posts WHERE id = ?")
		.bind(id)
		.first<{ body_key: string | null }>();
	await deleteObject(env, row?.body_key);
	await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
}

/** Replace a post's tags/categories, creating term rows on demand. */
export async function setTerms(
	env: Env,
	postId: string,
	tagSlugs: string[],
	categorySlugs: string[],
): Promise<void> {
	const stmts = [
		env.DB.prepare("DELETE FROM post_tags WHERE post_id = ?").bind(postId),
		env.DB.prepare("DELETE FROM post_categories WHERE post_id = ?").bind(postId),
	];
	for (const slug of dedupe(tagSlugs)) {
		stmts.push(
			env.DB.prepare("INSERT OR IGNORE INTO tags (slug, label) VALUES (?, ?)").bind(
				slug,
				labelize(slug),
			),
		);
		stmts.push(
			env.DB.prepare("INSERT OR IGNORE INTO post_tags (post_id, tag_slug) VALUES (?, ?)").bind(
				postId,
				slug,
			),
		);
	}
	for (const slug of dedupe(categorySlugs)) {
		stmts.push(
			env.DB.prepare("INSERT OR IGNORE INTO categories (slug, label) VALUES (?, ?)").bind(
				slug,
				labelize(slug),
			),
		);
		stmts.push(
			env.DB.prepare(
				"INSERT OR IGNORE INTO post_categories (post_id, category_slug) VALUES (?, ?)",
			).bind(postId, slug),
		);
	}
	await env.DB.batch(stmts);
}

// --- taxonomy reads ---

export async function getTerm(
	env: Env,
	kind: "tags" | "categories",
	slug: string,
): Promise<Term | null> {
	return env.DB.prepare(`SELECT slug, label FROM ${kind} WHERE slug = ?`).bind(slug).first<Term>();
}

export async function listTerms(env: Env, kind: "tags" | "categories"): Promise<Term[]> {
	const { results } = await env.DB.prepare(`SELECT slug, label FROM ${kind} ORDER BY label`).all<Term>();
	return results ?? [];
}

const dedupe = (a: string[]) => [...new Set(a.map((s) => slugify(s)).filter(Boolean))];
const labelize = (slug: string) =>
	slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
