import { Link, createFileRoute } from "@tanstack/react-router";
import { t } from "#/lib/i18n";
import { termsFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/tags")({
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
	const { locale } = Route.useRouteContext();
	const { tags, categories } = Route.useLoaderData();
	const tr = t(locale);
	return (
		<div className="container">
			<header className="intro"><h1>{tr.topics}</h1></header>
			<h2 style={{ fontSize: "var(--fs-lg)" }}>{tr.categories}</h2>
			<div className="cloud">
				{categories.filter((t2) => t2.count > 0).map((t2) => (
					<Link key={t2.slug} to="/$lang/category/$slug" params={{ lang: locale, slug: t2.slug }} search={{}}>
						{t2.label}<span className="n">{t2.count}</span>
					</Link>
				))}
			</div>
			<h2 style={{ fontSize: "var(--fs-lg)", marginTop: "var(--sp-12)" }}>{tr.tagsHeading}</h2>
			<div className="cloud">
				{tags.filter((t2) => t2.count > 0).map((t2) => (
					<Link key={t2.slug} to="/$lang/tag/$slug" params={{ lang: locale, slug: t2.slug }} search={{}}>
						#{t2.label}<span className="n">{t2.count}</span>
					</Link>
				))}
			</div>
		</div>
	);
}
