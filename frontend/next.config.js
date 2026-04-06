const path = require("node:path");

const createNextIntlPlugin = require("next-intl/plugin");

const isDev = process.env.NODE_ENV === "development";
const isStaticExport = process.env.PLATFORM_TARGET === "static";
const outputFileTracingRoot = path.join(__dirname, "..");

// Static export targets cannot rely on Next.js runtime rewrites or response
// headers, so those features stay enabled only for the server-rendered web path.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const connectSrc = isDev
  ? "connect-src 'self' https: ws://localhost:* http://localhost:*"
  : "connect-src 'self' https:";

const nextConfig = {
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000"],
  outputFileTracingRoot,
  reactStrictMode: true,
  skipTrailingSlashRedirect: isStaticExport,
  trailingSlash: isStaticExport,
  typedRoutes: false,
  output: isStaticExport ? "export" : undefined,
  images: isStaticExport
    ? {
        unoptimized: true
      }
    : undefined
};

if (!isStaticExport) {
  nextConfig.rewrites = async () => {
    const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.trim() || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`
      }
    ];
  };

  nextConfig.headers = async () => [
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

const withNextIntl = createNextIntlPlugin();

module.exports = withNextIntl(nextConfig);