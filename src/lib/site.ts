import type { Env } from "../env";
import { getSettings } from "./settings";

export interface SiteIdentity {
	title: string;
	tagline: string;
}

export async function getSiteIdentity(env: Env | undefined): Promise<SiteIdentity> {
	if (!env) return { title: "allenlim.net", tagline: "" };
	const s = await getSettings(env);
	return { title: s.site_title, tagline: s.site_tagline };
}

export function formatDate(value: string | Date | null | undefined): string | null {
	if (!value) return null;
	const d = typeof value === "string" ? new Date(value) : value;
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
