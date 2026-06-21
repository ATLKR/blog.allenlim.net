import { env as runtimeEnv } from "cloudflare:workers";
import type { Env } from "../env";

/**
 * Cloudflare bindings. Astro v6's cloudflare adapter removed
 * `Astro.locals.runtime.env`, so we read bindings from `cloudflare:workers`.
 * Middleware stashes this on `locals.env` for convenient access in pages.
 */
export function getEnv(): Env {
	return runtimeEnv as unknown as Env;
}
