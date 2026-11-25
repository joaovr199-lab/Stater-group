import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Painéis e APIs nunca devem ser cacheados por intermediários.
      { source: "/(stater|imobiliaria|corretor|api)/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
