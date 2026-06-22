import { createFileRoute } from "@tanstack/react-router";
import { PostCard, Pager, SITE, SiteLayout, pageHead } from "#/components/ui";
import { t } from "#/lib/i18n";
import { listFn } from "#/lib/server";

export const Route = createFileRoute("/")({
	loader: () => listFn({ data: { type: "post", page: 1 } }),
	head: () => pageHead({ title: SITE }),
	component: Home,
});

function Home() {
	const { me } = Route.useRouteContext();
	const { posts, page, pages } = Route.useLoaderData();
	const tr = t(me.locale);
	return (
		<SiteLayout me={me}>
			<div className="container">
				<header className="intro">
					<h1>{me.identity.title}</h1>
					<p>{me.identity.tagline}</p>
				</header>
				{posts.length === 0 ? (
					<p className="muted">{tr.noPosts}</p>
				) : (
					<section>
						{posts.map((p) => (
							<PostCard key={p.id} post={p} locale={me.locale} />
						))}
					</section>
				)}
				<Pager page={page} pages={pages} build={(p) => `/posts?page=${p}`} />
			</div>
		</SiteLayout>
	);
}
