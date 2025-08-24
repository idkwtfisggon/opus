import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider, ConvexProviderWithAuth } from "convex/react";
import type { Route } from "./+types/root";
import "./app.css";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/auth";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export async function loader(args: Route.LoaderArgs) {
  // No longer need Clerk's rootAuthLoader
  return {};
}
export const links: Route.LinksFunction = () => [
  // DNS prefetch for external services
  { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
  { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
  { rel: "dns-prefetch", href: "https://api.convex.dev" },
  { rel: "dns-prefetch", href: "https://jjdnkskwcmdndktrejws.supabase.co" },
  
  // Preconnect to font services
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  
  // Font with display=swap for performance
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  
  // Preload critical assets
  {
    rel: "preload",
    href: "/rsk.png",
    as: "image",
    type: "image/png",
  },
  {
    rel: "preload",
    href: "/favicon.png", 
    as: "image",
    type: "image/png",
  },
  
  // Icon
  {
    rel: "icon",
    type: "image/png",
    href: "/favicon.png",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* OpenCV.js for parcel dimension calculation */}
        <script 
          async 
          src="https://docs.opencv.org/4.8.0/opencv.js"
          onLoad={() => console.log('OpenCV.js loaded')}
        ></script>
      </head>
      <body>
        <Analytics />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConvexProvider client={convex}>
        <Outlet />
        <Toaster 
          position="top-right"
          richColors
          closeButton
        />
      </ConvexProvider>
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
