/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["playwright", "pg"],
};

module.exports = nextConfig;
