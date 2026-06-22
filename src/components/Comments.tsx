import { useEffect, useRef, useState } from "react";
import { type Locale, t } from "#/lib/i18n";
import { addCommentFn } from "#/lib/server";
import { fmtDate } from "./ui";

export interface CommentItem {
	id: string;
	author_name: string;
	body: string;
	created_at: string;
	is_member: boolean;
}

declare global {
	interface Window {
		turnstile?: { reset: (el?: HTMLElement) => void };
	}
}

export function Comments({
	postId,
	initial,
	siteKey,
	member,
	locale = "en",
}: {
	postId: string;
	initial: CommentItem[];
	siteKey: string;
	member: { name: string } | null;
	locale?: Locale;
}) {
	const tr = t(locale);
	const [comments, setComments] = useState<CommentItem[]>(initial);
	const [name, setName] = useState(member?.name ?? "");
	const [email, setEmail] = useState("");
	const [body, setBody] = useState("");
	const [msg, setMsg] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const widgetRef = useRef<HTMLDivElement>(null);

	// Load the Turnstile script once (guests only).
	useEffect(() => {
		if (member || !siteKey) return;
		if (document.querySelector("script[data-turnstile]")) return;
		const s = document.createElement("script");
		s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
		s.async = true;
		s.defer = true;
		s.dataset.turnstile = "1";
		document.head.appendChild(s);
	}, [member, siteKey]);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setMsg(null);
		const token = member
			? "member"
			: String(new FormData(e.currentTarget).get("cf-turnstile-response") ?? "");
		if (!member && !token) return setMsg(tr.captchaIncomplete);
		setBusy(true);
		const res = await addCommentFn({ data: { postId, name, email, body, token } });
		setBusy(false);
		if (!res.ok) {
			setMsg(res.error ?? "Failed to post.");
			window.turnstile?.reset(widgetRef.current ?? undefined);
			return;
		}
		setComments((c) => [...c, res.comment!]);
		setBody("");
		setMsg(tr.posted);
		window.turnstile?.reset(widgetRef.current ?? undefined);
	}

	return (
		<section className="comments">
			<h2>{tr.comments} {comments.length > 0 && <span className="muted">({comments.length})</span>}</h2>
			<ul className="comment-list">
				{comments.length === 0 && <p className="muted">{tr.noComments}</p>}
				{comments.map((c) => (
					<li key={c.id} className="comment">
						<div className="comment-head">
							<span className="comment-author">{c.author_name}{c.is_member && <span className="badge pin" style={{ marginLeft: 6 }}>member</span>}</span>
							<time className="muted">{fmtDate(c.created_at, locale)}</time>
						</div>
						<p className="comment-body">{c.body}</p>
					</li>
				))}
			</ul>

			<form className="comment-form" onSubmit={submit}>
				<h3>{tr.leaveComment}</h3>
				{msg && <div className={`notice${msg === tr.posted ? "" : " error"}`}>{msg}</div>}
				{!member && (
					<div className="row">
						<div className="field"><label>{tr.name}</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
						<div className="field"><label>{tr.emailOptional}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
					</div>
				)}
				{member && <p className="muted" style={{ fontSize: ".85rem" }}>{tr.commentingAs} <strong>{member.name}</strong>.</p>}
				<div className="field"><label>{tr.commentLabel}</label><textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} required /></div>
				{!member && siteKey && <div ref={widgetRef} className="cf-turnstile" data-sitekey={siteKey} style={{ marginBottom: "1rem" }} />}
				<button type="submit" className="btn" disabled={busy}>{busy ? tr.posting : tr.postComment}</button>
			</form>
		</section>
	);
}
