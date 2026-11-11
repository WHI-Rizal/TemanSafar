import { waLink, CONTACT_EMAIL, PUBLISHER } from "../../lib/whi";

export const metadata = {
  title: "Kebijakan Privasi · Teman Safar",
  description: "Data apa yang dipakai Teman Safar, buat apa, dan cara menghapusnya.",
};

const UPDATED = "11 November 2026";

// Halaman ini dipakai sebagai URL kebijakan privasi di Google Play dan App Store.
export default function Privasi() {
  const kontak = CONTACT_EMAIL
    ? <>email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> atau WhatsApp tim WHI lewat <a href={waLink("privasi")} target="_blank" rel="noopener">tautan ini</a></>
    : <>WhatsApp tim WHI lewat <a href={waLink("privasi")} target="_blank" rel="noopener">tautan ini</a></>;
  return (
    <main className="legal">
      <div className="wrap">
        <p><a href="/">‹ Kembali ke Teman Safar</a></p>
        <h1>Kebijakan Privasi Teman Safar</h1>
        <p className="note">Berlaku sejak {UPDATED}. Penerbit: {PUBLISHER}.</p>

        <p>Teman Safar adalah aplikasi gratis untuk musafir: navigasi, jadwal shalat, masjid dan tempat singgah di sepanjang rute, Al-Qur&apos;an, serta doa dan dzikir perjalanan. Kami berusaha memakai data sesedikit mungkin. Halaman ini menjelaskan data apa yang dipakai, untuk apa, dan bagaimana cara menghapusnya.</p>

        <h2>Ringkasnya</h2>
        <ul>
          <li>Tidak ada pendaftaran akun, tidak ada iklan, dan kami tidak menjual data.</li>
          <li>Lokasi dipakai di HP kamu untuk navigasi dan jadwal shalat, dan tidak kami simpan di server, kecuali kamu sendiri memilih menyertakannya di laporan kondisi.</li>
          <li>Laporan kondisi masjid (kebersihan toilet, mukena, parkir, dan sebagainya) bersifat publik dan bisa dilihat pengguna lain.</li>
        </ul>

        <h2>Data yang dipakai</h2>
        <h3>1. Lokasi (GPS)</h3>
        <p>Dipakai untuk menampilkan posisi kamu di peta, menghitung rute, memberi arahan belokan, menghitung jadwal shalat di posisi kamu, dan mencari masjid, musala, rest area, serta SPBU di sekitar rute. Untuk keperluan itu, koordinat dikirim ke layanan peta dan rute (lihat bagian Layanan pihak ketiga). Lokasi hanya dipakai saat aplikasi terbuka. Kamu bisa menolak izin lokasi. Aplikasi tetap bisa dipakai dengan memilih titik awal secara manual.</p>
        <h3>2. Laporan kondisi tempat singgah</h3>
        <p>Kalau kamu mengirim laporan, yang disimpan adalah: tempat yang dilaporkan, penilaian kebersihan, ketersediaan mukena, sarung, parkir bus, tempat rebahan, akses difabel, catatan singkat (maksimal 200 karakter), waktu kirim, dan ID anonim. Titik GPS hanya ikut disimpan kalau kamu mencentang pilihan &quot;Kirim titik GPS saya sekarang&quot;. Laporan bisa dibaca semua pengguna. Jangan menulis data pribadi di catatan.</p>
        <h3>3. ID anonim</h3>
        <p>Untuk mencegah penyalahgunaan laporan, aplikasi membuat ID anonim lewat Firebase Authentication. ID ini tidak terhubung dengan nama, nomor HP, atau email kamu.</p>
        <h3>4. Data yang tersimpan hanya di HP kamu</h3>
        <p>Riwayat pencarian tujuan, pilihan kendaraan, pengaturan suara pemandu, halaman Al-Qur&apos;an terakhir dibaca dan yang ditandai, serta salinan data peta dan masjid untuk dipakai saat sinyal hilang. Data ini tidak dikirim ke kami dan terhapus kalau kamu menghapus data aplikasi atau situs.</p>

        <h2>Yang tidak kami lakukan</h2>
        <ul>
          <li>Tidak meminta nama, nomor HP, email, kontak, foto, atau mikrofon.</li>
          <li>Tidak memasang iklan atau pelacak iklan.</li>
          <li>Tidak menjual atau menyewakan data ke siapa pun.</li>
        </ul>

        <h2>Layanan pihak ketiga</h2>
        <ul>
          <li><b>Vercel</b>: hosting aplikasi.</li>
          <li><b>Google Firebase</b> (Authentication &amp; Firestore): ID anonim dan laporan kondisi.</li>
          <li><b>Photon (komoot) dan Nominatim</b>, data OpenStreetMap: pencarian alamat, masjid, musala, rest area, dan SPBU.</li>
          <li><b>OSRM dan Valhalla (FOSSGIS)</b>, serta Mapbox bila diaktifkan: perhitungan rute.</li>
          <li><b>OpenFreeMap</b>: gambar peta.</li>
          <li><b>unpkg dan Google Fonts</b>: huruf dan tampilan mushaf Al-Qur&apos;an.</li>
        </ul>
        <p>Layanan di atas menerima alamat IP dan data yang diperlukan untuk menjalankan fungsinya (misalnya koordinat untuk menghitung rute), sesuai kebijakan privasi masing-masing. Tombol &quot;Chat tim WHI&quot; dan &quot;Lihat paket&quot; membuka WhatsApp dan situs Wisata Halal Indonesia, yang berlaku kebijakan privasinya sendiri.</p>

        <h2 id="hapus-data">Menghapus data</h2>
        <ul>
          <li><b>Data di HP</b>: hapus data aplikasi, atau hapus data situs temansafar.vercel.app di pengaturan browser.</li>
          <li><b>Laporan yang pernah kamu kirim</b>: hubungi kami ({kontak}) dengan menyebut nama tempat dan perkiraan waktu kirim. Kami hapus paling lambat 30 hari.</li>
        </ul>

        <h2>Anak-anak</h2>
        <p>Teman Safar tidak ditujukan untuk anak di bawah 13 tahun dan tidak dengan sengaja mengumpulkan data mereka.</p>

        <h2>Perubahan kebijakan</h2>
        <p>Kalau kebijakan ini berubah, tanggal di bagian atas akan diperbarui.</p>

        <h2>Kontak</h2>
        <p>{PUBLISHER}. Hubungi kami lewat {kontak}.</p>
      </div>
    </main>
  );
}
