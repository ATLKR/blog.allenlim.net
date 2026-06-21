import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell, fmtDate } from "#/components/ui";
import { adminListFn } from "#/lib/server";

export const Route = createFileRoute("/admin/")({
	beforeLoad: ({ context }) => {
		if (!context.me.user) throw redirect({ to: "/admin/login" });
	},
	loader: () => adminListFn(),
	component: Dashboard,
});

function Dashboard() {
	const { me } = Route.useRouteContext();
	const { posts } = Route.useLoaderData();
	const counts = posts.reduce<Record<string, number>>((a, p) => ((a[p.visibility] = (a[p.visibility] ?? 0) + 1), a), {});
	return (
		<AdminShell email={me.user?.email}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
				<div>
					<h1 style={{ fontSize: "1.6rem" }}>Posts</h1>
					<p className="muted" style={{ fontSize: ".85rem", marginTop: ".3rem" }}>
						{posts.length} total · {counts.public ?? 0} public · {counts.unlisted ?? 0} unlisted · {counts.private ?? 0} private · {counts.draft ?? 0} draft
					</p>
				</div>
				<Link to="/admin/posts/new" className="btn">New</Link>
			</div>
			<table className="tbl">
				<thead><tr><th>Title</th><th>Type</th><th>Visibility</th><th>Updated</th></tr></thead>
				<tbody>
					{posts.map((p) => (
						<tr key={p.id}>
							<td>
								<Link to="/admin/posts/$id" params={{ id: p.id }} style={{ fontWeight: 500, color: "var(--color-text)" }}>{p.title}</Link>
								<div className="muted" style={{ fontSize: ".78rem" }}>/{p.slug}{p.pinned ? " · 📌" : ""}</div>
							</td>
							<td className="muted">{p.type}</td>
							<td><span className={`badge ${p.visibility}`}>{p.visibility}</span></td>
							<td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(p.updated_at)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</AdminShell>
	);
}
