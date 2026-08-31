import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCORES21 — футбол Чувашии онлайн: турниры, статистика, результаты",
  description:
    "SCORES21 — спортивно-аналитический портал футбола Чувашии: livescore матчей 11×11, 8×8, 6×6 и мини-футбола, турнирные таблицы, статистика игроков и судей, дисквалификации, календарь турниров.",
  keywords: ["футбол", "Чувашия", "результаты матчей", "livescore", "турнирная таблица", "мини-футбол", "статистика", "дисквалификации", "scores21"],
  openGraph: {
    title: "SCORES21 — футбол Чувашии онлайн",
    description: "Все турниры Чувашии в реальном времени: матчи, таблицы, бомбардиры, судьи",
    siteName: "SCORES21",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
