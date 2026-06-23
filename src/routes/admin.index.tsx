import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell, fmtDate } from "#/components/ui";
import type { PostWithTerms } from "#/lib/content";
import { LOCALES } from "#/lib/i18n";
import { adminListFn } from "#/lib/server";

export const Route = createFileRoute("/admin/")({
	beforeLoad: ({ context }) => {
		if (!context.me.user) throw redirect({ to: "/admin/login" });
	},
	loader: () => adminListFn(),
	component: Dashboard,
});

interface Group {
	rep: PostWithTerms;
	byLocale: Map<string, PostWithTerms>;
	updated: string;
}

function group(posts: PostWithTerms[]): Group[] {
	const groups = new Map<string, PostWithTerms[]>();
	for (const p of posts) {
		const g = p.translation_group || p.id;
		const arr = groups.get(g) ?? [];
		arr.push(p);
		groups.set(g, arr);
	}
	return [...groups.values()]
		.map((entries) => {
			const byLocale = new Map(entries.map((e) => [e.locale, e]));
			const rep = byLocale.get("en") ?? entries[0];
			const updated = entries.reduce((m, e) => (e.updated_at > m ? e.updated_at : m), "");
			return { rep, byLocale, updated };
		})
		.sort((a, b) => (a.updated < b.updated ? 1 : -1));
}

function Dashboard() {
	const { me } = Route.useRouteContext();
	const { posts } = Route.useLoaderData();
	const groups = group(posts);
	const counts = posts.reduce<Record<string, number>>((a, p) => ((a[p.visibility] = (a[p.visibility] ?? 0) + 1), a), {});
	return (
		<AdminShell email={me.user?.email}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
				<div>
					<h1 style={{ fontSize: "1.6rem" }}>Entries</h1>
					<p className="muted" style={{ fontSize: ".85rem", marginTop: ".3rem" }}>
						{groups.length} {groups.length === 1 ? "entry" : "entries"} · {posts.length} translations · {counts.public ?? 0} public · {counts.draft ?? 0} draft
					</p>
				</div>
				<Link to="/admin/posts/new" className="btn">New</Link>
			</div>
			<table className="tbl">
				<thead>
					<tr><th>Title</th><th>Languages</th><th>Type</th><th>Updated</th></tr>
				</thead>
				<tbody>
					{groups.map((g) => (
						<tr key={g.rep.translation_group || g.rep.id}>
							<td>
								<Link to="/admin/posts/$id" params={{ id: g.rep.id }} style={{ fontWeight: 500, color: "var(--color-text)" }}>{g.rep.title}</Link>
								<div className="muted" style={{ fontSize: ".78rem" }}>/{g.rep.url_slug}{g.rep.pinned ? " · 📌" : ""}</div>
							</td>
							<td>
								<div className="langchips">
									{LOCALES.map((loc) => {
										const e = g.byLocale.get(loc);
										return e ? (
											<Link key={loc} to="/admin/posts/$id" params={{ id: e.id }} className={`langchip ${e.visibility}`} title={`${loc.toUpperCase()} · ${e.visibility} — edit`}>
												{loc.toUpperCase()}
											</Link>
										) : (
											<span key={loc} className="langchip missing" title={`${loc.toUpperCase()} — not translated`}>{loc.toUpperCase()}</span>
										);
									})}
								</div>
							</td>
							<td className="muted">{g.rep.type}</td>
							<td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(g.updated)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</AdminShell>
	);
}
