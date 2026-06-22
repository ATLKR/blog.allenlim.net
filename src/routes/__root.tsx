import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { meFn } from "#/lib/server";
import appCss from "#/styles/app.css?url";

const FAVICON =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230066cc'/%3E%3Ctext x='16' y='22' font-family='Inter,sans-serif' font-size='18' font-weight='700' fill='white' text-anchor='middle'%3Ea%3C/text%3E%3C/svg%3E";

export const Route = createRootRoute({
	beforeLoad: async () => ({ me: await meFn() }),
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: FAVICON },
			{ rel: "alternate", type: "application/rss+xml", title: "RSS", href: "/rss.xml" },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
			},
			{
				rel: "stylesheet",
				href: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/styles/github.min.css",
				media: "(prefers-color-scheme: light)",
			},
			{
				rel: "stylesheet",
				href: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/styles/github-dark.min.css",
				media: "(prefers-color-scheme: dark)",
			},
		],
		scripts: [
			{ src: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/highlight.min.js", defer: true },
		],
	}),
	notFoundComponent: NotFound,
	shellComponent: RootDocument,
});

const THEME_INIT = `(function(){try{var m=document.cookie.match(/theme=([^;]+)/);var t=m&&m[1];if(t==='dark'||t==='light'){document.documentElement.classList.add(t)}else if(matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}})()`;

function ReadingProgress() {
	const [w, setW] = useState(0);
	useEffect(() => {
		const on = () => {
			const h = document.documentElement;
			const max = h.scrollHeight - h.clientHeight;
			setW(max > 40 ? (h.scrollTop / max) * 100 : 0);
		};
		on();
		addEventListener("scroll", on, { passive: true });
		addEventListener("resize", on);
		return () => {
			removeEventListener("scroll", on);
			removeEventListener("resize", on);
		};
	}, []);
	return <div className="progress-bar" style={{ width: `${w}%` }} aria-hidden="true" />;
}

function NotFound() {
	return (
		<div className="nf">
			<p className="code">404</p>
			<h1>Page not found · 페이지를 찾을 수 없습니다</h1>
			<p className="muted" style={{ margin: "1rem 0 2rem" }}>That page doesn't exist, or it's private.</p>
			<a href="/" className="btn">← Home</a>
		</div>
	);
}

function RootDocument() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
			</head>
			<body>
				<a href="#main" className="skip-link">Skip to content</a>
				<ReadingProgress />
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}
