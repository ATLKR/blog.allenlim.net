import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { AdminShell } from "#/components/ui";
import { PostEditor } from "#/components/PostEditor";
import { getEditFn } from "#/lib/server";

export const Route = createFileRoute("/admin/posts/$id")({
	beforeLoad: ({ context }) => {
		if (!context.me.user) throw redirect({ to: "/admin/login" });
	},
	loader: async ({ params }) => {
		const res = await getEditFn({ data: { id: params.id } });
		if ("notFound" in res) throw notFound();
		return res;
	},
	component: EditPost,
});

function EditPost() {
	const { me } = Route.useRouteContext();
	const { post, body } = Route.useLoaderData();
	return (
		<AdminShell email={me.user?.email}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.5rem" }}>
				<h1 style={{ fontSize: "1.5rem" }}>Edit entry</h1>
				<a href={post.type === "page" ? `/${post.slug}` : `/posts/${post.slug}`} target="_blank" rel="noreferrer" style={{ fontSize: ".85rem" }}>View ↗</a>
			</div>
			<PostEditor existing={post} body={body} />
		</AdminShell>
	);
}
