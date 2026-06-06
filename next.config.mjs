/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // node:sqlite is a built-in; keep it external to the server bundle.
  serverExternalPackages: ["node:sqlite"],
};

export default nextConfig;
