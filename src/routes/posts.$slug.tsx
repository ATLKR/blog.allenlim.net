import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { PostCard, SITE, SiteLayout, fmtDate, pageHead, useHighlight } from "#/components/ui";
import { getEntryFn } from "#/lib/server";

export const Route = createFileRoute("/posts/$slug")({
	loader: async ({ params }) => {
		const res = await getEntryFn({ data: { slug: params.slug } });
		if ("notFound" in res) throw notFound();
		return res;
	},
	head: ({ loaderData }) =>
		loaderData && "post" in loaderData
			? pageHead({
					title: `${loaderData.post.title} — ${SITE}`,
					description: loaderData.post.excerpt,
					image: loaderData.post.cover_url,
					type: "article",
					robots: loaderData.post.visibility === "public" ? null : "noindex, nofollow",
				})
			: {},
	component: PostView,
});

function PostView() {
	const { me } = Route.useRouteContext();
	const { post, html, toc, prev, next, related } = Route.useLoaderData();
	useHighlight(post.id);
	const date = fmtDate(post.published_at ?? post.created_at);
	return (
		<SiteLayout me={me}>
			<article className="article">
				{post.visibility !== "public" && (
					<div className="banner">
						This post is <strong>{post.visibility}</strong> — visible to you because you're logged in.
					</div>
				)}
				{post.cover_url && <img className="cover" src={post.cover_url} alt="" />}
				<header>
					<div className="card-meta">
						{date && <time>{date}</time>}
						<span className="dot" />
						<span>{post.reading_time} min read</span>
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

				{post.tags.length > 0 && (
					<footer className="post-foot-tags">
						{post.tags.map((t) => (
							<Link key={t.slug} to="/tag/$slug" params={{ slug: t.slug }} search={{}} className="tag">#{t.label}</Link>
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
						<h2>Related</h2>
						{related.map((p) => (
							<PostCard key={p.id} post={p} />
						))}
					</section>
				)}
			</article>
		</SiteLayout>
	);
}
