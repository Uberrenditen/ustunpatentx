import type { NextConfig } from "next";

const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isPages ? "export" : undefined,
  basePath: isPages ? "/ustunpatentx" : "",
  trailingSlash: isPages,
  images: { unoptimized: true },
  serverExternalPackages: ["twitter-api-v2"],
};

export default nextConfig;
