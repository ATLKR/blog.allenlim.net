/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

import type { SessionUser } from "./lib/auth";

/** Cloudflare bindings declared in wrangler.jsonc */
export interface Env {
	DB: D1Database;
	MEDIA: R2Bucket;
	SESSION: KVNamespace;
	IMAGES: unknown;
	/** Optional secret, reserved for future use (`wrangler secret put`). */
	SETUP_TOKEN?: string;
}

declare global {
	namespace App {
		interface Locals {
			/** Cloudflare bindings, set by middleware (see src/lib/env.ts). */
			env: Env;
			/** Populated by middleware when a valid session cookie is present. */
			user: SessionUser | null;
			/** Cloudflare execution context (set by the adapter). */
			cfContext?: ExecutionContext;
		}
	}
}

export {};
