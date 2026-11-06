"use client";
import dynamic from "next/dynamic";

// Peta & GPS cuma jalan di browser, jadi App dimuat tanpa SSR.
const App = dynamic(() => import("../components/App"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: "40px 16px", textAlign: "center", color: "#5d6b63" }}>Memuat Jejak Musafir…</div>
  ),
});

export default function Page() {
  return <App />;
}
