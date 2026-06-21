import { useEffect, useRef, useState } from "react";
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
}: {
	postId: string;
	initial: CommentItem[];
	siteKey: string;
	member: { name: string } | null;
}) {
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
		if (!member && !token) return setMsg("Please complete the captcha.");
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
		setMsg("Posted.");
		window.turnstile?.reset(widgetRef.current ?? undefined);
	}

	return (
		<section className="comments">
			<h2>Comments {comments.length > 0 && <span className="muted">({comments.length})</span>}</h2>
			<ul className="comment-list">
				{comments.length === 0 && <p className="muted">No comments yet. Be the first.</p>}
				{comments.map((c) => (
					<li key={c.id} className="comment">
						<div className="comment-head">
							<span className="comment-author">{c.author_name}{c.is_member && <span className="badge pin" style={{ marginLeft: 6 }}>member</span>}</span>
							<time className="muted">{fmtDate(c.created_at)}</time>
						</div>
						<p className="comment-body">{c.body}</p>
					</li>
				))}
			</ul>

			<form className="comment-form" onSubmit={submit}>
				<h3>Leave a comment</h3>
				{msg && <div className={`notice${msg === "Posted." ? "" : " error"}`}>{msg}</div>}
				{!member && (
					<div className="row">
						<div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
						<div className="field"><label>Email <span className="hint">(optional, private)</span></label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
					</div>
				)}
				{member && <p className="muted" style={{ fontSize: ".85rem" }}>Commenting as <strong>{member.name}</strong>.</p>}
				<div className="field"><label>Comment</label><textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} required /></div>
				{!member && siteKey && <div ref={widgetRef} className="cf-turnstile" data-sitekey={siteKey} style={{ marginBottom: "1rem" }} />}
				<button type="submit" className="btn" disabled={busy}>{busy ? "Posting…" : "Post comment"}</button>
			</form>
		</section>
	);
}
