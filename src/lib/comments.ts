import type { Env } from "../env";
import { nowIso } from "./db";
import { newId } from "./slug";

export interface CommentRow {
	id: string;
	post_id: string;
	user_id: string | null;
	author_name: string;
	author_email: string | null;
	body: string;
	status: string;
	ip_hash: string | null;
	parent_id: string | null;
	created_at: string;
}

export interface PublicComment {
	id: string;
	author_name: string;
	body: string;
	created_at: string;
	is_member: boolean;
	parent_id: string | null;
}

const RATE_LIMIT = 5; // comments
const RATE_WINDOW = 60; // seconds

export async function hashIp(ip: string): Promise<string> {
	const data = new TextEncoder().encode(`${ip}:allenlim-comments`);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Returns true if the caller is within the rate limit (and records the hit). */
export async function checkRate(env: Env, ipHash: string): Promise<boolean> {
	const key = `rl:cmt:${ipHash}`;
	const cur = Number((await env.SESSION.get(key)) ?? 0);
	if (cur >= RATE_LIMIT) return false;
	await env.SESSION.put(key, String(cur + 1), { expirationTtl: RATE_WINDOW });
	return true;
}

export async function verifyTurnstile(env: Env, token: string, ip?: string): Promise<boolean> {
	if (!env.TURNSTILE_SECRET) return false;
	const form = new FormData();
	form.append("secret", env.TURNSTILE_SECRET);
	form.append("response", token);
	if (ip) form.append("remoteip", ip);
	const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
		method: "POST",
		body: form,
	});
	const data = (await res.json()) as { success: boolean };
	return data.success === true;
}

export async function listComments(env: Env, postId: string): Promise<PublicComment[]> {
	const { results } = await env.DB.prepare(
		"SELECT id, author_name, body, created_at, user_id, parent_id FROM comments WHERE post_id = ? AND status = 'published' ORDER BY created_at ASC",
	)
		.bind(postId)
		.all<{ id: string; author_name: string; body: string; created_at: string; user_id: string | null; parent_id: string | null }>();
	return (results ?? []).map((r) => ({
		id: r.id,
		author_name: r.author_name,
		body: r.body,
		created_at: r.created_at,
		is_member: !!r.user_id,
		parent_id: r.parent_id,
	}));
}

export interface AddCommentArgs {
	postId: string;
	authorName: string;
	email?: string | null;
	body: string;
	userId?: string | null;
	ipHash?: string | null;
	parentId?: string | null;
}

export async function insertComment(env: Env, a: AddCommentArgs, status = "published"): Promise<PublicComment> {
	const id = newId();
	const ts = nowIso();
	await env.DB.prepare(
		"INSERT INTO comments (id, post_id, user_id, author_name, author_email, body, status, ip_hash, parent_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
	)
		.bind(id, a.postId, a.userId ?? null, a.authorName, a.email ?? null, a.body, status, a.ipHash ?? null, a.parentId ?? null, ts)
		.run();
	return { id, author_name: a.authorName, body: a.body, created_at: ts, is_member: !!a.userId, parent_id: a.parentId ?? null };
}

export async function incrementReaction(env: Env, postId: string): Promise<number> {
	await env.DB.prepare("UPDATE posts SET reactions = reactions + 1 WHERE id = ?").bind(postId).run();
	const r = await env.DB.prepare("SELECT reactions FROM posts WHERE id = ?").bind(postId).first<{ reactions: number }>();
	return r?.reactions ?? 0;
}

// --- admin moderation ---

export async function listAllComments(env: Env, limit = 200): Promise<(CommentRow & { post_slug: string | null; post_title: string | null })[]> {
	const { results } = await env.DB.prepare(
		`SELECT c.*, p.slug AS post_slug, p.title AS post_title FROM comments c
		 LEFT JOIN posts p ON p.id = c.post_id ORDER BY c.created_at DESC LIMIT ?`,
	)
		.bind(limit)
		.all<CommentRow & { post_slug: string | null; post_title: string | null }>();
	return results ?? [];
}

export async function setCommentStatus(env: Env, id: string, status: string): Promise<void> {
	await env.DB.prepare("UPDATE comments SET status = ? WHERE id = ?").bind(status, id).run();
}

export async function deleteComment(env: Env, id: string): Promise<void> {
	await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
}
