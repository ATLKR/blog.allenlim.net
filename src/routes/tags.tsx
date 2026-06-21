import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "#/components/ui";
import { termsFn } from "#/lib/server";

export const Route = createFileRoute("/tags")({
	loader: async () => {
		const [tags, categories] = await Promise.all([
			termsFn({ data: { kind: "tags" } }),
			termsFn({ data: { kind: "categories" } }),
		]);
		return { tags: tags.terms, categories: categories.terms };
	},
	component: TagsIndex,
});

function TagsIndex() {
	const { me } = Route.useRouteContext();
	const { tags, categories } = Route.useLoaderData();
	return (
		<SiteLayout me={me}>
			<div className="container">
				<header className="intro">
					<h1>Topics</h1>
					<p className="muted">Browse by category and tag.</p>
				</header>
				<h2 style={{ fontSize: "var(--fs-lg)" }}>Categories</h2>
				<div className="cloud">
					{categories.filter((t) => t.count > 0).map((t) => (
						<Link key={t.slug} to="/category/$slug" params={{ slug: t.slug }} search={{}}>
							{t.label}<span className="n">{t.count}</span>
						</Link>
					))}
				</div>
				<h2 style={{ fontSize: "var(--fs-lg)", marginTop: "var(--sp-12)" }}>Tags</h2>
				<div className="cloud">
					{tags.filter((t) => t.count > 0).map((t) => (
						<Link key={t.slug} to="/tag/$slug" params={{ slug: t.slug }} search={{}}>
							#{t.label}<span className="n">{t.count}</span>
						</Link>
					))}
				</div>
			</div>
		</SiteLayout>
	);
}
