# Jejak Musafir

Web app (PWA) buat musafir: rest area tol, waktu shalat real time dari GPS, dan laporan kondisi toilet, mukena, parkir dari sesama musafir.

Isi versi ini:

- **Navigasi** (tab utama): cari tujuan, rute jalan asli, banner belokan ("Belok kanan ke Jl. X, 200 m"), suara bahasa Indonesia, peta ikut arah hadap, hitung ulang rute kalau salah jalan. Di atas rutenya ada titik masuk waktu shalat dan masjid/musala/rest area yang keburu disinggahi. Tap **Singgah** buat nambah masjid itu ke rute.
- **Jalan tanpa tujuan** (di tab Navigasi): nggak perlu isi tujuan. Jadwal shalat dari posisi GPS, masjid & rest area asli di depan, rekomendasi singgah, notifikasi 15 menit sebelum masuk waktu, layar dijaga tetap nyala. Tap Singgah buat langsung dituntun ke masjidnya.
- **Rencana**: isi kota asal, tujuan, jam berangkat. Muncul rest area yang dilewati plus waktu shalat yang masuk di jalan.
- **Lapor kondisi**: nilai kebersihan, fasilitas, catatan, plus titik GPS kalau pelapor lagi di lokasi.
- **Offline**: halaman dan potongan peta yang pernah dibuka tetap bisa dibuka pas sinyal hilang.
- 118 rest area: Trans Jawa, Jagorawi, Cipularang–Purbaleunyi, Pandaan–Malang, Trans Sumatera.

## Coba di laptop

```bash
npm install
npm run dev
```

Buka http://localhost:3000. GPS di laptop kurang akurat, pakai tombol **Coba simulasi** buat lihat cara kerjanya.

Tanpa file `.env.local`, aplikasi tetap jalan. Cuma tombol Lapor kondisi yang mati.

## Layanan peta yang dipakai

| Fungsi | Layanan | Biaya |
|---|---|---|
| Peta | OpenFreeMap (data OpenStreetMap) | Gratis, tanpa API key |
| Cari tempat | Photon (komoot) | Gratis |
| Rute & belokan | OSRM server demo, atau Mapbox kalau diisi token | OSRM gratis tapi bukan buat trafik besar |
| Masjid, musala, rest area | Photon (data OpenStreetMap), lewat /api/pois + cache CDN | Gratis, pakai wajar |

**Sebelum dipakai banyak orang**, ganti rute ke Mapbox: daftar di mapbox.com, ambil access token, isi `NEXT_PUBLIC_MAPBOX_TOKEN` di Vercel. Free tier-nya 100 ribu permintaan rute per bulan, dan sudah pakai data macet.

Google Maps sengaja nggak dipakai buat navigasi di dalam aplikasi, karena aturan Google melarang API mereka dipakai buat bikin navigasi belokan sendiri.

## Sambungkan Firebase (biar laporan jalan)

1. Buka [Firebase Console](https://console.firebase.google.com), bikin project baru (misal `jejak-musafir`).
2. **Build > Firestore Database** > Create database > pilih lokasi `asia-southeast2 (Jakarta)` > mode production.
3. **Build > Authentication** > Get started > tab Sign-in method > aktifkan **Anonymous**.
4. **Firestore > Rules**: hapus isinya, tempel isi file `firestore.rules` di project ini, lalu Publish.
5. **Project settings > Your apps** > tambah Web app. Salin nilai config-nya.
6. Salin `.env.example` jadi `.env.local`, isi nilainya.

## Deploy ke Vercel

1. Upload folder ini ke repo GitHub baru (tanpa `node_modules`, `.next`, `out`).
2. Di [Vercel](https://vercel.com/new), import repo-nya. Framework otomatis kebaca Next.js.
3. Di **Environment Variables**, masukin 6 variabel `NEXT_PUBLIC_FIREBASE_...` yang sama kayak `.env.local`.
4. Deploy. Setelah jadi, buka **Firebase > Authentication > Settings > Authorized domains**, tambahin domain Vercel lu (misal `jejak-musafir.vercel.app`).

Vercel otomatis pakai HTTPS, jadi akses lokasi GPS langsung bisa dipakai.

## Pasang di HP

- **Android (Chrome)**: buka webnya, menu titik tiga > Add to Home screen / Install app.
- **iPhone (Safari)**: tombol Share > Add to Home Screen. Notifikasi di iPhone cuma jalan kalau udah dipasang begini.

## Hal yang perlu diketahui

- **Posisi rest area di peta masih perkiraan**, dihitung dari posisi KM di antara kota. Laporan yang bawa titik GPS bakal jadi bahan buat benerin. Kalau udah ada koordinat asli, tambahin `"lat"` dan `"lon"` di `data/restarea.json` dan posisinya langsung dipakai.
- Navigasi butuh internet buat ambil rute dan data masjid. Kalau sinyal hilang di tengah jalan, rute yang sudah diambil tetap jalan, cuma hitung ulang rute dan data masjid baru yang nunggu sinyal.
- Suara pakai suara bawaan HP. Kalau suaranya kedengeran kayak bahasa Inggris, pasang bahasa Indonesia di pengaturan Text-to-speech HP.
- Buat nyoba dari rumah: di tab Navigasi isi kolom **Dari** dengan kota lain, nanti perjalanannya disimulasikan.
- Update GPS berhenti kalau layar mati atau pindah aplikasi (batasan semua web app). Lanjut lagi pas dibuka.
- Jadwal shalat pakai WIB, cocok buat Jawa dan Sumatera. Kalau nanti nambah Bali atau wilayah WITA, perlu disesuaikan di `lib/prayer.js`.
- Peta pakai OpenStreetMap. Gratis, tapi kalau trafik sudah besar sebaiknya pindah ke penyedia tile berbayar (MapTiler, Stadia, dll).
- Moderasi laporan (hapus spam) lewat Firebase Console > Firestore > koleksi `laporan`.

## Struktur

```
app/            halaman & gaya
components/     NavView, FreeDrive, NavMap, PlanView, StopCard, ReportSheet
lib/route.js    garis tol, kota, snap GPS ke jalur, perencana rute
lib/prayer.js   hitung jadwal shalat
lib/trip.js     timeline perjalanan & rest area di depan
lib/nav.js      rute, teks belokan, masjid di rute, waktu shalat di rute
lib/geo.js      hitungan garis rute (jarak, proyeksi GPS, arah)
data/           daftar rest area
public/sw.js    service worker offline
firestore.rules aturan keamanan database
```
