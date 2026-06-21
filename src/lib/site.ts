import type { Env } from "../env";

export interface SiteIdentity {
	title: string;
	tagline: string;
}

const DEFAULTS: SiteIdentity = {
	title: "allenlim.net",
	tagline: "Engineering notes, projects, and the occasional stray thought.",
};

export async function getSiteIdentity(env: Env | undefined): Promise<SiteIdentity> {
	if (!env) return DEFAULTS;
	try {
		const { results } = await env.DB.prepare(
			"SELECT key, value FROM settings WHERE key IN ('site_title','site_tagline')",
		).all<{ key: string; value: string }>();
		const map = new Map((results ?? []).map((r) => [r.key, r.value]));
		return {
			title: map.get("site_title") || DEFAULTS.title,
			tagline: map.get("site_tagline") || DEFAULTS.tagline,
		};
	} catch {
		return DEFAULTS;
	}
}

export function formatDate(value: string | Date | null | undefined): string | null {
	if (!value) return null;
	const d = typeof value === "string" ? new Date(value) : value;
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
