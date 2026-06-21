import { createFileRoute } from "@tanstack/react-router";
import { PostCard, SITE, SiteLayout, pageHead } from "#/components/ui";
import { searchFn } from "#/lib/server";

export const Route = createFileRoute("/search")({
	validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
	loaderDeps: ({ search }) => ({ q: search.q }),
	loader: ({ deps }) => (deps.q ? searchFn({ data: { q: deps.q } }) : { posts: [], q: "" }),
	head: ({ loaderData }) => pageHead({ title: loaderData?.q ? `Search: ${loaderData.q} — ${SITE}` : `Search — ${SITE}`, robots: "noindex" }),
	component: Search,
});

function Search() {
	const { me } = Route.useRouteContext();
	const { posts, q } = Route.useLoaderData();
	return (
		<SiteLayout me={me}>
			<div className="container">
				<header className="intro">
					<h1>Search</h1>
					<form className="searchbox" action="/search" method="get" style={{ marginTop: "var(--sp-4)" }}>
						<input type="search" name="q" defaultValue={q} placeholder="Search posts…" style={{ width: "100%", maxWidth: 360 }} />
					</form>
				</header>
				{q && <p className="muted">{posts.length} result{posts.length === 1 ? "" : "s"} for “{q}”</p>}
				{posts.map((p) => <PostCard key={p.id} post={p} />)}
			</div>
		</SiteLayout>
	);
}
