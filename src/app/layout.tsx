import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorker } from "@/components/layout/ServiceWorker";

// Font: uses a system stack that prefers Inter (see globals.css --font-inter).
// To bundle the exact Inter webfont instead, restore next/font:
//   import { Inter } from "next/font/google";
//   const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// then add `className={inter.variable}` to <html>.

export const metadata: Metadata = {
  title: "CAREWELL The Dental Experts",
  description: "Fast patient lookup, booking, and clinic management.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Carewell",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#c6297e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
