import type { Env } from "../env";

/** R2 key for a post's markdown body. Bodies never touch D1 or git. */
export const bodyKey = (postId: string) => `posts/${postId}.md`;

/** R2 key for an uploaded media file. */
export const mediaKey = (id: string, filename: string) => `media/${id}/${filename}`;

export async function putBody(env: Env, postId: string, markdown: string): Promise<string> {
	const key = bodyKey(postId);
	await env.MEDIA.put(key, markdown, {
		httpMetadata: { contentType: "text/markdown; charset=utf-8" },
	});
	return key;
}

export async function getBody(env: Env, key: string | null | undefined): Promise<string> {
	if (!key) return "";
	const obj = await env.MEDIA.get(key);
	return obj ? await obj.text() : "";
}

export async function deleteObject(env: Env, key: string | null | undefined): Promise<void> {
	if (key) await env.MEDIA.delete(key);
}

export async function putMedia(
	env: Env,
	key: string,
	data: ArrayBuffer | ReadableStream,
	contentType: string,
): Promise<void> {
	await env.MEDIA.put(key, data, { httpMetadata: { contentType } });
}
