// Link ke Wisata Halal Indonesia. Semua pakai UTM biar kelihatan di analytics berapa lead yang datang dari Teman Safar.
// Ganti dua alamat ini kalau link CS atau halaman paketnya pindah.
const WA_BASE = "https://teswhi.netlify.app/";
const PAKET_BASE = "https://sys.wisatahalalindonesia.com/katalog";

const utm = (base, place) => {
  const u = new URL(base);
  u.searchParams.set("utm_source", "temansafar");
  u.searchParams.set("utm_medium", "app");
  u.searchParams.set("utm_campaign", place);
  return u.toString();
};
export const waLink = (place) => utm(WA_BASE, place);
export const paketLink = (place) => utm(PAKET_BASE, place);
