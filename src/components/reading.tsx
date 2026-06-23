import { useEffect, useState } from "react";
import type { Locale } from "#/lib/i18n";
import { reactFn, searchFn } from "#/lib/server";

const SITE_ORIGIN = "https://blog.allenlim.net";

/** Highlights the heading currently in view (for the sticky TOC). */
export function useScrollSpy(ids: string[]): string | null {
	const [active, setActive] = useState<string | null>(ids[0] ?? null);
	const key = ids.join(",");
	useEffect(() => {
		if (!ids.length) return;
		const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
		const obs = new IntersectionObserver(
			(entries) => {
				const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (vis[0]) setActive(vis[0].target.id);
			},
			{ rootMargin: "0px 0px -70% 0px", threshold: 0 },
		);
		for (const el of els) obs.observe(el);
		return () => obs.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);
	return active;
}

export function BackToTop() {
	const [show, setShow] = useState(false);
	useEffect(() => {
		const on = () => setShow(window.scrollY > 700);
		on();
		addEventListener("scroll", on, { passive: true });
		return () => removeEventListener("scroll", on);
	}, []);
	if (!show) return null;
	return (
		<button type="button" className="to-top" aria-label="Back to top" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
	);
}

export function FontSize() {
	const set = (v: "md" | "lg") => {
		const secure = location.protocol === "https:" ? "; Secure" : "";
		if (v === "md") {
			document.cookie = `fs=; path=/; max-age=0; SameSite=Lax${secure}`;
			delete document.documentElement.dataset.fs;
		} else {
			document.cookie = `fs=lg; path=/; max-age=31536000; SameSite=Lax${secure}`;
			document.documentElement.dataset.fs = "lg";
		}
	};
	return (
		<div className="fontsize" title="Text size">
			<button type="button" onClick={() => set("md")} aria-label="Normal text">A</button>
			<button type="button" onClick={() => set("lg")} aria-label="Larger text" style={{ fontSize: "1.15em" }}>A</button>
		</div>
	);
}

export function Lightbox() {
	const [src, setSrc] = useState<string | null>(null);
	useEffect(() => {
		const on = (e: MouseEvent) => {
			const t = e.target as HTMLElement;
			if (t.tagName === "IMG" && t.closest(".prose")) setSrc((t as HTMLImageElement).currentSrc || (t as HTMLImageElement).src);
		};
		document.addEventListener("click", on);
		return () => document.removeEventListener("click", on);
	}, []);
	if (!src) return null;
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: click-to-close overlay
		<div className="lightbox" onClick={() => setSrc(null)}>
			<img src={src} alt="" />
		</div>
	);
}

export function CommandPalette({ locale }: { locale: Locale }) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const [results, setResults] = useState<Array<{ id: string; title: string; url_slug: string }>>([]);
	useEffect(() => {
		const on = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setOpen((o) => !o);
			} else if (e.key === "Escape") setOpen(false);
		};
		addEventListener("keydown", on);
		return () => removeEventListener("keydown", on);
	}, []);
	useEffect(() => {
		if (!q.trim()) {
			setResults([]);
			return;
		}
		let live = true;
		const t = setTimeout(async () => {
			const r = await searchFn({ data: { q, locale } });
			if (live) setResults(r.posts.map((p) => ({ id: p.id, title: p.title, url_slug: p.url_slug })));
		}, 200);
		return () => {
			live = false;
			clearTimeout(t);
		};
	}, [q, locale]);
	if (!open) return null;
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: click-to-close overlay
		<div className="cmdk" onClick={() => setOpen(false)}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
			<div className="cmdk-box" onClick={(e) => e.stopPropagation()}>
				<input
					// biome-ignore lint/a11y/noAutofocus: command palette
					autoFocus
					placeholder="Search…"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && q.trim()) location.href = `/${locale}/search?q=${encodeURIComponent(q)}`;
					}}
				/>
				{results.length > 0 && (
					<ul>
						{results.map((p) => (
							<li key={p.id}><a href={`/${locale}/posts/${p.url_slug}`}>{p.title}</a></li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

export function ShareButtons({ path, title }: { path: string; title: string }) {
	const url = SITE_ORIGIN + path;
	const [copied, setCopied] = useState(false);
	return (
		<div className="share">
			<button type="button" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
				{copied ? "Copied ✓" : "Copy link"}
			</button>
			<a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer">Share on X</a>
		</div>
	);
}

export function Reactions({ postId, initial }: { postId: string; initial: number }) {
	const [count, setCount] = useState(initial);
	const [done, setDone] = useState(false);
	return (
		<button
			type="button"
			className={`react ${done ? "done" : ""}`}
			disabled={done}
			onClick={async () => {
				setDone(true);
				const r = await reactFn({ data: { id: postId } });
				setCount(r.count);
			}}
			aria-label="Like this post"
		>
			♥ <span>{count}</span>
		</button>
	);
}

export function AuthorBox({ author }: { author: { name: string; bio: string; social: { github: string; x: string; linkedin: string; email: string } } }) {
	const initials = author.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
	const s = author.social;
	const links = [
		s.github && { label: "GitHub", href: s.github },
		s.x && { label: "X", href: s.x },
		s.linkedin && { label: "LinkedIn", href: s.linkedin },
		s.email && { label: "Email", href: `mailto:${s.email}` },
	].filter(Boolean) as Array<{ label: string; href: string }>;
	if (!author.name && !author.bio) return null;
	return (
		<aside className="author-box">
			<div className="avatar">{initials}</div>
			<div>
				<div className="a-name">{author.name}</div>
				{author.bio && <p className="a-bio">{author.bio}</p>}
				{links.length > 0 && (
					<div className="a-social">
						{links.map((l) => (
							<a key={l.label} href={l.href} target={l.href.startsWith("mailto") ? undefined : "_blank"} rel="noreferrer">{l.label}</a>
						))}
					</div>
				)}
			</div>
		</aside>
	);
}
