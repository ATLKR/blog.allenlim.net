import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "#/components/ui";
import { mediaListFn } from "#/lib/server";

export const Route = createFileRoute("/admin/media")({
	beforeLoad: ({ context }) => {
		if (!context.me.user) throw redirect({ to: "/admin/login" });
	},
	loader: () => mediaListFn(),
	component: MediaLibrary,
});

function MediaLibrary() {
	const { me } = Route.useRouteContext();
	const { media } = Route.useLoaderData();
	const copy = (id: string, filename: string) =>
		navigator.clipboard.writeText(`/media/${id}/${filename}`);
	return (
		<AdminShell email={me.user?.email}>
			<h1 style={{ fontSize: "1.6rem", marginBottom: "1.5rem" }}>Media</h1>
			{media.length === 0 ? (
				<p className="muted">No uploads yet. Images you add in the editor appear here.</p>
			) : (
				<div className="media-grid">
					{media.map((m) => {
						const url = `/media/${m.id}/${m.filename}`;
						return (
							<div key={m.id} className="media-item">
								{m.mime.startsWith("image/") ? <img src={url} alt={m.filename} loading="lazy" /> : <div className="muted">{m.mime}</div>}
								<span className="fn" title={m.filename}>{m.filename}</span>
								<button type="button" className="btn-ghost" onClick={() => copy(m.id, m.filename)}>Copy URL</button>
							</div>
						);
					})}
				</div>
			)}
		</AdminShell>
	);
}
