import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV === "development";
const outputFileTracingRoot = fileURLToPath(new URL("../", import.meta.url));

// In development Next.js dev server uses eval() inside webpack bundles for
// source-map support. Without 'unsafe-eval' the browser blocks the chunks,
// React never hydrates, and no interactive elements respond to clicks.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

// Dev HMR uses a WebSocket connection back to localhost. API calls go to
// http://localhost:8000 (FastAPI) which is also a different port from 'self'.
const connectSrc = isDev
  ? "connect-src 'self' https: ws://localhost:* http://localhost:*"
  : "connect-src 'self' https:";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000"],
  outputFileTracingRoot,
  reactStrictMode: true,
  typedRoutes: false,
  async rewrites() {
    const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.trim() || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; ${connectSrc}; frame-ancestors 'none'; base-uri 'self'`
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" }
        ]
      }
    ];
  }
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
