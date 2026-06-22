import { createFileRoute, notFound } from "@tanstack/react-router";
import { PostCard, Pager, SITE, SiteLayout, pageHead } from "#/components/ui";
import { t } from "#/lib/i18n";
import { termFn } from "#/lib/server";

export const Route = createFileRoute("/tag/$slug")({
	validateSearch: (s: Record<string, unknown>): { page?: number } => ({ page: s.page ? Number(s.page) || 1 : undefined }),
	loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
	loader: async ({ params, deps }) => {
		const res = await termFn({ data: { kind: "tags", slug: params.slug, page: deps.page } });
		if ("notFound" in res) throw notFound();
		return res;
	},
	head: ({ loaderData }) =>
		loaderData && "term" in loaderData ? pageHead({ title: `#${loaderData.term.label} — ${SITE}` }) : {},
	component: TagView,
});

function TagView() {
	const { me } = Route.useRouteContext();
	const { term, posts, page, pages, total } = Route.useLoaderData();
	const tr = t(me.locale);
	return (
		<SiteLayout me={me}>
			<div className="container">
				<header className="intro">
					<p className="kicker">{tr.tags}</p>
					<h1>#{term.label}</h1>
					<p className="muted">{tr.postsCount(total)}</p>
				</header>
				{posts.map((p) => <PostCard key={p.id} post={p} locale={me.locale} />)}
				<Pager page={page} pages={pages} build={(p) => `/tag/${term.slug}?page=${p}`} />
			</div>
		</SiteLayout>
	);
}
