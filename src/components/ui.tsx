import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import type { PostWithTerms } from "#/lib/content";

export interface Me {
	user: { id: string; email: string; name: string | null; role: string } | null;
	identity: { title: string; tagline: string };
	needsSetup?: boolean;
}

export function fmtDate(value?: string | null) {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function ThemeSwitch() {
	useEffect(() => {
		const root = document.documentElement;
		const btns = document.querySelectorAll<HTMLButtonElement>(".theme-switch button");
		const set = (t: string) => {
			const secure = location.protocol === "https:" ? "; Secure" : "";
			root.classList.remove("light", "dark");
			if (t === "system") {
				document.cookie = `theme=; path=/; max-age=0; SameSite=Lax${secure}`;
				if (matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
			} else {
				document.cookie = `theme=${t}; path=/; max-age=31536000; SameSite=Lax${secure}`;
				root.classList.add(t);
			}
			btns.forEach((b) => b.classList.toggle("active", b.dataset.t === t));
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

export function SiteLayout({ me, children }: { me: Me; children: React.ReactNode }) {
	return (
		<div className="site">
			<header className="header">
				<nav className="nav">
					<Link to="/" className="brand">{me.identity.title}</Link>
					<div className="nav-right">
						<form className="searchbox" action="/search" method="get">
							<input type="search" name="q" placeholder="Search…" aria-label="Search" />
						</form>
						<div className="nav-links">
							<Link to="/posts" search={{}}>Posts</Link>
							<Link to="/tags">Tags</Link>
							{me.user && <Link to="/admin" className="nav-admin">Admin</Link>}
						</div>
					</div>
				</nav>
			</header>
			<main>{children}</main>
			<footer className="footer">
				<div className="footer-inner">
					<span>© {new Date().getFullYear()} {me.identity.title}
						<span className="sep">·</span>
						<Link to={me.user ? "/admin" : "/admin/login"}>{me.user ? "Admin" : "Log in"}</Link>
					</span>
					<ThemeSwitch />
				</div>
			</footer>
		</div>
	);
}

export function PostCard({ post }: { post: PostWithTerms }) {
	const date = fmtDate(post.published_at ?? post.created_at);
	return (
		<article className="card">
			{post.cover_url && <img className="cover" src={post.cover_url} alt="" loading="lazy" />}
			<div className="card-meta">
				{post.pinned ? <span className="badge pin">pinned</span> : null}
				{date && <time>{date}</time>}
				<span className="dot" />
				<span>{post.reading_time} min read</span>
				{post.visibility !== "public" && <span className={`badge ${post.visibility}`}>{post.visibility}</span>}
			</div>
			<Link to="/posts/$slug" params={{ slug: post.slug }} className="titlelink">
				<h2 className="card-title">{post.title}</h2>
			</Link>
			{post.excerpt && <p className="card-excerpt">{post.excerpt}</p>}
			{post.tags.length > 0 && (
				<div className="tags">
					{post.tags.map((t) => (
						<Link key={t.slug} to="/tag/$slug" params={{ slug: t.slug }} search={{}} className="tag">{t.label}</Link>
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
			<a className={page <= 1 ? "disabled" : ""} href={build(page - 1)}>← Prev</a>
			<span className="current">{page} / {pages}</span>
			<a className={page >= pages ? "disabled" : ""} href={build(page + 1)}>Next →</a>
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

import { logoutFn } from "#/lib/server";
import { useRouter } from "@tanstack/react-router";
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
