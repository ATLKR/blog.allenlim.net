import { createFileRoute, redirect } from "@tanstack/react-router";

// `/` is redirected by the worker entry (language-detected). This is the
// client-side/SSR fallback to the default locale.
export const Route = createFileRoute("/")({
	beforeLoad: () => {
		throw redirect({ to: "/$lang", params: { lang: "en" } });
	},
});
