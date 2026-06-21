/// <reference types="@cloudflare/workers-types" />

/** Cloudflare bindings declared in wrangler.jsonc (also see worker-configuration.d.ts). */
export interface Env {
	DB: D1Database;
	MEDIA: R2Bucket;
	SESSION: KVNamespace;
	IMAGES: unknown;
	/** Public Turnstile site key (wrangler.jsonc vars). */
	TURNSTILE_SITEKEY?: string;
	/** Turnstile secret (wrangler secret). */
	TURNSTILE_SECRET?: string;
}
