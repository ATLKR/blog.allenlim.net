import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "#/components/ui";
import type { Locale } from "#/lib/i18n";
import { navFn } from "#/lib/server";

export const Route = createFileRoute("/$lang")({
	beforeLoad: ({ params }) => {
		if (params.lang !== "en" && params.lang !== "ko") throw notFound();
		return { locale: params.lang as Locale };
	},
	loader: ({ params }) => navFn({ data: { locale: params.lang as Locale } }),
	component: LangLayout,
});

function LangLayout() {
	const { me, locale } = Route.useRouteContext();
	const { navPages } = Route.useLoaderData();
	return (
		<SiteLayout me={{ ...me, locale, navPages }}>
			<Outlet />
		</SiteLayout>
	);
}
