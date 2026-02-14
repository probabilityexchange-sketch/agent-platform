import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WalletContextProvider } from "@/contexts/WalletContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Randi",
  description: "Launch hosted AI agent containers with Randi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
