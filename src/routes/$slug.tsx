import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE, SiteLayout, pageHead, useHighlight } from "#/components/ui";
import { t } from "#/lib/i18n";
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
					alternates: [
						{ hreflang: loaderData.post.locale, path: `/${loaderData.post.slug}` },
						...loaderData.translations.map((tl) => ({ hreflang: tl.locale, path: `/${tl.slug}` })),
					],
				})
			: {},
	component: PageView,
});

function PageView() {
	const { me } = Route.useRouteContext();
	const { post, html, toc, translations } = Route.useLoaderData();
	const tr = t(me.locale);
	useHighlight(post.id);
	return (
		<SiteLayout me={me}>
			<article className="article">
				{post.visibility !== "public" && (
					<div className="banner">{tr.scheduledNote(post.visibility)}</div>
				)}
				{translations.length > 0 && (
					<div className="post-lang">
						{translations.map((tl) => (
							<a key={tl.slug} href={`/${tl.slug}`}>{tl.locale === "ko" ? "한국어로 보기" : "Read in English"}</a>
						))}
					</div>
				)}
				<header>
					<h1 className="article-title">{post.title}</h1>
				</header>
				{toc.length > 2 && (
					<nav className="toc">
						<div className="toc-title">{tr.contents}</div>
						<ul>
							{toc.map((h) => (
								<li key={h.id} className={`lvl-${h.level}`}><a href={`#${h.id}`}>{h.text}</a></li>
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
