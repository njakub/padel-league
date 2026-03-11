import type { Metadata } from "next";
import "./globals.css";
import AddPlayerButton from "@/components/AddPlayerButton";

export const metadata: Metadata = {
  title: "Padel League Tracker",
  description: "Track your padel doubles league matches and standings",
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
            <h1 className="text-2xl font-bold text-gray-900">
              🎾 Padel League Tracker
            </h1>
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
