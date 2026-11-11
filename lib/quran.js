// Data dasar Mushaf Madinah (cetakan 1441H, 604 halaman, riwayat Hafs).
// Tampilan halamannya pakai quran-madina-html (teks asli, bukan gambar), dimuat dari CDN unpkg.
// Lisensi: Waqf General Public License 2.0 (boleh dipakai gratis, nggak boleh dijual). Teks: Tanzil.
export const QMH_VER = "2.2.2";
export const QMH_SRC = `https://unpkg.com/quran-madina-html@${QMH_VER}/dist/quran-madina-html.min.js`;
export const PAGES = 604;

// [nomor, nama, nama arab, jumlah ayat, halaman awal, tempat turun]
export const SURAH = [
  [1, "Al-Fatihah", "الفاتحة", 7, 1, "Makkiyah"],
  [2, "Al-Baqarah", "البقرة", 286, 2, "Madaniyah"],
  [3, "Ali 'Imran", "آل عمران", 200, 50, "Madaniyah"],
  [4, "An-Nisa", "النساء", 176, 77, "Madaniyah"],
  [5, "Al-Ma'idah", "المائدة", 120, 106, "Madaniyah"],
  [6, "Al-An'am", "الأنعام", 165, 128, "Makkiyah"],
  [7, "Al-A'raf", "الأعراف", 206, 151, "Makkiyah"],
  [8, "Al-Anfal", "الأنفال", 75, 177, "Madaniyah"],
  [9, "At-Tawbah", "التوبة", 129, 187, "Madaniyah"],
  [10, "Yunus", "يونس", 109, 208, "Makkiyah"],
  [11, "Hud", "هود", 123, 221, "Makkiyah"],
  [12, "Yusuf", "يوسف", 111, 235, "Makkiyah"],
  [13, "Ar-Ra'd", "الرعد", 43, 249, "Madaniyah"],
  [14, "Ibrahim", "ابراهيم", 52, 255, "Makkiyah"],
  [15, "Al-Hijr", "الحجر", 99, 262, "Makkiyah"],
  [16, "An-Nahl", "النحل", 128, 267, "Makkiyah"],
  [17, "Al-Isra", "الإسراء", 111, 282, "Makkiyah"],
  [18, "Al-Kahf", "الكهف", 110, 293, "Makkiyah"],
  [19, "Maryam", "مريم", 98, 305, "Makkiyah"],
  [20, "Taha", "طه", 135, 312, "Makkiyah"],
  [21, "Al-Anbya", "الأنبياء", 112, 322, "Makkiyah"],
  [22, "Al-Hajj", "الحج", 78, 332, "Madaniyah"],
  [23, "Al-Mu'minun", "المؤمنون", 118, 342, "Makkiyah"],
  [24, "An-Nur", "النور", 64, 350, "Madaniyah"],
  [25, "Al-Furqan", "الفرقان", 77, 359, "Makkiyah"],
  [26, "Ash-Shu'ara", "الشعراء", 227, 367, "Makkiyah"],
  [27, "An-Naml", "النمل", 93, 377, "Makkiyah"],
  [28, "Al-Qasas", "القصص", 88, 385, "Makkiyah"],
  [29, "Al-'Ankabut", "العنكبوت", 69, 396, "Makkiyah"],
  [30, "Ar-Rum", "الروم", 60, 404, "Makkiyah"],
  [31, "Luqman", "لقمان", 34, 411, "Makkiyah"],
  [32, "As-Sajdah", "السجدة", 30, 415, "Makkiyah"],
  [33, "Al-Ahzab", "الأحزاب", 73, 418, "Madaniyah"],
  [34, "Saba", "سبإ", 54, 428, "Makkiyah"],
  [35, "Fatir", "فاطر", 45, 434, "Makkiyah"],
  [36, "Ya-Sin", "يس", 83, 440, "Makkiyah"],
  [37, "As-Saffat", "الصافات", 182, 446, "Makkiyah"],
  [38, "Sad", "ص", 88, 453, "Makkiyah"],
  [39, "Az-Zumar", "الزمر", 75, 458, "Makkiyah"],
  [40, "Ghafir", "غافر", 85, 467, "Makkiyah"],
  [41, "Fussilat", "فصلت", 54, 477, "Makkiyah"],
  [42, "Ash-Shuraa", "الشورى", 53, 483, "Makkiyah"],
  [43, "Az-Zukhruf", "الزخرف", 89, 489, "Makkiyah"],
  [44, "Ad-Dukhan", "الدخان", 59, 496, "Makkiyah"],
  [45, "Al-Jathiyah", "الجاثية", 37, 499, "Makkiyah"],
  [46, "Al-Ahqaf", "الأحقاف", 35, 502, "Makkiyah"],
  [47, "Muhammad", "محمد", 38, 507, "Madaniyah"],
  [48, "Al-Fath", "الفتح", 29, 511, "Madaniyah"],
  [49, "Al-Hujurat", "الحجرات", 18, 515, "Madaniyah"],
  [50, "Qaf", "ق", 45, 518, "Makkiyah"],
  [51, "Adh-Dhariyat", "الذاريات", 60, 520, "Makkiyah"],
  [52, "At-Tur", "الطور", 49, 523, "Makkiyah"],
  [53, "An-Najm", "النجم", 62, 526, "Makkiyah"],
  [54, "Al-Qamar", "القمر", 55, 528, "Makkiyah"],
  [55, "Ar-Rahman", "الرحمن", 78, 531, "Madaniyah"],
  [56, "Al-Waqi'ah", "الواقعة", 96, 534, "Makkiyah"],
  [57, "Al-Hadid", "الحديد", 29, 537, "Madaniyah"],
  [58, "Al-Mujadila", "المجادلة", 22, 542, "Madaniyah"],
  [59, "Al-Hashr", "الحشر", 24, 545, "Madaniyah"],
  [60, "Al-Mumtahanah", "الممتحنة", 13, 549, "Madaniyah"],
  [61, "As-Saf", "الصف", 14, 551, "Madaniyah"],
  [62, "Al-Jumu'ah", "الجمعة", 11, 553, "Madaniyah"],
  [63, "Al-Munafiqun", "المنافقون", 11, 554, "Madaniyah"],
  [64, "At-Taghabun", "التغابن", 18, 556, "Madaniyah"],
  [65, "At-Talaq", "الطلاق", 12, 558, "Madaniyah"],
  [66, "At-Tahrim", "التحريم", 12, 560, "Madaniyah"],
  [67, "Al-Mulk", "الملك", 30, 562, "Makkiyah"],
  [68, "Al-Qalam", "القلم", 52, 564, "Makkiyah"],
  [69, "Al-Haqqah", "الحاقة", 52, 566, "Makkiyah"],
  [70, "Al-Ma'arij", "المعارج", 44, 568, "Makkiyah"],
  [71, "Nuh", "نوح", 28, 570, "Makkiyah"],
  [72, "Al-Jinn", "الجن", 28, 572, "Makkiyah"],
  [73, "Al-Muzzammil", "المزمل", 20, 574, "Makkiyah"],
  [74, "Al-Muddaththir", "المدثر", 56, 575, "Makkiyah"],
  [75, "Al-Qiyamah", "القيامة", 40, 577, "Makkiyah"],
  [76, "Al-Insan", "الانسان", 31, 578, "Madaniyah"],
  [77, "Al-Mursalat", "المرسلات", 50, 580, "Makkiyah"],
  [78, "An-Naba", "النبإ", 40, 582, "Makkiyah"],
  [79, "An-Nazi'at", "النازعات", 46, 583, "Makkiyah"],
  [80, "'Abasa", "عبس", 42, 585, "Makkiyah"],
  [81, "At-Takwir", "التكوير", 29, 586, "Makkiyah"],
  [82, "Al-Infitar", "الإنفطار", 19, 587, "Makkiyah"],
  [83, "Al-Mutaffifin", "المطففين", 36, 587, "Makkiyah"],
  [84, "Al-Inshiqaq", "الإنشقاق", 25, 589, "Makkiyah"],
  [85, "Al-Buruj", "البروج", 22, 590, "Makkiyah"],
  [86, "At-Tariq", "الطارق", 17, 591, "Makkiyah"],
  [87, "Al-A'la", "الأعلى", 19, 591, "Makkiyah"],
  [88, "Al-Ghashiyah", "الغاشية", 26, 592, "Makkiyah"],
  [89, "Al-Fajr", "الفجر", 30, 593, "Makkiyah"],
  [90, "Al-Balad", "البلد", 20, 594, "Makkiyah"],
  [91, "Ash-Shams", "الشمس", 15, 595, "Makkiyah"],
  [92, "Al-Layl", "الليل", 21, 595, "Makkiyah"],
  [93, "Ad-Duhaa", "الضحى", 11, 596, "Makkiyah"],
  [94, "Ash-Sharh", "الشرح", 8, 596, "Makkiyah"],
  [95, "At-Tin", "التين", 8, 597, "Makkiyah"],
  [96, "Al-'Alaq", "العلق", 19, 597, "Makkiyah"],
  [97, "Al-Qadr", "القدر", 5, 598, "Makkiyah"],
  [98, "Al-Bayyinah", "البينة", 8, 598, "Madaniyah"],
  [99, "Az-Zalzalah", "الزلزلة", 8, 599, "Madaniyah"],
  [100, "Al-'Adiyat", "العاديات", 11, 599, "Makkiyah"],
  [101, "Al-Qari'ah", "القارعة", 11, 600, "Makkiyah"],
  [102, "At-Takathur", "التكاثر", 8, 600, "Makkiyah"],
  [103, "Al-'Asr", "العصر", 3, 601, "Makkiyah"],
  [104, "Al-Humazah", "الهمزة", 9, 601, "Makkiyah"],
  [105, "Al-Fil", "الفيل", 5, 601, "Makkiyah"],
  [106, "Quraysh", "قريش", 4, 602, "Makkiyah"],
  [107, "Al-Ma'un", "الماعون", 7, 602, "Makkiyah"],
  [108, "Al-Kawthar", "الكوثر", 3, 602, "Makkiyah"],
  [109, "Al-Kafirun", "الكافرون", 6, 603, "Makkiyah"],
  [110, "An-Nasr", "النصر", 3, 603, "Madaniyah"],
  [111, "Al-Masad", "المسد", 5, 603, "Makkiyah"],
  [112, "Al-Ikhlas", "الإخلاص", 4, 604, "Makkiyah"],
  [113, "Al-Falaq", "الفلق", 5, 604, "Makkiyah"],
  [114, "An-Nas", "الناس", 6, 604, "Makkiyah"]
];

// halaman awal tiap juz
export const JUZ = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];

export const surahOnPage = (page) => { let s = SURAH[0]; for (const x of SURAH) { if (x[4] <= page) s = x; else break; } return s; };
export const juzOnPage = (page) => { let j = 1; JUZ.forEach((p, i) => { if (p <= page) j = i + 1; }); return j; };

// muat script sekali aja, pas tab Al-Qur'an pertama dibuka
let loading = null;
export function loadQmh() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.customElements?.get("quran-madina-html")) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = QMH_SRC; s.async = true;
    if (window.__qmhFont) s.setAttribute("data-font-size", String(window.__qmhFont));
    s.setAttribute("data-cdn", `https://unpkg.com/quran-madina-html@${QMH_VER}/`);
    s.onload = () => ok(); s.onerror = () => { loading = null; fail(new Error("qmh")); };
    document.head.appendChild(s);
  });
  return loading;
}
