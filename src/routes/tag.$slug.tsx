import { createFileRoute, notFound } from "@tanstack/react-router";
import { PostCard, Pager, SiteLayout } from "#/components/ui";
import { termFn } from "#/lib/server";

export const Route = createFileRoute("/tag/$slug")({
	validateSearch: (s: Record<string, unknown>): { page?: number } => ({ page: s.page ? Number(s.page) || 1 : undefined }),
	loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
	loader: async ({ params, deps }) => {
		const res = await termFn({ data: { kind: "tags", slug: params.slug, page: deps.page } });
		if ("notFound" in res) throw notFound();
		return res;
	},
	component: TagView,
});

function TagView() {
	const { me } = Route.useRouteContext();
	const { term, posts, page, pages, total } = Route.useLoaderData();
	return (
		<SiteLayout me={me}>
			<div className="container">
				<header className="intro">
					<p className="kicker">Tag</p>
					<h1>#{term.label}</h1>
					<p className="muted">{total} {total === 1 ? "post" : "posts"}</p>
				</header>
				{posts.map((p) => <PostCard key={p.id} post={p} />)}
				<Pager page={page} pages={pages} build={(p) => `/tag/${term.slug}?page=${p}`} />
			</div>
		</SiteLayout>
	);
}
