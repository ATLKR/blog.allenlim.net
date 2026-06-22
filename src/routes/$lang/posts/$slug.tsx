import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Comments } from "#/components/Comments";
import { PostCard, SITE, fmtDate, pageHead, useHighlight } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { getEntryFn, listCommentsFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/posts/$slug")({
	loader: async ({ params }) => {
		const res = await getEntryFn({ data: { urlSlug: params.slug, locale: params.lang as Locale } });
		if ("notFound" in res) throw notFound();
		const comments = await listCommentsFn({ data: { postId: res.post.id } });
		return { ...res, comments };
	},
	head: ({ loaderData }) =>
		loaderData && "post" in loaderData
			? pageHead({
					title: `${loaderData.post.title} — ${SITE}`,
					description: loaderData.post.excerpt,
					image: loaderData.post.cover_url,
					type: "article",
					robots: loaderData.post.visibility === "public" ? null : "noindex, nofollow",
					alternates: [
						{ hreflang: loaderData.post.locale, path: `/${loaderData.post.locale}/posts/${loaderData.post.url_slug}` },
						...loaderData.otherLocales.map((l) => ({ hreflang: l, path: `/${l}/posts/${loaderData.post.url_slug}` })),
					],
				})
			: {},
	component: PostView,
});

function PostView() {
	const { locale } = Route.useRouteContext();
	const { post, html, toc, prev, next, related, comments, otherLocales } = Route.useLoaderData();
	const tr = t(locale);
	useHighlight(post.id);
	const date = fmtDate(post.published_at ?? post.created_at, locale);
	return (
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

			{post.tags.length > 0 && (
				<footer className="post-foot-tags">
					{post.tags.map((tag) => (
						<Link key={tag.slug} to="/$lang/tag/$slug" params={{ lang: locale, slug: tag.slug }} search={{}} className="tag">#{tag.label}</Link>
					))}
				</footer>
			)}

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

			<Comments postId={post.id} initial={comments.comments} siteKey={comments.siteKey} member={comments.member} locale={locale} />
		</article>
	);
}
