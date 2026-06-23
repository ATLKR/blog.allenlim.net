import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE, SITE_ORIGIN, pageHead, useCodeCopy, useHighlight } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { getEntryFn } from "#/lib/server";

// Top-level pages, e.g. /en/resume, /ko/resume.
export const Route = createFileRoute("/$lang/$slug")({
	loader: async ({ params }) => {
		const res = await getEntryFn({ data: { urlSlug: params.slug, locale: params.lang as Locale } });
		if ("notFound" in res || res.post.type !== "page") throw notFound();
		return res;
	},
	head: ({ loaderData }) =>
		loaderData && "post" in loaderData
			? pageHead({
					title: `${loaderData.post.title} — ${SITE}`,
					description: loaderData.seo.description,
					image: loaderData.seo.ogImage ?? `/og/${loaderData.post.url_slug}.svg?l=${loaderData.post.locale}`,
					robots: loaderData.post.visibility === "public" ? null : "noindex, nofollow",
					path: `/${loaderData.post.locale}/${loaderData.post.url_slug}`,
					alternates: [
						{ hreflang: loaderData.post.locale, path: `/${loaderData.post.locale}/${loaderData.post.url_slug}` },
						...loaderData.otherLocales.map((l) => ({ hreflang: l, path: `/${l}/${loaderData.post.url_slug}` })),
					],
					jsonLd: {
						"@context": "https://schema.org",
						"@type": "WebPage",
						name: loaderData.post.title,
						inLanguage: loaderData.post.locale,
						url: `${SITE_ORIGIN}/${loaderData.post.locale}/${loaderData.post.url_slug}`,
						...(loaderData.post.excerpt ? { description: loaderData.post.excerpt } : {}),
					},
				})
			: {},
	component: PageView,
});

function PageView() {
	const { locale } = Route.useRouteContext();
	const { post, html, toc, otherLocales } = Route.useLoaderData();
	const tr = t(locale);
	useHighlight(post.id);
	useCodeCopy(post.id);
	return (
		<article className="article">
			{post.visibility !== "public" && <div className="banner">{tr.scheduledNote(post.visibility)}</div>}
			{otherLocales.length > 0 && (
				<div className="post-lang">
					{otherLocales.map((l) => (
						<a key={l} href={`/${l}/${post.url_slug}`}>{l === "ko" ? "한국어로 보기" : "Read in English"}</a>
					))}
				</div>
			)}
			<header><h1 className="article-title">{post.title}</h1></header>
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
	);
}
