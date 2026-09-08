import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import daybreakLogo from "@/assets/daybreak-logo.png.asset.json";

const DESCRIPTION =
  "A script reads the feeds every morning, asks Claude what matters to a product manager today, and posts the ten stories worth reading by 10 AM ET.";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md">
        <p className="data">404</p>
        <h1 className="mt-3 text-head-lg font-semibold">
          There is nothing at this address.
        </h1>
        <p className="mt-3 text-ink-2">
          The page may have moved, or the link may be wrong.
        </p>
        <Link
          to="/"
          className="ctl mt-6 inline-block no-underline"
          data-active="true"
        >
          Back to today&rsquo;s brief
        </Link>
      </div>
    </div>
  );
}

// `error` is typed as unknown in current router versions and as Error in
// older ones. Accepting unknown and narrowing works against both.
function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error instanceof Error ? error : new Error(String(error)));
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md">
        <p className="data">Error</p>
        <h1 className="mt-3 text-head-lg font-semibold">
          This page didn&rsquo;t load.
        </h1>
        <p className="mt-3 text-ink-2">
          Something broke while rendering. Reloading usually clears it.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="ctl"
            data-active="true"
          >
            Try again
          </button>
          <a href="/" className="ctl no-underline">
            Back to today&rsquo;s brief
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Daybreak" },
      { name: "description", content: DESCRIPTION },
      { name: "author", content: "Shailvi Kumar" },
      { name: "theme-color", content: "#ffffff" },
      { property: "og:site_name", content: "Daybreak" },
      { property: "og:title", content: "Daybreak" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: daybreakLogo.url },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Daybreak" },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: daybreakLogo.url },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: daybreakLogo.url },
      // Fonts belong here, not on one route. Previously only the home route
      // declared them, so opening /archive or /how-it-works directly rendered
      // the whole site in Georgia and the system sans.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
