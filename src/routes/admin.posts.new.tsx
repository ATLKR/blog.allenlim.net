import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "#/components/ui";
import { PostEditor } from "#/components/PostEditor";

export const Route = createFileRoute("/admin/posts/new")({
	beforeLoad: ({ context }) => {
		if (!context.me.user) throw redirect({ to: "/admin/login" });
	},
	component: NewPost,
});

function NewPost() {
	const { me } = Route.useRouteContext();
	return (
		<AdminShell email={me.user?.email}>
			<h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>New entry</h1>
			<PostEditor />
		</AdminShell>
	);
}
