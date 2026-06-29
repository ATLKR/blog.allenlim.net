import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Comments } from "#/components/Comments";
import { AuthorBox, Reactions, ShareButtons, useScrollSpy } from "#/components/reading";
import { PostCard, SITE, SITE_ORIGIN, fmtDate, pageHead, useCodeCopy, useHighlight, useView } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { getEntryFn, listCommentsFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/posts/$slug")({
	loader: async ({ params }) => {
		const res = await getEntryFn({ data: { urlSlug: params.slug, locale: params.lang as Locale } });
		if ("notFound" in res || res.post.type !== "post") throw notFound();
		const comments = await listCommentsFn({ data: { postId: res.post.id } });
		return { ...res, comments };
	},
	head: ({ loaderData }) =>
		loaderData && "post" in loaderData
			? pageHead({
					title: `${loaderData.post.title} — ${SITE}`,
					description: loaderData.seo.description,
					image: loaderData.seo.ogImage ?? `/og/posts/${loaderData.post.url_slug}.svg?l=${loaderData.post.locale}`,
					type: "article",
					robots: loaderData.post.visibility === "public" ? null : "noindex, nofollow",
					path: `/${loaderData.post.locale}/posts/${loaderData.post.url_slug}`,
					alternates: [
						{ hreflang: loaderData.post.locale, path: `/${loaderData.post.locale}/posts/${loaderData.post.url_slug}` },
						...loaderData.otherLocales.map((l) => ({ hreflang: l, path: `/${l}/posts/${loaderData.post.url_slug}` })),
					],
					jsonLd: {
						"@context": "https://schema.org",
						"@type": "BlogPosting",
						headline: loaderData.post.title,
						datePublished: loaderData.post.published_at ?? loaderData.post.created_at,
						dateModified: loaderData.post.updated_at,
						inLanguage: loaderData.post.locale,
						author: { "@type": "Person", name: loaderData.seo.author, url: SITE_ORIGIN, ...(loaderData.seo.sameAs.length ? { sameAs: loaderData.seo.sameAs } : {}) },
						publisher: { "@type": "Organization", name: SITE },
						mainEntityOfPage: `${SITE_ORIGIN}/${loaderData.post.locale}/posts/${loaderData.post.url_slug}`,
						...(loaderData.seo.description ? { description: loaderData.seo.description } : {}),
						...(loaderData.post.cover_url ? { image: SITE_ORIGIN + loaderData.post.cover_url } : {}),
					},
				})
			: {},
	component: PostView,
});

function PostView() {
	const { locale } = Route.useRouteContext();
	const { post, html, toc, prev, next, related, comments, otherLocales, author } = Route.useLoaderData();
	const tr = t(locale);
	useHighlight(post.id);
	useCodeCopy(post.id);
	useView(post.id);
	const activeId = useScrollSpy(toc.map((h) => h.id));
	const date = fmtDate(post.published_at ?? post.created_at, locale);
	const updated =
		post.updated_at && post.published_at && new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 86_400_000
			? fmtDate(post.updated_at, locale)
			: null;
	const path = `/${locale}/posts/${post.url_slug}`;
	return (
		<div className="post-wrap">
			<article className="article">
				{post.visibility !== "public" && <div className="banner">{tr.scheduledNote(post.visibility)}</div>}
				{otherLocales.length > 0 && (
					<div className="post-lang">
						{otherLocales.map((l) => (
							<a key={l} href={`/${l}/posts/${post.url_slug}`}>{l === "ko" ? "한국어로 보기" : "Read in English"}</a>
						))}
					</div>
				)}
				{post.cover_url && <img className="cover" src={post.cover_url} alt="" />}
				<header>
					<div className="card-meta">
						{date && <time>{date}</time>}
						<span className="dot" />
						<span>{tr.minRead(post.reading_time)}</span>
						{updated && <><span className="dot" /><span>{locale === "ko" ? "수정" : "Updated"} {updated}</span></>}
					</div>
					<h1 className="article-title">{post.title}</h1>
					{post.categories.length > 0 && (
						<div className="tags" style={{ marginTop: "1rem" }}>
							{post.categories.map((c) => (
								<Link key={c.slug} to="/$lang/category/$slug" params={{ lang: locale, slug: c.slug }} search={{}} className="tag">{c.label}</Link>
							))}
						</div>
					)}
				</header>

				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored content */}
				<div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

				{post.tags.length > 0 && (
					<footer className="post-foot-tags">
						{post.tags.map((tag) => (
							<Link key={tag.slug} to="/$lang/tag/$slug" params={{ lang: locale, slug: tag.slug }} search={{}} className="tag">#{tag.label}</Link>
						))}
					</footer>
				)}

				<div className="post-actions">
					<Reactions postId={post.id} initial={post.reactions} />
					<ShareButtons path={path} title={post.title} />
				</div>

				<AuthorBox author={author} />

				{(prev || next) && (
					<nav className="prevnext">
						{prev ? <Link to="/$lang/posts/$slug" params={{ lang: locale, slug: prev.url_slug }}>← {prev.title}</Link> : <span />}
						{next ? <Link to="/$lang/posts/$slug" params={{ lang: locale, slug: next.url_slug }}>{next.title} →</Link> : <span />}
					</nav>
				)}

				{related.length > 0 && (
					<section className="related">
						<h2>{tr.related}</h2>
						{related.map((p) => <PostCard key={p.id} post={p} locale={locale} />)}
					</section>
				)}

				<Comments postId={post.id} initial={comments.comments} siteKey={comments.siteKey} member={comments.member} enabled={comments.enabled} locale={locale} />
			</article>

			{toc.length > 2 && (
				<nav className="toc-rail" aria-label="Table of contents">
					<div className="toc-title">{tr.contents}</div>
					<ul>
						{toc.map((h) => (
							<li key={h.id} className={`lvl-${h.level}${activeId === h.id ? " active" : ""}`}>
								<a href={`#${h.id}`}>{h.text}</a>
							</li>
						))}
					</ul>
				</nav>
			)}
		</div>
	);
}
