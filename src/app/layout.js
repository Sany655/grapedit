import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://grapedit-jbn06kxje-sany655s-projects.vercel.app"),
  title: {
    default: "Grapedit - Advanced Video Editor",
    template: "%s | Grapedit",
  },
  description: "Download, trim, and edit videos directly in your browser. Supports HLS, m3u8, and protected streams with local privacy.",
  keywords: ["video editor", "browser video editor", "trim video", "merge video", "HLS stream", "m3u8 downloader", "ffmpeg wasm", "local video editing"],
  authors: [{ name: "Grapedit Team" }],
  creator: "Grapedit",
  publisher: "Grapedit",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://grapedit-jbn06kxje-sany655s-projects.vercel.app",
    title: "Grapedit - Advanced Video Editor",
    description: "Professional video editing directly in your browser. Download protected streams, trim with frame accuracy, and merge clips instantly.",
    siteName: "Grapedit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grapedit - Advanced Video Editor",
    description: "Professional video editing directly in your browser. Local processing, no uploads.",
    creator: "@grapedit",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
