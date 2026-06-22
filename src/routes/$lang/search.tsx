import { createFileRoute } from "@tanstack/react-router";
import { PostCard, SITE, pageHead } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { searchFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/search")({
	validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
	loaderDeps: ({ search }) => ({ q: search.q }),
	loader: ({ params, deps }) =>
		deps.q ? searchFn({ data: { q: deps.q, locale: params.lang as Locale } }) : { posts: [], q: "" },
	head: ({ params }) => pageHead({ title: `${t(params.lang as Locale).search} — ${SITE}`, path: `/${params.lang}/search`, robots: "noindex" }),
	component: Search,
});

function Search() {
	const { locale } = Route.useRouteContext();
	const { posts, q } = Route.useLoaderData();
	const tr = t(locale);
	return (
		<div className="container">
			<header className="intro">
				<h1>{tr.search}</h1>
				<form className="searchbox" action={`/${locale}/search`} method="get" style={{ marginTop: "var(--sp-4)" }}>
					<input type="search" name="q" defaultValue={q} placeholder={tr.searchPlaceholder} style={{ width: "100%", maxWidth: 360 }} />
				</form>
			</header>
			{q && <p className="muted">{tr.resultsFor(posts.length, q)}</p>}
			{posts.map((p) => <PostCard key={p.id} post={p} locale={locale} />)}
		</div>
	);
}
