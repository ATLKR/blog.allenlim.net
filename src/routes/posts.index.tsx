import { createFileRoute } from "@tanstack/react-router";
import { PostCard, Pager, SITE, SiteLayout, pageHead } from "#/components/ui";
import { listFn } from "#/lib/server";

export const Route = createFileRoute("/posts/")({
	validateSearch: (s: Record<string, unknown>): { page?: number } => ({ page: s.page ? Number(s.page) || 1 : undefined }),
	loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
	loader: ({ deps }) => listFn({ data: { type: "post", page: deps.page } }),
	head: () => pageHead({ title: `All Posts — ${SITE}` }),
	component: Posts,
});

function Posts() {
	const { me } = Route.useRouteContext();
	const { posts, page, pages, total } = Route.useLoaderData();
	return (
		<SiteLayout me={me}>
			<div className="container">
				<header className="intro">
					<p className="kicker">Archive</p>
					<h1>All Posts</h1>
					<p className="muted">{total} {total === 1 ? "post" : "posts"}</p>
				</header>
				{posts.map((p) => (
					<PostCard key={p.id} post={p} />
				))}
				<Pager page={page} pages={pages} build={(p) => `/posts?page=${p}`} />
			</div>
		</SiteLayout>
	);
}
