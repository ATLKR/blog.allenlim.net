import cloudflare from "@astrojs/cloudflare";
import { defineConfig, fontProviders } from "astro/config";

// Custom CMS — content lives in D1 (metadata) + R2 (bodies/media), never in git.
// See ARCHITECTURE.md. Server-rendered on Cloudflare Workers.
export default defineConfig({
	site: "https://blog.allenlim.net",
	output: "server",
	adapter: cloudflare({
		imageService: "cloudflare",
		platformProxy: { enabled: true },
	}),
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-sans",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
