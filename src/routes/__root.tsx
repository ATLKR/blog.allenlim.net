import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { meFn } from "#/lib/server";
import appCss from "#/styles/app.css?url";

export const Route = createRootRoute({
	beforeLoad: async () => ({ me: await meFn() }),
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
			},
		],
	}),
	shellComponent: RootDocument,
});

const THEME_INIT = `(function(){try{var m=document.cookie.match(/theme=([^;]+)/);var t=m&&m[1];if(t==='dark'||t==='light'){document.documentElement.classList.add(t)}else if(matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}})()`;

function RootDocument() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
			</head>
			<body>
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}
