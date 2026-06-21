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

const startFetch = createStartHandler(defaultStreamHandler);
const cfEnv = env as unknown as Env;

export default {
	async fetch(request: Request, ...rest: unknown[]) {
		const url = new URL(request.url);
		const path = url.pathname;

		if (request.method === "POST" && path === "/api/media") return uploadResponse(cfEnv, request, url);
		if (path === "/rss.xml") return rssResponse(cfEnv, url);
		if (path === "/sitemap.xml") return sitemapResponse(cfEnv, url);
		if (path === "/robots.txt") return robotsResponse(url);
		if (path.startsWith("/media/")) return mediaResponse(cfEnv, url);

		// @ts-expect-error — pass through the Cloudflare fetch args (request, env, ctx)
		return startFetch(request, ...rest);
	},
};
