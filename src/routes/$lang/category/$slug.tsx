import { createFileRoute, notFound } from "@tanstack/react-router";
import { PostCard, Pager } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { termFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/category/$slug")({
	validateSearch: (s: Record<string, unknown>): { page?: number } => ({ page: s.page ? Number(s.page) || 1 : undefined }),
	loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
	loader: async ({ params, deps }) => {
		const res = await termFn({ data: { kind: "categories", slug: params.slug, locale: params.lang as Locale, page: deps.page } });
		if ("notFound" in res) throw notFound();
		return res;
	},
	component: CategoryView,
});

function CategoryView() {
	const { locale } = Route.useRouteContext();
	const { term, posts, page, pages, total } = Route.useLoaderData();
	const tr = t(locale);
	return (
		<div className="container">
			<header className="intro">
				<p className="kicker">{tr.categories}</p>
				<h1>{term.label}</h1>
				<p className="muted">{tr.postsCount(total)}</p>
			</header>
			{posts.map((p) => <PostCard key={p.id} post={p} locale={locale} />)}
			<Pager page={page} pages={pages} build={(p) => `/${locale}/category/${term.slug}?page=${p}`} />
		</div>
	);
}
