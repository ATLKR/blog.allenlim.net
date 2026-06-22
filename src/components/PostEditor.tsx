import { useRouter } from "@tanstack/react-router";
import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import type { PostWithTerms } from "#/lib/content";
import { deleteFn, saveFn } from "#/lib/server";
import { slugify } from "#/lib/slug";

async function uploadFile(file: File): Promise<{ url: string; markdown: string } | null> {
	const fd = new FormData();
	fd.append("file", file);
	const res = await fetch("/api/media", { method: "POST", body: fd });
	if (!res.ok) return null;
	return res.json();
}

interface TbBtn {
	label: string;
	title: string;
	wrap?: [string, string, string];
	line?: string;
}
const TOOLBAR: TbBtn[] = [
	{ label: "B", title: "Bold", wrap: ["**", "**", "bold"] },
	{ label: "i", title: "Italic", wrap: ["_", "_", "italic"] },
	{ label: "H2", title: "Heading", line: "## " },
	{ label: "H3", title: "Subheading", line: "### " },
	{ label: "“”", title: "Quote", line: "> " },
	{ label: "• List", title: "Bullet list", line: "- " },
	{ label: "1.", title: "Numbered list", line: "1. " },
	{ label: "</>", title: "Inline code", wrap: ["`", "`", "code"] },
	{ label: "Code", title: "Code block", wrap: ["```\n", "\n```", "code"] },
	{ label: "Link", title: "Link", wrap: ["[", "](https://)", "text"] },
];

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
		locale: existing?.locale ?? "en",
		translationOf: "",
		tags: existing?.tags.map((t) => t.label).join(", ") ?? "",
		categories: existing?.categories.map((c) => c.label).join(", ") ?? "",
		body: initialBody ?? "",
	});
	const [msg, setMsg] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [dirty, setDirty] = useState(false);
	const [slugTouched, setSlugTouched] = useState(!!existing);
	const [showPreview, setShowPreview] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const coverInput = useRef<HTMLInputElement>(null);
	const bodyRef = useRef<HTMLTextAreaElement>(null);

	const update = (patch: Partial<typeof f>) => {
		setF((p) => ({ ...p, ...patch }));
		setDirty(true);
	};
	const set =
		(k: keyof typeof f) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
			update({ [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value } as Partial<typeof f>);

	const onTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
		const title = e.target.value;
		update(slugTouched ? { title } : { title, slug: slugify(title) });
	};

	// warn on unsaved changes
	useEffect(() => {
		const h = (e: BeforeUnloadEvent) => {
			if (dirty) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", h);
		return () => window.removeEventListener("beforeunload", h);
	}, [dirty]);

	function applyToolbar(b: TbBtn) {
		const ta = bodyRef.current;
		if (!ta) return;
		const { selectionStart: s, selectionEnd: e } = ta;
		const v = f.body;
		let next = v;
		let caret = e;
		if (b.wrap) {
			const [pre, post, ph] = b.wrap;
			const sel = v.slice(s, e) || ph;
			next = v.slice(0, s) + pre + sel + post + v.slice(e);
			caret = s + pre.length + sel.length;
		} else if (b.line) {
			const lineStart = v.lastIndexOf("\n", s - 1) + 1;
			next = v.slice(0, lineStart) + b.line + v.slice(lineStart);
			caret = e + b.line.length;
		}
		update({ body: next });
		requestAnimationFrame(() => {
			ta.focus();
			ta.setSelectionRange(caret, caret);
		});
	}

	function insertAtCursor(text: string) {
		const ta = bodyRef.current;
		const v = f.body;
		const pos = ta?.selectionStart ?? v.length;
		update({ body: `${v.slice(0, pos)}${text}${v.slice(pos)}` });
	}

	async function handleFiles(files: FileList | null) {
		const img = files && [...files].find((x) => x.type.startsWith("image/"));
		if (!img) return;
		setMsg("Uploading image…");
		const r = await uploadFile(img);
		setMsg(r ? null : "Upload failed.");
		if (r) insertAtCursor(`\n\n${r.markdown}\n`);
	}

	async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setMsg("Uploading cover…");
		const r = await uploadFile(file);
		setMsg(r ? null : "Upload failed.");
		if (r) update({ cover_url: r.url });
		e.target.value = "";
	}

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
				locale: f.locale,
				translationOf: f.translationOf.trim() || null,
				tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
				categories: f.categories.split(",").map((s) => s.trim()).filter(Boolean),
				body: f.body,
			},
		});
		setSaving(false);
		if (!res.ok) return setMsg(res.error ?? "Save failed.");
		setDirty(false);
		setMsg("Saved.");
		router.navigate({ to: "/admin/posts/$id", params: { id: res.id! } });
		router.invalidate();
	}

	async function remove() {
		if (!existing || !confirm("Delete this entry permanently?")) return;
		await deleteFn({ data: { id: existing.id } });
		setDirty(false);
		router.navigate({ to: "/admin" });
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: editor-wide Cmd+S shortcut
		<div
			className="editor-grid"
			onKeyDown={(e) => {
				if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
					e.preventDefault();
					save();
				}
			}}
		>
			<div className="editor-main">
				{msg && <div className={`notice${msg === "Saved." ? "" : " error"}`}>{msg}</div>}
				<input className="title-input" value={f.title} onChange={onTitle} placeholder="Title" aria-label="Title" />

				<div className="md-toolbar">
					{TOOLBAR.map((b) => (
						<button key={b.label} type="button" title={b.title} onClick={() => applyToolbar(b)}>{b.label}</button>
					))}
					<span className="tb-spacer" />
					<button type="button" title="Insert image" onClick={() => (document.getElementById("body-img") as HTMLInputElement | null)?.click()}>🖼</button>
					<input id="body-img" type="file" accept="image/*" hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
					<button type="button" className={showPreview ? "active" : ""} onClick={() => setShowPreview((p) => !p)}>{showPreview ? "Write" : "Preview"}</button>
				</div>

				<div className={`editor-panes ${showPreview ? "split" : ""}`}>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone */}
					<div
						className={`ta-wrap ${dragOver ? "drag" : ""}`}
						onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
						onDragLeave={() => setDragOver(false)}
						onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
					>
						<textarea
							ref={bodyRef}
							className="body-input"
							value={f.body}
							onChange={set("body")}
							onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); handleFiles(e.clipboardData.files); } }}
							placeholder="Write in Markdown… (drag or paste an image to upload)"
						/>
					</div>
					{showPreview && (
						// biome-ignore lint/security/noDangerouslySetInnerHtml: author preview
						<div className="prose preview-pane" dangerouslySetInnerHTML={{ __html: marked.parse(f.body || "*Nothing to preview.*", { async: false }) as string }} />
					)}
				</div>

				<div className="actions">
					<button type="button" className="btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}{dirty ? " •" : ""}</button>
					<span className="muted" style={{ fontSize: ".8rem" }}>⌘/Ctrl+S</span>
					{existing && <a href={f.type === "page" ? `/${f.slug}` : `/posts/${f.slug}`} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", fontSize: ".85rem" }}>View ↗</a>}
				</div>
			</div>

			<aside className="editor-side">
				<div className="side-card">
					<div className="field">
						<label>Visibility</label>
						<select value={f.visibility} onChange={set("visibility")}>
							{["draft", "private", "unlisted", "public"].map((v) => <option key={v} value={v}>{v}</option>)}
						</select>
					</div>
					<div className="field">
						<label>Publish date <span className="hint">(future = scheduled)</span></label>
						<input type="datetime-local" value={f.publishedAt} onChange={set("publishedAt")} />
					</div>
					<label className="checkrow"><input type="checkbox" checked={f.pinned} onChange={set("pinned")} /> Pinned</label>
				</div>

				<div className="side-card">
					<div className="field">
						<label>Type</label>
						<select value={f.type} onChange={set("type")}><option value="post">post</option><option value="page">page</option></select>
					</div>
					<div className="field">
						<label>Language</label>
						<select value={f.locale} onChange={set("locale")}><option value="en">English</option><option value="ko">한국어</option></select>
					</div>
					<div className="field">
						<label>Translation of <span className="hint">(slug)</span></label>
						<input value={f.translationOf} onChange={set("translationOf")} placeholder="e.g. resume" />
					</div>
					<div className="field">
						<label>Slug <span className="hint">(auto)</span></label>
						<input value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug")(e); }} placeholder="auto from title" />
					</div>
				</div>

				<div className="side-card">
					<div className="field"><label>Categories <span className="hint">(comma)</span></label><input value={f.categories} onChange={set("categories")} /></div>
					<div className="field"><label>Tags <span className="hint">(comma)</span></label><input value={f.tags} onChange={set("tags")} /></div>
					<div className="field"><label>Excerpt <span className="hint">(blank = auto)</span></label><textarea rows={2} value={f.excerpt} onChange={set("excerpt")} /></div>
				</div>

				<div className="side-card">
					<div className="field">
						<label>Cover image · <button type="button" className="linkish" onClick={() => coverInput.current?.click()}>upload</button></label>
						<input value={f.cover_url} onChange={set("cover_url")} placeholder="/media/… or URL" />
						<input ref={coverInput} type="file" accept="image/*" hidden onChange={onCoverFile} />
						{f.cover_url && <img src={f.cover_url} alt="" style={{ marginTop: 8, borderRadius: 6 }} />}
					</div>
				</div>

				{existing && <button type="button" className="btn-ghost btn-danger" onClick={remove}>Delete entry</button>}
			</aside>
		</div>
	);
}
