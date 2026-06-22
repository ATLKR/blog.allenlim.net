import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import type { Env } from "./env";
import {
	mediaResponse,
	robotsResponse,
	rssResponse,
	sitemapResponse,
	uploadResponse,
} from "#/lib/feeds";
import { resolveLocale } from "#/lib/i18n";
import { ogResponse } from "#/lib/og";

const startFetch = createStartHandler(defaultStreamHandler);
const cfEnv = env as unknown as Env;

const redirect = (to: string, status = 302) => new Response(null, { status, headers: { Location: to } });

export default {
	async fetch(request: Request, ...rest: unknown[]) {
		const url = new URL(request.url);
		const path = url.pathname;

		if (request.method === "POST" && path === "/api/media") return uploadResponse(cfEnv, request, url);
		if (path === "/rss.xml") return rssResponse(cfEnv, url);
		if (path === "/sitemap.xml") return sitemapResponse(cfEnv, url);
		if (path === "/robots.txt") return robotsResponse(url);
		if (path.startsWith("/og/") && path.endsWith(".svg")) return ogResponse(cfEnv, url);
		if (path.startsWith("/media/")) return mediaResponse(cfEnv, url);

		// Language: `/` → detected locale; legacy non-prefixed URLs → 301 to /<lang>/…
		if (request.method === "GET") {
			const lang = resolveLocale(request.headers.get("accept-language"), null);
			if (path === "/") return redirect(`/${lang}`);
			if (path === "/resume") return redirect("/en/resume", 301);
			if (path === "/resume-ko") return redirect("/ko/resume", 301);
			if (/^\/(posts|tag|category|tags|search)(\/|$)/.test(path))
				return redirect(`/${lang}${path}${url.search}`, 301);
		}

		// @ts-expect-error — pass through the Cloudflare fetch args (request, env, ctx)
		return startFetch(request, ...rest);
	},
};
