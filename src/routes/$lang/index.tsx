import { createFileRoute } from "@tanstack/react-router";
import { PostCard } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { listFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/")({
	loader: ({ params }) => listFn({ data: { locale: params.lang as Locale, type: "post", page: 1 } }),
	component: Home,
});

function Home() {
	const { me, locale } = Route.useRouteContext();
	const { posts } = Route.useLoaderData();
	const tr = t(locale);
	return (
		<div className="container">
			<header className="intro">
				<h1>{me.identity.title}</h1>
				<p>{me.identity.tagline}</p>
			</header>
			{posts.length === 0 ? (
				<p className="muted">{tr.noPosts}</p>
			) : (
				posts.map((p) => <PostCard key={p.id} post={p} locale={locale} />)
			)}
		</div>
	);
}
