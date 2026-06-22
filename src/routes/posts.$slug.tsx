import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Comments } from "#/components/Comments";
import { PostCard, SITE, SiteLayout, fmtDate, pageHead, useHighlight } from "#/components/ui";
import { t } from "#/lib/i18n";
import { getEntryFn, listCommentsFn } from "#/lib/server";

function LangLinks({ translations }: { translations: Array<{ slug: string; locale: string; title: string }> }) {
	if (translations.length === 0) return null;
	return (
		<div className="post-lang">
			{translations.map((tl) => (
				<a key={tl.slug} href={`/posts/${tl.slug}`}>{tl.locale === "ko" ? "한국어로 보기" : "Read in English"}</a>
			))}
		</div>
	);
}

export const Route = createFileRoute("/posts/$slug")({
	loader: async ({ params }) => {
		const res = await getEntryFn({ data: { slug: params.slug } });
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
						{ hreflang: loaderData.post.locale, path: `/posts/${loaderData.post.slug}` },
						...loaderData.translations.map((tl) => ({ hreflang: tl.locale, path: `/posts/${tl.slug}` })),
					],
				})
			: {},
	component: PostView,
});

function PostView() {
	const { me } = Route.useRouteContext();
	const { post, html, toc, prev, next, related, comments, translations } = Route.useLoaderData();
	const tr = t(me.locale);
	useHighlight(post.id);
	const date = fmtDate(post.published_at ?? post.created_at, me.locale);
	return (
		<SiteLayout me={me}>
			<article className="article">
				{post.visibility !== "public" && (
					<div className="banner">{tr.scheduledNote(post.visibility)}</div>
				)}
				<LangLinks translations={translations} />
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
								<Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} search={{}} className="tag">{c.label}</Link>
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
							<Link key={tag.slug} to="/tag/$slug" params={{ slug: tag.slug }} search={{}} className="tag">#{tag.label}</Link>
						))}
					</footer>
				)}

				{(prev || next) && (
					<nav className="prevnext">
						{prev ? <Link to="/posts/$slug" params={{ slug: prev.slug }}>← {prev.title}</Link> : <span />}
						{next ? <Link to="/posts/$slug" params={{ slug: next.slug }}>{next.title} →</Link> : <span />}
					</nav>
				)}

				{related.length > 0 && (
					<section className="related">
						<h2>{tr.related}</h2>
						{related.map((p) => (
							<PostCard key={p.id} post={p} locale={me.locale} />
						))}
					</section>
				)}

				<Comments
					postId={post.id}
					initial={comments.comments}
					siteKey={comments.siteKey}
					member={comments.member}
					locale={me.locale}
				/>
			</article>
		</SiteLayout>
	);
}
