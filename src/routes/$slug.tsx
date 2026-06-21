import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE, SiteLayout, pageHead, useHighlight } from "#/components/ui";
import { getEntryFn } from "#/lib/server";

// Top-level pages (e.g. /resume, /about). Posts live under /posts/$slug.
export const Route = createFileRoute("/$slug")({
	loader: async ({ params }) => {
		const res = await getEntryFn({ data: { slug: params.slug } });
		if ("notFound" in res || res.post.type !== "page") throw notFound();
		return res;
	},
	head: ({ loaderData }) =>
		loaderData && "post" in loaderData
			? pageHead({
					title: `${loaderData.post.title} — ${SITE}`,
					description: loaderData.post.excerpt,
					robots: loaderData.post.visibility === "public" ? null : "noindex, nofollow",
				})
			: {},
	component: PageView,
});

function PageView() {
	const { me } = Route.useRouteContext();
	const { post, html, toc } = Route.useLoaderData();
	useHighlight(post.id);
	return (
		<SiteLayout me={me}>
			<article className="article">
				{post.visibility !== "public" && (
					<div className="banner">This page is <strong>{post.visibility}</strong>.</div>
				)}
				<header>
					<h1 className="article-title">{post.title}</h1>
				</header>
				{toc.length > 2 && (
					<nav className="toc">
						<div className="toc-title">Contents</div>
						<ul>
							{toc.map((t) => (
								<li key={t.id} className={`lvl-${t.level}`}><a href={`#${t.id}`}>{t.text}</a></li>
							))}
						</ul>
					</nav>
				)}
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored content */}
				<div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
			</article>
		</SiteLayout>
	);
}
