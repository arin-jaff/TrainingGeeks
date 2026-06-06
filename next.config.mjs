/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // node:sqlite is a built-in; keep it external to the server bundle.
  serverExternalPackages: ["node:sqlite"],
  webpack: (config) => {
    // Allow TS-style ".js" import specifiers to resolve to ".ts"/".tsx"
    // sources (matches tsconfig "bundler" resolution used elsewhere).
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
