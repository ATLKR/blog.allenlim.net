import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import type { PostWithTerms } from "#/lib/content";
import { type Locale, t } from "#/lib/i18n";
import { logoutFn, viewFn } from "#/lib/server";

export const SITE = "allenlim.net";
export const SITE_ORIGIN = "https://blog.allenlim.net";

const abs = (path: string) => (path.startsWith("http") ? path : SITE_ORIGIN + path);

/** Builds a `head()`: title, description, OG + Twitter cards, canonical, hreflang, JSON-LD. */
export function pageHead(opts: {
	title: string;
	description?: string | null;
	image?: string | null;
	type?: "website" | "article";
	robots?: string | null;
	/** Path of this page (→ canonical + og:url). */
	path?: string;
	alternates?: Array<{ hreflang: string; path: string }>;
	jsonLd?: Record<string, unknown>;
}) {
	const img = opts.image ? abs(opts.image) : null;
	const meta: Array<Record<string, string>> = [
		{ title: opts.title },
		{ property: "og:title", content: opts.title },
		{ property: "og:type", content: opts.type ?? "website" },
		{ property: "og:site_name", content: SITE },
		{ name: "twitter:card", content: img ? "summary_large_image" : "summary" },
		{ name: "twitter:title", content: opts.title },
	];
	if (opts.path) meta.push({ property: "og:url", content: abs(opts.path) });
	if (opts.description) {
		meta.push({ name: "description", content: opts.description });
		meta.push({ property: "og:description", content: opts.description });
		meta.push({ name: "twitter:description", content: opts.description });
	}
	if (img) {
		meta.push({ property: "og:image", content: img });
		meta.push({ name: "twitter:image", content: img });
	}
	if (opts.robots) meta.push({ name: "robots", content: opts.robots });

	const links: Array<Record<string, string>> = [];
	if (opts.path) links.push({ rel: "canonical", href: abs(opts.path) });
	for (const a of opts.alternates ?? []) links.push({ rel: "alternate", hrefLang: a.hreflang, href: abs(a.path) });
	// x-default → the English alternate, if any
	const enAlt = opts.alternates?.find((a) => a.hreflang === "en");
	if (enAlt) links.push({ rel: "alternate", hrefLang: "x-default", href: abs(enAlt.path) });

	const scripts = opts.jsonLd
		? [{ type: "application/ld+json", children: JSON.stringify(opts.jsonLd) }]
		: undefined;

	return { meta, ...(links.length ? { links } : {}), ...(scripts ? { scripts } : {}) };
}

export function useHighlight(dep: unknown) {
	useEffect(() => {
		const run = () => (window as unknown as { hljs?: { highlightAll: () => void } }).hljs?.highlightAll();
		run();
		const timer = setTimeout(run, 300);
		return () => clearTimeout(timer);
	}, [dep]);
}

/** Adds a Copy button to each code block. */
export function useCodeCopy(dep: unknown) {
	useEffect(() => {
		const add = () => {
			document.querySelectorAll<HTMLElement>(".prose pre").forEach((pre) => {
				if (pre.querySelector(".copy-btn")) return;
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "copy-btn";
				btn.textContent = "Copy";
				btn.onclick = () => {
					navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? pre.textContent ?? "");
					btn.textContent = "Copied";
					setTimeout(() => { btn.textContent = "Copy"; }, 1200);
				};
				pre.appendChild(btn);
			});
		};
		add();
		const t = setTimeout(add, 350);
		return () => clearTimeout(t);
	}, [dep]);
}

/** Records a view once per mount (prefetch on hover doesn't mount, so it isn't counted). */
export function useView(id: string) {
	useEffect(() => {
		viewFn({ data: { id } }).catch(() => {});
	}, [id]);
}

export interface Me {
	user: { id: string; email: string; name: string | null; role: string } | null;
	identity: { title: string; tagline: string };
	locale: Locale;
	navPages: Array<{ url_slug: string; title: string }>;
}

export function fmtDate(value?: string | null, locale: Locale = "en") {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long", day: "numeric" });
}

function ThemeSwitch() {
	useEffect(() => {
		const root = document.documentElement;
		const btns = document.querySelectorAll<HTMLButtonElement>(".theme-switch button");
		const set = (theme: string) => {
			const secure = location.protocol === "https:" ? "; Secure" : "";
			root.classList.remove("light", "dark");
			if (theme === "system") {
				document.cookie = `theme=; path=/; max-age=0; SameSite=Lax${secure}`;
				if (matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
			} else {
				document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax${secure}`;
				root.classList.add(theme);
			}
			btns.forEach((b) => b.classList.toggle("active", b.dataset.t === theme));
		};
		const stored = (document.cookie.match(/theme=([^;]+)/) || [])[1] || "system";
		btns.forEach((b) => {
			b.classList.toggle("active", b.dataset.t === stored);
			b.onclick = () => set(b.dataset.t || "system");
		});
	}, []);
	return (
		<div className="theme-switch">
			<button type="button" data-t="light" aria-label="Light">☀</button>
			<button type="button" data-t="dark" aria-label="Dark">☾</button>
			<button type="button" data-t="system" aria-label="System">⌂</button>
		</div>
	);
}

/** Swaps the leading /en|/ko segment in place, keeping the same page. */
function LangSwitch({ locale }: { locale: Locale }) {
	const go = (l: Locale) => {
		if (l === locale) return;
		const path = window.location.pathname.replace(/^\/(en|ko)(?=\/|$)/, `/${l}`);
		window.location.href = (path.startsWith(`/${l}`) ? path : `/${l}`) + window.location.search;
	};
	return (
		<div className="lang-switch">
			<button type="button" className={locale === "en" ? "active" : ""} onClick={() => go("en")}>EN</button>
			<button type="button" className={locale === "ko" ? "active" : ""} onClick={() => go("ko")}>한국어</button>
		</div>
	);
}

export function SiteLayout({ me, children }: { me: Me; children: React.ReactNode }) {
	const tr = t(me.locale);
	const lang = me.locale;
	return (
		<div className="site">
			<header className="header">
				<nav className="nav">
					<Link to="/$lang" params={{ lang }} className="brand">{me.identity.title}</Link>
					<div className="nav-right">
						<form className="searchbox" action={`/${lang}/search`} method="get">
							<input type="search" name="q" placeholder={tr.searchPlaceholder} aria-label={tr.search} />
						</form>
						<div className="nav-links">
							<Link to="/$lang/posts" params={{ lang }} search={{}}>{tr.posts}</Link>
							{me.navPages.map((p) => (
								<Link key={p.url_slug} to="/$lang/$slug" params={{ lang, slug: p.url_slug }}>{p.title}</Link>
							))}
							<Link to="/$lang/tags" params={{ lang }}>{tr.tags}</Link>
							{me.user && <a href="/admin" className="nav-admin">{tr.admin}</a>}
						</div>
					</div>
				</nav>
			</header>
			<main id="main">{children}</main>
			<footer className="footer">
				<div className="footer-inner">
					<span>© {new Date().getFullYear()} {me.identity.title}
						<span className="sep">·</span>
						<a href="/rss.xml">RSS</a>
						<span className="sep">·</span>
						<a href="/admin">{me.user ? tr.admin : tr.login}</a>
					</span>
					<div className="footer-controls">
						<LangSwitch locale={me.locale} />
						<ThemeSwitch />
					</div>
				</div>
			</footer>
		</div>
	);
}

export function PostCard({ post, locale = "en" }: { post: PostWithTerms; locale?: Locale }) {
	const tr = t(locale);
	const date = fmtDate(post.published_at ?? post.created_at, locale);
	return (
		<article className="card">
			{post.cover_url && <img className="cover" src={post.cover_url} alt="" loading="lazy" />}
			<div className="card-meta">
				{post.pinned ? <span className="badge pin">★</span> : null}
				{date && <time>{date}</time>}
				<span className="dot" />
				<span>{tr.minRead(post.reading_time)}</span>
				{post.visibility !== "public" && <span className={`badge ${post.visibility}`}>{post.visibility}</span>}
			</div>
			<Link to="/$lang/posts/$slug" params={{ lang: locale, slug: post.url_slug }} className="titlelink">
				<h2 className="card-title">{post.title}</h2>
			</Link>
			{post.excerpt && <p className="card-excerpt">{post.excerpt}</p>}
			{post.tags.length > 0 && (
				<div className="tags">
					{post.tags.map((tag) => (
						<Link key={tag.slug} to="/$lang/tag/$slug" params={{ lang: locale, slug: tag.slug }} search={{}} className="tag">{tag.label}</Link>
					))}
				</div>
			)}
		</article>
	);
}

export function Pager({ page, pages, build }: { page: number; pages: number; build: (p: number) => string }) {
	if (pages <= 1) return null;
	return (
		<nav className="pager">
			<a className={page <= 1 ? "disabled" : ""} href={build(page - 1)}>←</a>
			<span className="current">{page} / {pages}</span>
			<a className={page >= pages ? "disabled" : ""} href={build(page + 1)}>→</a>
		</nav>
	);
}

export function AdminShell({ email, children }: { email?: string | null; children: React.ReactNode }) {
	return (
		<div>
			<header className="admin-header">
				<div className="links">
					<Link to="/admin">Posts</Link>
					<Link to="/admin/posts/new">New</Link>
					<Link to="/admin/comments">Comments</Link>
					<Link to="/admin/media">Media</Link>
					<a href="/en" target="_blank" rel="noreferrer">View site ↗</a>
				</div>
				<div className="nav-right">
					{email && <span className="muted" style={{ fontSize: ".85rem" }}>{email}</span>}
					<LogoutButton />
				</div>
			</header>
			<div className="admin-main">{children}</div>
		</div>
	);
}

function LogoutButton() {
	const router = useRouter();
	return (
		<button type="button" className="btn-ghost" onClick={async () => { await logoutFn(); router.navigate({ to: "/admin/login" }); }}>
			Log out
		</button>
	);
}
