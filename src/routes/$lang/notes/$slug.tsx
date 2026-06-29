import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Comments } from "#/components/Comments";
import { Reactions, ShareButtons } from "#/components/reading";
import { SITE, SITE_ORIGIN, fmtDate, pageHead, useCodeCopy, useHighlight, useView } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { getEntryFn, listCommentsFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/notes/$slug")({
	loader: async ({ params }) => {
		const res = await getEntryFn({ data: { urlSlug: params.slug, locale: params.lang as Locale } });
		if ("notFound" in res || res.post.type !== "note") throw notFound();
		const comments = await listCommentsFn({ data: { postId: res.post.id } });
		return { ...res, comments };
	},
	head: ({ loaderData }) =>
		loaderData && "post" in loaderData
			? pageHead({
					title: `${loaderData.post.title} — ${SITE}`,
					description: loaderData.seo.description,
					image: loaderData.seo.ogImage ?? `/og/notes/${loaderData.post.url_slug}.svg?l=${loaderData.post.locale}`,
					type: "article",
					robots: loaderData.post.visibility === "public" ? null : "noindex, nofollow",
					path: `/${loaderData.post.locale}/notes/${loaderData.post.url_slug}`,
					alternates: [
						{ hreflang: loaderData.post.locale, path: `/${loaderData.post.locale}/notes/${loaderData.post.url_slug}` },
						...loaderData.otherLocales.map((l) => ({ hreflang: l, path: `/${l}/notes/${loaderData.post.url_slug}` })),
					],
					jsonLd: {
						"@context": "https://schema.org",
						"@type": "SocialMediaPosting",
						datePublished: loaderData.post.published_at ?? loaderData.post.created_at,
						dateModified: loaderData.post.updated_at,
						inLanguage: loaderData.post.locale,
						author: { "@type": "Person", name: loaderData.seo.author, url: SITE_ORIGIN, ...(loaderData.seo.sameAs.length ? { sameAs: loaderData.seo.sameAs } : {}) },
						mainEntityOfPage: `${SITE_ORIGIN}/${loaderData.post.locale}/notes/${loaderData.post.url_slug}`,
					},
				})
			: {},
	component: NoteView,
});

function NoteView() {
	const { locale } = Route.useRouteContext();
	const { post, html, comments, otherLocales } = Route.useLoaderData();
	const tr = t(locale);
	useHighlight(post.id);
	useCodeCopy(post.id);
	useView(post.id);
	const date = fmtDate(post.published_at ?? post.created_at, locale);
	const path = `/${locale}/notes/${post.url_slug}`;
	return (
		<div className="container note-page">
			<article className="note-item single">
				{post.visibility !== "public" && <div className="banner">{tr.scheduledNote(post.visibility)}</div>}
				{otherLocales.length > 0 && (
					<div className="post-lang">
						{otherLocales.map((l) => (
							<a key={l} href={`/${l}/notes/${post.url_slug}`}>{l === "ko" ? "한국어로 보기" : "Read in English"}</a>
						))}
					</div>
				)}
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored content */}
				<div className="note-body prose" dangerouslySetInnerHTML={{ __html: html }} />
				<div className="note-meta">
					<Link to="/$lang/notes" params={{ lang: locale }} search={{}}>{tr.notes}</Link>
					<span className="dot" />
					{date && <time>{date}</time>}
				</div>
				<div className="post-actions">
					<Reactions postId={post.id} initial={post.reactions} />
					<ShareButtons path={path} title={post.title} />
				</div>
				<Comments postId={post.id} initial={comments.comments} siteKey={comments.siteKey} member={comments.member} enabled={comments.enabled} locale={locale} />
			</article>
		</div>
	);
}
