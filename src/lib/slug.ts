/** URL-safe slug. Keeps unicode letters (so Korean titles still slug nicely). */
export function slugify(input: string): string {
	return (
		input
			.trim()
			.toLowerCase()
			.replace(/['"]/g, "")
			.replace(/[^\p{L}\p{N}]+/gu, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "untitled"
	);
}

/** Short, sortable, URL-safe id (timestamp + random). Not a real ULID, but close enough. */
export function newId(): string {
	const t = Date.now().toString(36);
	const r = Array.from(crypto.getRandomValues(new Uint8Array(8)))
		.map((b) => (b % 36).toString(36))
		.join("");
	return `${t}${r}`;
}
