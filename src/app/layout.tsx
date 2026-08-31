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
  title: "Футбол Чувашии — спортивно-аналитический портал",
  description:
    "Единый региональный хаб футбольных и мини-футбольных турниров Чувашии: турнирные таблицы, календарь матчей, статистика игроков, дисциплинарный регламент, судейский корпус.",
  keywords: ["футбол", "Чувашия", "турнир", "статистика", "мини-футбол", "дисквалификации"],
  openGraph: {
    title: "Футбол Чувашии",
    description: "Турниры, статистика и судейство Чувашии — в одном портале",
    siteName: "Футбол Чувашии",
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
