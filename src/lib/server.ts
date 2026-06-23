import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestIP, setCookie } from "@tanstack/react-start/server";
import type { Locale } from "./i18n";
import {
	checkRate,
	deleteComment,
	hashIp,
	insertComment,
	listAllComments,
	listComments,
	setCommentStatus,
	verifyTurnstile,
} from "./comments";
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
	getEntryByUrlSlug,
	getPostMetaById,
	getPrevNext,
	getTerm,
	getTranslationLocales,
	incrementView,
	isReachable,
	listMedia,
	listNavPages,
	listPosts,
	listTerms,
	loadBody,
	popularPosts,
	relatedPosts,
	searchPosts,
	updatePost,
} from "./content";
import { type ContentType, type Visibility, VISIBILITIES, countUsers, getUserByEmail, nowIso } from "./db";
import { getEnv } from "./env";
import { renderWithToc } from "./markdown";
import { type SiteSettings, getSettings, publicSettings, saveSettings } from "./settings";
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
	const [user, settings, needsSetup] = await Promise.all([
		currentUser(),
		getSettings(env),
		countUsers(env).then((n) => n === 0),
	]);
	return {
		user,
		needsSetup,
		identity: { title: settings.site_title, tagline: settings.site_tagline },
		settings: publicSettings(settings),
	};
});

export const settingsFn = createServerFn({ method: "GET" }).handler(async () => {
	await requireUser();
	return { settings: await getSettings(getEnv()) };
});

export const saveSettingsFn = createServerFn({ method: "POST" })
	.validator((d: Partial<SiteSettings>) => d)
	.handler(async ({ data }) => {
		await requireUser();
		await saveSettings(getEnv(), data);
		return { ok: true };
	});

/** Nav pages for a given locale (used by the /$lang layout). */
export const navFn = createServerFn({ method: "GET" })
	.validator((d: { locale: Locale }) => d)
	.handler(async ({ data }) => ({ navPages: await listNavPages(getEnv(), data.locale) }));

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
	.validator((d: { locale: Locale; type?: ContentType | "all"; tag?: string; category?: string; page?: number }) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		const page = Math.max(1, data.page ?? 1);
		const PAGE = (await getSettings(env)).posts_per_page;
		const opts = { type: data.type ?? "post", tag: data.tag, category: data.category, locale: data.locale, pinnedFirst: true } as const;
		const [posts, total] = await Promise.all([
			listPosts(env, { ...opts, limit: PAGE, offset: (page - 1) * PAGE }),
			countPosts(env, opts),
		]);
		return { posts, total, page, pageSize: PAGE, pages: Math.max(1, Math.ceil(total / PAGE)) };
	});

export const getEntryFn = createServerFn({ method: "GET" })
	.validator((d: { urlSlug: string; locale: Locale }) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		const post = await getEntryByUrlSlug(env, data.urlSlug, data.locale);
		const user = await currentUser();
		if (!post || !isReachable(post, !!user)) return { notFound: true as const };
		const body = await loadBody(env, post);
		const { html, toc } = renderWithToc(body);
		const [{ prev, next }, related, locales, settings] = await Promise.all([
			getPrevNext(env, post),
			post.type === "post" ? relatedPosts(env, post, 3) : Promise.resolve([]),
			getTranslationLocales(env, post.url_slug),
			getSettings(env),
		]);
		const sameAs = [settings.social_github, settings.social_x, settings.social_linkedin].filter(Boolean);
		return {
			post,
			html,
			toc,
			prev,
			next,
			related,
			isAdmin: !!user,
			otherLocales: locales.filter((l) => l !== post.locale),
			seo: {
				author: settings.author_name,
				description: post.excerpt || settings.default_description || null,
				ogImage: post.cover_url || settings.default_og_image || null,
				sameAs,
			},
		};
	});

export const searchFn = createServerFn({ method: "GET" })
	.validator((d: { q: string; locale: Locale }) => d)
	.handler(async ({ data }) => {
		const posts = await searchPosts(getEnv(), data.q, data.locale);
		return { posts, q: data.q };
	});

export const popularFn = createServerFn({ method: "GET" })
	.validator((d: { locale: Locale }) => d)
	.handler(async ({ data }) => ({ posts: await popularPosts(getEnv(), data.locale, 5) }));

export const viewFn = createServerFn({ method: "POST" })
	.validator((d: { id: string }) => d)
	.handler(async ({ data }) => {
		await incrementView(getEnv(), data.id);
		return { ok: true };
	});

export const termsFn = createServerFn({ method: "GET" })
	.validator((d: { kind: "tags" | "categories" }) => d)
	.handler(async ({ data }) => ({ terms: await listTerms(getEnv(), data.kind) }));

export const termFn = createServerFn({ method: "GET" })
	.validator((d: { kind: "tags" | "categories"; slug: string; locale: Locale; page?: number }) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		const term = await getTerm(env, data.kind, data.slug);
		if (!term) return { notFound: true as const };
		const key = data.kind === "tags" ? "tag" : "category";
		const page = Math.max(1, data.page ?? 1);
		const PAGE = (await getSettings(env)).posts_per_page;
		const opts = { [key]: data.slug, locale: data.locale, pinnedFirst: true } as const;
		const [posts, total] = await Promise.all([
			listPosts(env, { ...opts, limit: PAGE, offset: (page - 1) * PAGE }),
			countPosts(env, opts),
		]);
		return { term, posts, total, page, pages: Math.max(1, Math.ceil(total / PAGE)) };
	});

// --- admin ---

export const adminListFn = createServerFn({ method: "GET" }).handler(async () => {
	await requireUser();
	const env = getEnv();
	const posts = await listPosts(env, { includeHidden: true, type: "all", limit: 500 });
	return { posts };
});

export const mediaListFn = createServerFn({ method: "GET" }).handler(async () => {
	await requireUser();
	return { media: await listMedia(getEnv(), 300) };
});

/** Source fields for starting a translation (prefills the editor). */
export const prefillFn = createServerFn({ method: "GET" })
	.validator((d: { slug: string }) => d)
	.handler(async ({ data }) => {
		await requireUser();
		const env = getEnv();
		const row = await env.DB.prepare("SELECT id FROM posts WHERE slug = ?").bind(data.slug).first<{ id: string }>();
		if (!row) return { source: null };
		const meta = await getPostMetaById(env, row.id);
		if (!meta) return { source: null };
		return {
			source: {
				title: meta.title,
				slug: meta.url_slug,
				body: await loadBody(env, meta),
				tags: meta.tags.map((t) => t.label),
				categories: meta.categories.map((c) => c.label),
				cover_url: meta.cover_url,
			},
		};
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
	locale?: string;
	translationOf?: string | null;
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
			locale: data.locale === "ko" ? "ko" : "en",
			translationOf: data.translationOf?.trim() || null,
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

// --- comments ---

export const listCommentsFn = createServerFn({ method: "GET" })
	.validator((d: { postId: string }) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		const [comments, user, settings] = await Promise.all([listComments(env, data.postId), currentUser(), getSettings(env)]);
		return {
			comments,
			siteKey: env.TURNSTILE_SITEKEY ?? "",
			member: user ? { name: user.name || user.email } : null,
			enabled: settings.comments_enabled,
		};
	});

export const addCommentFn = createServerFn({ method: "POST" })
	.validator((d: { postId: string; name: string; email?: string; body: string; token: string }) => d)
	.handler(async ({ data }) => {
		const env = getEnv();
		const settings = await getSettings(env);
		if (!settings.comments_enabled) return { ok: false, error: "Comments are disabled." };
		const user = await currentUser();
		const post = await getPostMetaById(env, data.postId);
		if (!post || !isReachable(post, !!user)) return { ok: false, error: "Post not found." };

		const name = (user ? user.name || user.email : data.name || "").trim().slice(0, 80);
		const body = (data.body || "").trim();
		if (!name) return { ok: false, error: "Name is required." };
		if (body.length < 2) return { ok: false, error: "Comment is too short." };
		if (body.length > 5000) return { ok: false, error: "Comment is too long." };

		// Logged-in members post immediately; guests obey the moderation setting.
		const hold = !user && settings.comments_moderation === "hold";
		const status = hold ? "pending" : "published";

		if (!user) {
			const ip = getRequestIP({ xForwardedFor: true }) ?? "0.0.0.0";
			const ipHash = await hashIp(ip);
			if (!(await checkRate(env, ipHash))) return { ok: false, error: "Too many comments — please wait a minute." };
			if (!data.token || !(await verifyTurnstile(env, data.token, ip)))
				return { ok: false, error: "Captcha verification failed. Please try again." };
			const comment = await insertComment(env, { postId: data.postId, authorName: name, email: data.email || null, body, ipHash }, status);
			return hold ? { ok: true, pending: true as const } : { ok: true, comment };
		}
		const comment = await insertComment(env, { postId: data.postId, authorName: name, body, userId: user.id });
		return { ok: true, comment };
	});

export const adminCommentsFn = createServerFn({ method: "GET" }).handler(async () => {
	await requireUser();
	return { comments: await listAllComments(getEnv(), 200) };
});

export const commentStatusFn = createServerFn({ method: "POST" })
	.validator((d: { id: string; status: "published" | "hidden" | "spam" }) => d)
	.handler(async ({ data }) => {
		await requireUser();
		await setCommentStatus(getEnv(), data.id, data.status);
		return { ok: true };
	});

export const deleteCommentFn = createServerFn({ method: "POST" })
	.validator((d: { id: string }) => d)
	.handler(async ({ data }) => {
		await requireUser();
		await deleteComment(getEnv(), data.id);
		return { ok: true };
	});

export type { PostWithTerms };
