/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Proxy /api/v1/* to FastAPI so the browser talks to Next (3000) only.
   * Avoids 404s when direct requests to localhost:8000 fail (Windows / IPv6 / wrong listener).
   * Override: API_PROXY_TARGET=http://127.0.0.1:8000
   */
  async rewrites() {
    const backend = (process.env.API_PROXY_TARGET || "http://127.0.0.1:8001").replace(/\/+$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backend}/api/v1/:path*`,
      },
    ];
  },

  /**
   * Webpack’s persistent pack cache on Windows (especially paths with spaces) can leave
   * `.next/server` pointing at missing chunks (`./19.js`, `./vendor-chunks/@tanstack.js`, etc.).
   * Memory-only / disabled cache in dev avoids MODULE_NOT_FOUND after HMR or interrupted builds.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
