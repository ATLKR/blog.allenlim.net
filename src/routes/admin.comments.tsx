import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { AdminShell, fmtDate } from "#/components/ui";
import { adminCommentsFn, commentStatusFn, deleteCommentFn } from "#/lib/server";

export const Route = createFileRoute("/admin/comments")({
	beforeLoad: ({ context }) => {
		if (!context.me.user) throw redirect({ to: "/admin/login" });
	},
	loader: () => adminCommentsFn(),
	component: CommentsAdmin,
});

function CommentsAdmin() {
	const { me } = Route.useRouteContext();
	const { comments } = Route.useLoaderData();
	const router = useRouter();
	const act = async (fn: Promise<unknown>) => {
		await fn;
		router.invalidate();
	};
	return (
		<AdminShell email={me.user?.email}>
			<h1 style={{ fontSize: "1.6rem", marginBottom: "1.5rem" }}>Comments</h1>
			{comments.length === 0 ? (
				<p className="muted">No comments yet.</p>
			) : (
				<table className="tbl">
					<thead><tr><th>Comment</th><th>Post</th><th>Status</th><th>Actions</th></tr></thead>
					<tbody>
						{comments.map((c) => (
							<tr key={c.id}>
								<td>
									<strong>{c.author_name}</strong>
									{c.user_id && <span className="badge pin" style={{ marginLeft: 6 }}>member</span>}
									<div className="muted" style={{ fontSize: ".78rem" }}>{fmtDate(c.created_at)}</div>
									<div style={{ marginTop: 4 }}>{c.body}</div>
								</td>
								<td>{c.post_slug ? <a href={`/posts/${c.post_slug}`} target="_blank" rel="noreferrer">{c.post_title}</a> : "—"}</td>
								<td><span className={`badge ${c.status === "published" ? "pin" : c.status === "spam" ? "private" : "draft"}`}>{c.status}</span></td>
								<td>
									<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
										{c.status !== "published" && <button className="btn-ghost" onClick={() => act(commentStatusFn({ data: { id: c.id, status: "published" } }))}>Publish</button>}
										{c.status !== "hidden" && <button className="btn-ghost" onClick={() => act(commentStatusFn({ data: { id: c.id, status: "hidden" } }))}>Hide</button>}
										{c.status !== "spam" && <button className="btn-ghost" onClick={() => act(commentStatusFn({ data: { id: c.id, status: "spam" } }))}>Spam</button>}
										<button className="btn-ghost btn-danger" onClick={() => confirm("Delete?") && act(deleteCommentFn({ data: { id: c.id } }))}>Delete</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</AdminShell>
	);
}
