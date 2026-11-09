import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata = {
  title: "Jejak Musafir",
  description: "Rest area, masjid, dan waktu shalat di sepanjang perjalanan tol. Kondisi toilet, mukena, dan parkir dari laporan sesama musafir.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Jejak Musafir", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d6b45",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Overpass:wght@600;800;900&family=Atkinson+Hyperlegible:wght@400;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
