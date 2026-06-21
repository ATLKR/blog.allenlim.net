import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import {
	type SessionUser,
	SESSION_COOKIE,
	createSession,
	destroySession,
	hashPassword,
	readSession,
	verifyPassword,
} from "./auth";
import {
	type PostInput,
	type PostWithTerms,
	countPosts,
	createPost,
	deletePost,
	getPostMetaById,
	getPostMetaBySlug,
	getPrevNext,
	getTerm,
	isReachable,
	listPosts,
	listTerms,
	loadBody,
	relatedPosts,
	searchPosts,
	updatePost,
} from "./content";
import { type ContentType, type Visibility, VISIBILITIES, countUsers, getUserByEmail, nowIso } from "./db";
import { getEnv } from "./env";
import { renderWithToc } from "./markdown";
import { getSiteIdentity } from "./site";
import { newId } from "./slug";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function putSessionCookie(sid: string) {
	setCookie(SESSION_COOKIE, sid, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_MAX_AGE,
	});
}

async function currentUser(): Promise<SessionUser | null> {
	const sid = getCookie(SESSION_COOKIE);
	return readSession(getEnv(), sid);
}

async function requireUser(): Promise<SessionUser> {
	const u = await currentUser();
	if (!u) throw new Error("UNAUTHORIZED");
	return u;
}

// --- session / auth ---

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
	const env = getEnv();
	const [user, identity, needsSetup] = await Promise.all([
		currentUser(),
		getSiteIdentity(env),
		countUsers(env).then((n) => n === 0),
	]);
	return { user, identity, needsSetup };
});

export const setupFn = createServerFn({ method: "POST" })
	.validator((d: { name: string; email: string; password: string }) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		if ((await countUsers(env)) > 0) return { ok: false, error: "Setup already complete." };
		const email = data.email.trim().toLowerCase();
		if (!email || data.password.length < 8) return { ok: false, error: "Email required; password ≥ 8 chars." };
		const id = newId();
		await env.DB.prepare(
			"INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?, 'admin', ?)",
		)
			.bind(id, email, data.name.trim() || null, await hashPassword(data.password), nowIso())
			.run();
		putSessionCookie(await createSession(env, { id, email, name: data.name.trim() || null, role: "admin" }));
		return { ok: true };
	});

export const loginFn = createServerFn({ method: "POST" })
	.validator((d: { email: string; password: string }) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		const user = await getUserByEmail(env, data.email.trim().toLowerCase());
		if (!user || !(await verifyPassword(data.password, user.password_hash)))
			return { ok: false, error: "Incorrect email or password." };
		putSessionCookie(
			await createSession(env, { id: user.id, email: user.email, name: user.name, role: user.role }),
		);
		return { ok: true };
	});

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
	const sid = getCookie(SESSION_COOKIE);
	await destroySession(getEnv(), sid);
	setCookie(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
	return { ok: true };
});

// --- public reads ---

const PAGE_SIZE = 10;

export const listFn = createServerFn({ method: "GET" })
	.validator((d: { type?: ContentType | "all"; tag?: string; category?: string; page?: number } = {}) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		const page = Math.max(1, data.page ?? 1);
		const opts = { type: data.type ?? "post", tag: data.tag, category: data.category, pinnedFirst: true } as const;
		const [posts, total] = await Promise.all([
			listPosts(env, { ...opts, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
			countPosts(env, opts),
		]);
		return { posts, total, page, pageSize: PAGE_SIZE, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
	});

export const getEntryFn = createServerFn({ method: "GET" })
	.validator((d: { slug: string }) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		const post = await getPostMetaBySlug(env, data.slug);
		const user = await currentUser();
		if (!post || !isReachable(post, !!user)) return { notFound: true as const };
		const body = await loadBody(env, post);
		const { html, toc } = renderWithToc(body);
		const [{ prev, next }, related] = await Promise.all([
			getPrevNext(env, post),
			post.type === "post" ? relatedPosts(env, post, 3) : Promise.resolve([]),
		]);
		return { post, html, toc, prev, next, related, isAdmin: !!user };
	});

export const searchFn = createServerFn({ method: "GET" })
	.validator((d: { q: string }) => d)
	.handler(async ({ data }) => {
		const posts = await searchPosts(getEnv(), data.q);
		return { posts, q: data.q };
	});

export const termsFn = createServerFn({ method: "GET" })
	.validator((d: { kind: "tags" | "categories" }) => d)
	.handler(async ({ data }) => ({ terms: await listTerms(getEnv(), data.kind) }));

export const termFn = createServerFn({ method: "GET" })
	.validator((d: { kind: "tags" | "categories"; slug: string; page?: number } = { kind: "tags", slug: "" }) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		const term = await getTerm(env, data.kind, data.slug);
		if (!term) return { notFound: true as const };
		const key = data.kind === "tags" ? "tag" : "category";
		const page = Math.max(1, data.page ?? 1);
		const opts = { [key]: data.slug, pinnedFirst: true } as const;
		const [posts, total] = await Promise.all([
			listPosts(env, { ...opts, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
			countPosts(env, opts),
		]);
		return { term, posts, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
	});

// --- admin ---

export const adminListFn = createServerFn({ method: "GET" }).handler(async () => {
	await requireUser();
	const env = getEnv();
	const posts = await listPosts(env, { includeHidden: true, type: "all", limit: 500 });
	return { posts };
});

export const getEditFn = createServerFn({ method: "GET" })
	.validator((d: { id: string }) => d)
	.handler(async ({ data }) => {
		await requireUser();
		const env = getEnv();
		const post = await getPostMetaById(env, data.id);
		if (!post) return { notFound: true as const };
		return { post, body: await loadBody(env, post) };
	});

interface SaveInput {
	id?: string;
	title: string;
	slug?: string;
	excerpt?: string | null;
	visibility: string;
	type?: string;
	pinned?: boolean;
	cover_url?: string | null;
	publishedAt?: string | null;
	body: string;
	tags?: string[];
	categories?: string[];
}

export const saveFn = createServerFn({ method: "POST" })
	.validator((d: SaveInput) => d)
	.handler(async ({ data }) => {
		const user = await requireUser();
		const env = getEnv();
		if (!data.title.trim()) return { ok: false, error: "Title required." };
		const input: PostInput = {
			title: data.title.trim(),
			slug: data.slug?.trim() || undefined,
			excerpt: (data.excerpt?.trim() || null) as string | null,
			visibility: (VISIBILITIES.includes(data.visibility as Visibility) ? data.visibility : "draft") as Visibility,
			type: data.type === "page" ? "page" : "post",
			pinned: !!data.pinned,
			cover_url: data.cover_url?.trim() || null,
			publishedAt: data.publishedAt ?? undefined,
			body: data.body ?? "",
			tags: data.tags ?? [],
			categories: data.categories ?? [],
			authorId: user.id,
		};
		const id = data.id ? (await updatePost(env, data.id, input), data.id) : await createPost(env, input);
		return { ok: true, id };
	});

export const deleteFn = createServerFn({ method: "POST" })
	.validator((d: { id: string }) => d)
	.handler(async ({ data }) => {
		await requireUser();
		await deletePost(getEnv(), data.id);
		return { ok: true };
	});

export type { PostWithTerms };
