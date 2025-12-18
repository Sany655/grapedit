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
  metadataBase: new URL("https://projects.vercel.app/projects.vercel.app"),
  title: {
    default: "Grapedit - Advanced Video Editor",
    template: "%s | Free Online Video Editor",
  },
  description: "Free online video editor. Merge clips, trim video. No upload required - 100% private & fast.",
  keywords: ["online video editor", "merge video online", "trim video", "browser video editor", "video cutter"],
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
    url: "https://projects.vercel.app/projects.vercel.app",
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
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
