/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
