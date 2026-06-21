import type { Env } from "../env";
import { newId } from "./slug";

export interface SessionUser {
	id: string;
	email: string;
	name: string | null;
	role: string;
}

const PBKDF2_ITERATIONS = 150_000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const SESSION_COOKIE = "sid";

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(password) as BufferSource,
		"PBKDF2",
		false,
		["deriveBits"],
	);
	return crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
		key,
		256,
	);
}

/** Returns `pbkdf2$<iters>$<saltB64>$<hashB64>`. */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
	return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt.buffer)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [scheme, itersStr, saltB64, hashB64] = stored.split("$");
	if (scheme !== "pbkdf2") return false;
	const computed = await pbkdf2(password, fromB64(saltB64), Number(itersStr));
	const a = new Uint8Array(computed);
	const b = fromB64(hashB64);
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

// --- sessions (KV-backed) ---

export async function createSession(env: Env, user: SessionUser): Promise<string> {
	const id = `${newId()}${newId()}`;
	await env.SESSION.put(`sess:${id}`, JSON.stringify(user), {
		expirationTtl: SESSION_TTL_SECONDS,
	});
	return id;
}

export async function readSession(env: Env, id: string | undefined): Promise<SessionUser | null> {
	if (!id) return null;
	const raw = await env.SESSION.get(`sess:${id}`);
	return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export async function destroySession(env: Env, id: string | undefined): Promise<void> {
	if (id) await env.SESSION.delete(`sess:${id}`);
}

export function parseCookie(header: string | null, name: string): string | undefined {
	if (!header) return undefined;
	for (const part of header.split(/;\s*/)) {
		const eq = part.indexOf("=");
		if (eq > -1 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
	}
	return undefined;
}

export function sessionCookie(id: string): string {
	return `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearCookie(): string {
	return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
