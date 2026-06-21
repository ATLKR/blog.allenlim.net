import type { APIRoute } from "astro";
import { createPost, deletePost, updatePost } from "../../lib/content";
import { VISIBILITIES, type Visibility } from "../../lib/db";
import { redirect, sameOrigin } from "../../lib/http";

const splitList = (v: string) =>
	v.split(",").map((s) => s.trim()).filter(Boolean);

export const POST: APIRoute = async (ctx) => {
	const env = ctx.locals.env;
	if (!env) return new Response("No env", { status: 500 });
	if (!ctx.locals.user) return new Response("Unauthorized", { status: 401 });
	if (!sameOrigin(ctx)) return new Response("Forbidden", { status: 403 });

	const form = await ctx.request.formData();
	const id = String(form.get("id") ?? "").trim();
	const action = String(form.get("_action") ?? "save");

	if (action === "delete") {
		if (id) await deletePost(env, id);
		return redirect("/admin");
	}

	const title = String(form.get("title") ?? "").trim();
	if (!title) return redirect(id ? `/admin/posts/${id}?error=title` : "/admin/posts/new?error=title");

	const visRaw = String(form.get("visibility") ?? "draft");
	const visibility: Visibility = VISIBILITIES.includes(visRaw as Visibility)
		? (visRaw as Visibility)
		: "draft";

	const input = {
		title,
		slug: String(form.get("slug") ?? "").trim() || undefined,
		excerpt: (String(form.get("excerpt") ?? "").trim() || null) as string | null,
		visibility,
		body: String(form.get("body") ?? ""),
		tags: splitList(String(form.get("tags") ?? "")),
		categories: splitList(String(form.get("categories") ?? "")),
		authorId: ctx.locals.user.id,
	};

	if (id) {
		await updatePost(env, id, input);
		return redirect(`/admin/posts/${id}?saved=1`);
	}
	const newPostId = await createPost(env, input);
	return redirect(`/admin/posts/${newPostId}?saved=1`);
};
