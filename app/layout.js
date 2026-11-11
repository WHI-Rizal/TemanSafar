import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://temansafar.vercel.app"),
  title: "Teman Safar",
  description: "Teman shalat di perjalanan: navigasi, jadwal shalat real time, dan masjid yang keburu disinggahi. Kondisi toilet, mukena, dan parkir dari laporan sesama musafir.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Teman Safar", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  // gambar pratinjau pas link dibagikan di WhatsApp / medsos: logo WHI
  openGraph: {
    title: "Teman Safar by Wisata Halal Indonesia",
    description: "Teman shalat di perjalanan. Navigasi, jadwal shalat real time, dan masjid yang masih keburu disinggahi.",
    url: "/", siteName: "Teman Safar", locale: "id_ID", type: "website",
    images: [{ url: "/og.png", width: 1200, height: 1200, alt: "Logo Wisata Halal Indonesia" }],
  },
  twitter: { card: "summary", images: ["/og.png"] },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E8174",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
