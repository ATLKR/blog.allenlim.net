import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import type { PostWithTerms } from "#/lib/content";
import { type Locale, t } from "#/lib/i18n";
import { logoutFn, setLangFn } from "#/lib/server";

export const SITE = "allenlim.net";

/** Builds a `head()` meta array: title + optional OG/description tags. */
export function pageHead(opts: { title: string; description?: string | null; image?: string | null; type?: "website" | "article"; robots?: string | null }) {
	const meta: Array<Record<string, string>> = [
		{ title: opts.title },
		{ property: "og:title", content: opts.title },
		{ property: "og:type", content: opts.type ?? "website" },
	];
	if (opts.description) {
		meta.push({ name: "description", content: opts.description });
		meta.push({ property: "og:description", content: opts.description });
	}
	if (opts.image) meta.push({ property: "og:image", content: opts.image });
	if (opts.robots) meta.push({ name: "robots", content: opts.robots });
	return { meta };
}

/** Runs highlight.js over rendered markdown after mount. */
export function useHighlight(dep: unknown) {
	useEffect(() => {
		const run = () => (window as unknown as { hljs?: { highlightAll: () => void } }).hljs?.highlightAll();
		run();
		const timer = setTimeout(run, 300);
		return () => clearTimeout(timer);
	}, [dep]);
}

export interface Me {
	user: { id: string; email: string; name: string | null; role: string } | null;
	identity: { title: string; tagline: string };
	needsSetup?: boolean;
	navPages?: Array<{ slug: string; title: string }>;
	locale: Locale;
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

function LangSwitch({ locale }: { locale: Locale }) {
	const router = useRouter();
	const choose = async (lang: Locale) => {
		if (lang === locale) return;
		await setLangFn({ data: { lang } });
		router.invalidate();
	};
	return (
		<div className="lang-switch">
			<button type="button" className={locale === "en" ? "active" : ""} onClick={() => choose("en")}>EN</button>
			<button type="button" className={locale === "ko" ? "active" : ""} onClick={() => choose("ko")}>한국어</button>
		</div>
	);
}

export function SiteLayout({ me, children }: { me: Me; children: React.ReactNode }) {
	const tr = t(me.locale);
	return (
		<div className="site">
			<header className="header">
				<nav className="nav">
					<Link to="/" className="brand">{me.identity.title}</Link>
					<div className="nav-right">
						<form className="searchbox" action="/search" method="get">
							<input type="search" name="q" placeholder={tr.searchPlaceholder} aria-label={tr.search} />
						</form>
						<div className="nav-links">
							<Link to="/posts" search={{}}>{tr.posts}</Link>
							{(me.navPages ?? []).map((p) => (
								<Link key={p.slug} to="/$slug" params={{ slug: p.slug }}>{p.title}</Link>
							))}
							<Link to="/tags">{tr.tags}</Link>
							{me.user && <Link to="/admin" className="nav-admin">{tr.admin}</Link>}
						</div>
					</div>
				</nav>
			</header>
			<main>{children}</main>
			<footer className="footer">
				<div className="footer-inner">
					<span>© {new Date().getFullYear()} {me.identity.title}
						<span className="sep">·</span>
						<Link to={me.user ? "/admin" : "/admin/login"}>{me.user ? tr.admin : tr.login}</Link>
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
			<Link to="/posts/$slug" params={{ slug: post.slug }} className="titlelink">
				<h2 className="card-title">{post.title}</h2>
			</Link>
			{post.excerpt && <p className="card-excerpt">{post.excerpt}</p>}
			{post.tags.length > 0 && (
				<div className="tags">
					{post.tags.map((tag) => (
						<Link key={tag.slug} to="/tag/$slug" params={{ slug: tag.slug }} search={{}} className="tag">{tag.label}</Link>
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
					<a href="/" target="_blank" rel="noreferrer">View site ↗</a>
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
		<button
			type="button"
			className="btn-ghost"
			onClick={async () => {
				await logoutFn();
				router.navigate({ to: "/admin/login" });
			}}
		>
			Log out
		</button>
	);
}
