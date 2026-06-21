import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { PostWithTerms } from "#/lib/content";
import { deleteFn, saveFn } from "#/lib/server";

const VIS = ["draft", "private", "unlisted", "public"] as const;

export function PostEditor({ existing, body: initialBody }: { existing?: PostWithTerms; body?: string }) {
	const router = useRouter();
	const [f, setF] = useState({
		title: existing?.title ?? "",
		slug: existing?.slug ?? "",
		type: existing?.type ?? "post",
		visibility: existing?.visibility ?? "draft",
		pinned: !!existing?.pinned,
		cover_url: existing?.cover_url ?? "",
		excerpt: existing?.excerpt ?? "",
		publishedAt: existing?.published_at ? existing.published_at.slice(0, 16) : "",
		tags: existing?.tags.map((t) => t.label).join(", ") ?? "",
		categories: existing?.categories.map((c) => c.label).join(", ") ?? "",
		body: initialBody ?? "",
	});
	const [msg, setMsg] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
		setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

	async function save() {
		if (!f.title.trim()) return setMsg("Title is required.");
		setSaving(true);
		setMsg(null);
		const res = await saveFn({
			data: {
				id: existing?.id,
				title: f.title,
				slug: f.slug || undefined,
				type: f.type,
				visibility: f.visibility,
				pinned: f.pinned,
				cover_url: f.cover_url || null,
				excerpt: f.excerpt || null,
				publishedAt: f.publishedAt ? new Date(f.publishedAt).toISOString() : null,
				tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
				categories: f.categories.split(",").map((s) => s.trim()).filter(Boolean),
				body: f.body,
			},
		});
		setSaving(false);
		if (!res.ok) return setMsg(res.error ?? "Save failed.");
		router.navigate({ to: "/admin/posts/$id", params: { id: res.id! } });
		router.invalidate();
		setMsg("Saved.");
	}

	async function remove() {
		if (!existing || !confirm("Delete this entry permanently?")) return;
		await deleteFn({ data: { id: existing.id } });
		router.navigate({ to: "/admin" });
	}

	return (
		<div>
			{msg && <div className={`notice${msg === "Saved." ? "" : " error"}`}>{msg}</div>}
			<div className="field">
				<label>Title</label>
				<input value={f.title} onChange={set("title")} />
			</div>
			<div className="row">
				<div className="field">
					<label>Slug <span className="hint">(blank = auto)</span></label>
					<input value={f.slug} onChange={set("slug")} placeholder="auto from title" />
				</div>
				<div className="field">
					<label>Type</label>
					<select value={f.type} onChange={set("type")}>
						<option value="post">post</option>
						<option value="page">page</option>
					</select>
				</div>
			</div>
			<div className="row">
				<div className="field">
					<label>Visibility</label>
					<select value={f.visibility} onChange={set("visibility")}>
						{VIS.map((v) => <option key={v} value={v}>{v}</option>)}
					</select>
				</div>
				<div className="field">
					<label>Publish date <span className="hint">(future = scheduled)</span></label>
					<input type="datetime-local" value={f.publishedAt} onChange={set("publishedAt")} />
				</div>
			</div>
			<div className="row">
				<div className="field">
					<label>Categories <span className="hint">(comma)</span></label>
					<input value={f.categories} onChange={set("categories")} />
				</div>
				<div className="field">
					<label>Tags <span className="hint">(comma)</span></label>
					<input value={f.tags} onChange={set("tags")} />
				</div>
			</div>
			<div className="field">
				<label>Cover image URL <span className="hint">(optional)</span></label>
				<input value={f.cover_url} onChange={set("cover_url")} placeholder="/media/…" />
			</div>
			<div className="field">
				<label>Excerpt <span className="hint">(blank = auto)</span></label>
				<input value={f.excerpt} onChange={set("excerpt")} />
			</div>
			<div className="field">
				<label><input type="checkbox" checked={f.pinned} onChange={set("pinned")} style={{ width: "auto", marginRight: 8 }} />Pinned</label>
			</div>
			<div className="field">
				<label>Body <span className="hint">(Markdown)</span></label>
				<textarea rows={22} value={f.body} onChange={set("body")} />
			</div>
			<div className="actions">
				<button type="button" className="btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
				{existing && <button type="button" className="btn-ghost btn-danger" onClick={remove}>Delete</button>}
			</div>
		</div>
	);
}
