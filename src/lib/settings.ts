import type { Env } from "../env";

/** Site-wide settings (key/value rows in the `settings` table). */
export interface SiteSettings {
	// General
	site_title: string;
	site_tagline: string;
	default_locale: "en" | "ko";
	author_name: string;
	// SEO / social defaults
	default_description: string;
	default_og_image: string;
	social_github: string;
	social_x: string;
	social_linkedin: string;
	social_email: string;
	// Reading
	posts_per_page: number;
	show_popular: boolean;
	// Comments
	comments_enabled: boolean;
	comments_moderation: "publish" | "hold";
}

export const SETTINGS_DEFAULTS: SiteSettings = {
	site_title: "allenlim.net",
	site_tagline: "Engineering notes, projects, and the occasional stray thought.",
	default_locale: "en",
	author_name: "Allen Lim",
	default_description: "",
	default_og_image: "",
	social_github: "",
	social_x: "",
	social_linkedin: "",
	social_email: "",
	posts_per_page: 10,
	show_popular: true,
	comments_enabled: true,
	comments_moderation: "publish",
};

const BOOL_KEYS = ["show_popular", "comments_enabled"] as const;
const NUM_KEYS = ["posts_per_page"] as const;

export async function getSettings(env: Env): Promise<SiteSettings> {
	const out: SiteSettings = { ...SETTINGS_DEFAULTS };
	const rec = out as unknown as Record<string, unknown>;
	try {
		const { results } = await env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
		for (const { key, value } of results ?? []) {
			if (value == null || !(key in out)) continue;
			if ((BOOL_KEYS as readonly string[]).includes(key)) rec[key] = value === "true" || value === "1";
			else if ((NUM_KEYS as readonly string[]).includes(key)) rec[key] = Number(value) || SETTINGS_DEFAULTS.posts_per_page;
			else rec[key] = value;
		}
	} catch {
		// settings table missing → defaults
	}
	return out;
}

export async function saveSettings(env: Env, patch: Partial<SiteSettings>): Promise<void> {
	const stmts = Object.entries(patch).map(([k, v]) =>
		env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(
			k,
			String(v),
		),
	);
	if (stmts.length) await env.DB.batch(stmts);
}

/** Public subset surfaced to the client (no admin-only secrets). */
export function publicSettings(s: SiteSettings) {
	return {
		defaultLocale: s.default_locale,
		showPopular: s.show_popular,
		commentsEnabled: s.comments_enabled,
		social: { github: s.social_github, x: s.social_x, linkedin: s.social_linkedin, email: s.social_email },
	};
}
export type PublicSettings = ReturnType<typeof publicSettings>;
