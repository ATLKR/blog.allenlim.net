/// <reference types="@cloudflare/workers-types" />

/** Cloudflare bindings declared in wrangler.jsonc (also see worker-configuration.d.ts). */
export interface Env {
	DB: D1Database;
	MEDIA: R2Bucket;
	SESSION: KVNamespace;
	IMAGES: unknown;
}
