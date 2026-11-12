/** @type {import('next').NextConfig} */

// Header keamanan buat semua halaman.
// - nosniff: browser nggak nebak-nebak jenis file
// - frame-ancestors / X-Frame-Options: situs ini nggak bisa dipasang di dalam iframe situs lain (cegah clickjacking)
// - Referrer-Policy: alamat lengkap halaman nggak ikut kebocor ke situs lain
// - Permissions-Policy: lokasi & layar tetap nyala cuma boleh dipakai situs ini sendiri, kamera/mikrofon/pembayaran dimatikan
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), screen-wake-lock=(self), camera=(), microphone=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    // file verifikasi aplikasi Android (Play Store)
    return [{ source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" }];
  },
};
