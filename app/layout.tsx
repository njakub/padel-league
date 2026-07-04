import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import AddPlayerButton from "@/components/AddPlayerButton";

export const metadata: Metadata = {
  title: "Padel League Tracker",
  description: "Track your padel doubles league matches and standings",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/padel-logo.png",
    apple: "/padel-logo.png",
    shortcut: "/padel-logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "Padel League",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#18a7e0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 text-gray-900 hover:text-gray-700 transition-colors"
            >
              <Image
                src="/padel-logo.png"
                alt="Padel League logo"
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 object-contain"
                priority
              />
              <div>
                <p className="text-2xl font-bold leading-none">Padel League</p>
                <p className="text-xs text-gray-500 mt-1">
                  Fair rounds, standings, and scheduling
                </p>
              </div>
            </Link>
            <AddPlayerButton />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
