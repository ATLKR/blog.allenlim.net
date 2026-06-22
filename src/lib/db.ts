import type { Env } from "../env";

export type Visibility = "draft" | "private" | "unlisted" | "public";
export const VISIBILITIES: Visibility[] = ["draft", "private", "unlisted", "public"];
/** Reachable at a direct URL by an anonymous visitor (subject to scheduling). */
export const PUBLICLY_REACHABLE: Visibility[] = ["public", "unlisted"];

export type ContentType = "post" | "page";
export const CONTENT_TYPES: ContentType[] = ["post", "page"];

export interface PostRow {
	id: string;
	slug: string;
	/** Shared across translations; what /<lang>/… URLs use. */
	url_slug: string;
	title: string;
	excerpt: string | null;
	visibility: Visibility;
	type: ContentType;
	locale: string;
	translation_group: string | null;
	pinned: number;
	cover_url: string | null;
	body_key: string | null;
	format: string;
	reading_time: number;
	word_count: number;
	featured_media_id: string | null;
	author_id: string | null;
	published_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface UserRow {
	id: string;
	email: string;
	name: string | null;
	password_hash: string;
	role: string;
	created_at: string;
}

export interface Term {
	slug: string;
	label: string;
}

export const nowIso = () => new Date().toISOString();

export async function countUsers(env: Env): Promise<number> {
	const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
	return r?.n ?? 0;
}

export async function getUserByEmail(env: Env, email: string): Promise<UserRow | null> {
	return env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
}

export async function getUserById(env: Env, id: string): Promise<UserRow | null> {
	return env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}
