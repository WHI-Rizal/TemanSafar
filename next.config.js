/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    // file verifikasi aplikasi Android (Play Store)
    return [{ source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" }];
  },
};
