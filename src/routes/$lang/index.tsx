import { Link, createFileRoute } from "@tanstack/react-router";
import { PostCard, SITE, pageHead } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { listFn, popularFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/")({
	loader: async ({ params }) => {
		const locale = params.lang as Locale;
		const [list, popular] = await Promise.all([
			listFn({ data: { locale, type: "post", page: 1 } }),
			popularFn({ data: { locale } }),
		]);
		return { ...list, popular: popular.posts };
	},
	head: ({ params }) => pageHead({ title: SITE, path: `/${params.lang}` }),
	component: Home,
});

function Home() {
	const { me, locale } = Route.useRouteContext();
	const { posts, popular } = Route.useLoaderData();
	const tr = t(locale);
	return (
		<div className="container">
			<header className="intro">
				<h1>{me.identity.title}</h1>
				<p>{me.identity.tagline}</p>
			</header>
			{popular.length > 0 && (
				<section className="popular">
					<h2 className="section-label">{tr.popular}</h2>
					<ul>
						{popular.map((p) => (
							<li key={p.id}>
								<Link to="/$lang/posts/$slug" params={{ lang: locale, slug: p.url_slug }}>{p.title}</Link>
							</li>
						))}
					</ul>
				</section>
			)}
			{posts.length === 0 ? (
				<p className="muted">{tr.noPosts}</p>
			) : (
				posts.map((p) => <PostCard key={p.id} post={p} locale={locale} />)
			)}
		</div>
	);
}
