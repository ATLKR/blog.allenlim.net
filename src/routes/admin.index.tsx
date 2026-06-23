import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
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

const FILTERS = [
	{ key: "all", label: "All" },
	{ key: "post", label: "Posts" },
	{ key: "page", label: "Pages" },
	{ key: "public", label: "Published" },
	{ key: "draft", label: "Drafts" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function matches(g: Group, f: FilterKey): boolean {
	if (f === "all") return true;
	if (f === "post" || f === "page") return g.rep.type === f;
	return [...g.byLocale.values()].some((e) => e.visibility === f);
}

function Dashboard() {
	const { me } = Route.useRouteContext();
	const { posts } = Route.useLoaderData();
	const [filter, setFilter] = useState<FilterKey>("all");
	const allGroups = group(posts);
	const groups = allGroups.filter((g) => matches(g, filter));
	return (
		<AdminShell email={me.user?.email}>
			<div className="page-head">
				<h1>Entries</h1>
				<Link to="/admin/posts/new" className="btn">New entry</Link>
			</div>
			<div className="filters">
				{FILTERS.map((f) => (
					<button key={f.key} type="button" className={`filter ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>
						{f.label} <span className="n">{allGroups.filter((g) => matches(g, f.key)).length}</span>
					</button>
				))}
			</div>
			{groups.length === 0 ? (
				<p className="muted" style={{ marginTop: "2rem" }}>Nothing here yet.</p>
			) : (
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
											<Link key={loc} to="/admin/posts/new" search={{ translationOf: g.rep.slug, lang: loc }} className="langchip missing" title={`${loc.toUpperCase()} — add translation`}>
												+{loc.toUpperCase()}
											</Link>
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
			)}
		</AdminShell>
	);
}
