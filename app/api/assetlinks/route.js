// Verifikasi Android (Trusted Web Activity): bikin aplikasi Play Store bisa buka web ini tanpa bilah alamat.
// Diakses lewat /.well-known/assetlinks.json (lihat next.config.js).
// Isi di Vercel > Settings > Environment Variables:
//   ANDROID_PACKAGE = nama paket, misal com.wisatahalalindonesia.temansafar
//   ANDROID_SHA256  = sidik jari SHA-256 dari Play Console (App integrity > App signing). Boleh lebih dari satu, pisahkan koma.
export const dynamic = "force-dynamic";

export function GET() {
  const pkg = process.env.ANDROID_PACKAGE || "com.wisatahalalindonesia.temansafar";
  const prints = (process.env.ANDROID_SHA256 || "").split(",").map((s) => s.trim()).filter(Boolean);
  const body = prints.length
    ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: prints } }]
    : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
