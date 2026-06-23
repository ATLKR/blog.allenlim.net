import { createFileRoute, redirect } from "@tanstack/react-router";
import { PostEditor } from "#/components/PostEditor";
import { AdminShell } from "#/components/ui";
import { prefillFn } from "#/lib/server";

export const Route = createFileRoute("/admin/posts/new")({
	beforeLoad: ({ context }) => {
		if (!context.me.user) throw redirect({ to: "/admin/login" });
	},
	validateSearch: (s: Record<string, unknown>): { translationOf?: string; lang?: "en" | "ko" } => ({
		translationOf: typeof s.translationOf === "string" ? s.translationOf : undefined,
		lang: s.lang === "ko" ? "ko" : s.lang === "en" ? "en" : undefined,
	}),
	loaderDeps: ({ search }) => ({ translationOf: search.translationOf }),
	loader: ({ deps }) => (deps.translationOf ? prefillFn({ data: { slug: deps.translationOf } }) : { source: null }),
	component: NewPost,
});

function NewPost() {
	const { me } = Route.useRouteContext();
	const { translationOf, lang } = Route.useSearch();
	const { source } = Route.useLoaderData();
	const isTranslation = !!translationOf && !!source;
	return (
		<AdminShell email={me.user?.email}>
			<h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>
				{isTranslation ? `New translation (${(lang ?? "").toUpperCase()})` : "New entry"}
			</h1>
			{isTranslation && (
				<div className="notice" style={{ marginBottom: "1.25rem" }}>
					Translating <strong>{source.title}</strong>. The original text is prefilled — translate it,
					set the language, and save. It will share the URL slug.
				</div>
			)}
			<PostEditor
				defaults={
					isTranslation
						? {
								title: source.title,
								slug: source.slug,
								body: source.body,
								tags: source.tags,
								categories: source.categories,
								cover_url: source.cover_url,
								locale: lang ?? "ko",
								translationOf,
							}
						: undefined
				}
			/>
		</AdminShell>
	);
}
