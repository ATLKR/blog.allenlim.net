import { createFileRoute } from "@tanstack/react-router";
import { PostCard, Pager, SITE, pageHead } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { listFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/posts/")({
	validateSearch: (s: Record<string, unknown>): { page?: number } => ({ page: s.page ? Number(s.page) || 1 : undefined }),
	loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
	loader: ({ params, deps }) => listFn({ data: { locale: params.lang as Locale, type: "post", page: deps.page } }),
	head: ({ params }) => pageHead({ title: `${t(params.lang as Locale).allPosts} — ${SITE}`, path: `/${params.lang}/posts` }),
	component: Posts,
});

function Posts() {
	const { locale } = Route.useRouteContext();
	const { posts, page, pages, total } = Route.useLoaderData();
	const tr = t(locale);
	return (
		<div className="container">
			<header className="intro">
				<h1>{tr.allPosts}</h1>
				<p className="muted">{tr.postsCount(total)}</p>
			</header>
			{posts.map((p) => <PostCard key={p.id} post={p} locale={locale} />)}
			<Pager page={page} pages={pages} build={(p) => `/${locale}/posts?page=${p}`} />
		</div>
	);
}
