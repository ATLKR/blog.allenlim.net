import { Link, createFileRoute } from "@tanstack/react-router";
import { Pager, SITE, fmtDate, pageHead, useCodeCopy, useHighlight } from "#/components/ui";
import { type Locale, t } from "#/lib/i18n";
import { notesFn } from "#/lib/server";

export const Route = createFileRoute("/$lang/notes/")({
	validateSearch: (s: Record<string, unknown>): { page?: number } => ({ page: s.page ? Number(s.page) || 1 : undefined }),
	loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
	loader: ({ params, deps }) => notesFn({ data: { locale: params.lang as Locale, page: deps.page } }),
	head: ({ params }) => {
		const tr = t(params.lang as Locale);
		return pageHead({ title: `${tr.notes} — ${SITE}`, description: tr.notesTagline, path: `/${params.lang}/notes` });
	},
	component: Notes,
});

function Notes() {
	const { locale } = Route.useRouteContext();
	const { notes, page, pages, total } = Route.useLoaderData();
	const tr = t(locale);
	useHighlight(`notes-${page}`);
	useCodeCopy(`notes-${page}`);
	return (
		<div className="container notes-feed">
			<header className="intro">
				<h1>{tr.notes}</h1>
				<p className="muted">{tr.notesTagline} · {tr.notesCount(total)}</p>
			</header>
			{notes.length === 0 && <p className="muted">{tr.noNotes}</p>}
			{notes.map(({ post, html }) => (
				<article key={post.id} className="note-item">
					{/* biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored content */}
					<div className="note-body prose" dangerouslySetInnerHTML={{ __html: html }} />
					<div className="note-meta">
						<Link to="/$lang/notes/$slug" params={{ lang: locale, slug: post.url_slug }}>
							<time>{fmtDate(post.published_at ?? post.created_at, locale)}</time>
						</Link>
						{post.reactions > 0 && <span className="note-react">♥ {post.reactions}</span>}
					</div>
				</article>
			))}
			<Pager page={page} pages={pages} build={(p) => `/${locale}/notes?page=${p}`} />
		</div>
	);
}
