import { createFileRoute } from "@tanstack/react-router";
import { PostCard, Pager, SITE, SiteLayout, pageHead } from "#/components/ui";
import { listFn } from "#/lib/server";

export const Route = createFileRoute("/")({
	loader: () => listFn({ data: { type: "post", page: 1 } }),
	head: () => pageHead({ title: SITE }),
	component: Home,
});

function Home() {
	const { me } = Route.useRouteContext();
	const { posts, page, pages } = Route.useLoaderData();
	return (
		<SiteLayout me={me}>
			<div className="container">
				<header className="intro">
					<h1>{me.identity.title}</h1>
					<p>{me.identity.tagline}</p>
				</header>
				{posts.length === 0 ? (
					<p className="muted">No posts published yet.</p>
				) : (
					<section>
						{posts.map((p) => (
							<PostCard key={p.id} post={p} />
						))}
					</section>
				)}
				<Pager page={page} pages={pages} build={(p) => `/posts?page=${p}`} />
			</div>
		</SiteLayout>
	);
}
