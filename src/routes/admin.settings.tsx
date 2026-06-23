import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "#/components/ui";
import type { SiteSettings } from "#/lib/settings";
import { saveSettingsFn, settingsFn } from "#/lib/server";

export const Route = createFileRoute("/admin/settings")({
	beforeLoad: ({ context }) => {
		if (!context.me.user) throw redirect({ to: "/admin/login" });
	},
	loader: () => settingsFn(),
	component: Settings,
});

function Settings() {
	const { me } = Route.useRouteContext();
	const { settings } = Route.useLoaderData();
	const [s, setS] = useState<SiteSettings>(settings);
	const [msg, setMsg] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((p) => ({ ...p, [k]: v }));

	async function save() {
		setSaving(true);
		setMsg(null);
		const res = await saveSettingsFn({ data: s });
		setSaving(false);
		setMsg(res.ok ? "Saved." : "Save failed.");
	}

	return (
		<AdminShell email={me.user?.email}>
			<div className="page-head">
				<h1>Settings</h1>
				<button type="button" className="btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
			</div>
			{msg && <div className={`notice${msg === "Saved." ? "" : " error"}`}>{msg}</div>}

			<div className="settings-grid">
				<section className="side-card">
					<h2 className="set-h">General</h2>
					<div className="field"><label>Site title</label><input value={s.site_title} onChange={(e) => set("site_title", e.target.value)} /></div>
					<div className="field"><label>Tagline</label><input value={s.site_tagline} onChange={(e) => set("site_tagline", e.target.value)} /></div>
					<div className="row">
						<div className="field"><label>Default language</label>
							<select value={s.default_locale} onChange={(e) => set("default_locale", e.target.value as "en" | "ko")}>
								<option value="en">English</option><option value="ko">한국어</option>
							</select>
						</div>
						<div className="field"><label>Author name</label><input value={s.author_name} onChange={(e) => set("author_name", e.target.value)} /></div>
					</div>
					<div className="field"><label>Author bio <span className="hint">(shown in the post author box)</span></label><textarea rows={2} value={s.author_bio} onChange={(e) => set("author_bio", e.target.value)} /></div>
				</section>

				<section className="side-card">
					<h2 className="set-h">SEO & Social</h2>
					<div className="field"><label>Default meta description <span className="hint">(fallback)</span></label><textarea rows={2} value={s.default_description} onChange={(e) => set("default_description", e.target.value)} /></div>
					<div className="field"><label>Default OG image URL <span className="hint">(fallback share image)</span></label><input value={s.default_og_image} onChange={(e) => set("default_og_image", e.target.value)} placeholder="/media/… or https://…" /></div>
					<div className="row">
						<div className="field"><label>GitHub</label><input value={s.social_github} onChange={(e) => set("social_github", e.target.value)} placeholder="https://github.com/…" /></div>
						<div className="field"><label>X</label><input value={s.social_x} onChange={(e) => set("social_x", e.target.value)} placeholder="https://x.com/…" /></div>
					</div>
					<div className="row">
						<div className="field"><label>LinkedIn</label><input value={s.social_linkedin} onChange={(e) => set("social_linkedin", e.target.value)} /></div>
						<div className="field"><label>Email</label><input value={s.social_email} onChange={(e) => set("social_email", e.target.value)} placeholder="you@example.com" /></div>
					</div>
				</section>

				<section className="side-card">
					<h2 className="set-h">Reading</h2>
					<div className="field"><label>Posts per page</label><input type="number" min={1} max={50} value={s.posts_per_page} onChange={(e) => set("posts_per_page", Number(e.target.value) || 10)} /></div>
					<label className="checkrow"><input type="checkbox" checked={s.show_popular} onChange={(e) => set("show_popular", e.target.checked)} /> Show “Popular” on the home page</label>
				</section>

				<section className="side-card">
					<h2 className="set-h">Comments</h2>
					<label className="checkrow"><input type="checkbox" checked={s.comments_enabled} onChange={(e) => set("comments_enabled", e.target.checked)} /> Enable comments</label>
					<div className="field" style={{ marginTop: "var(--sp-3)" }}>
						<label>Guest comment moderation</label>
						<select value={s.comments_moderation} onChange={(e) => set("comments_moderation", e.target.value as "publish" | "hold")}>
							<option value="publish">Publish immediately (Turnstile + rate-limit)</option>
							<option value="hold">Hold for my approval</option>
						</select>
					</div>
				</section>
			</div>
		</AdminShell>
	);
}
