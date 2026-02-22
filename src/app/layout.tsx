import type { Metadata } from "next";
import { PrivyContextProvider } from "@/contexts/PrivyContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Randi - Launch AI Agents Instantly",
  description: "Connect your Solana wallet, buy credits, and spin up hosted AI agent containers instantly. No setup required. Pay with SPL tokens.",
  keywords: ["AI agents", "Solana", "blockchain", "containerization", "hosted agents", "SPL tokens"],
  authors: [{ name: "Randi" }],
  creator: "Randi",
  publisher: "Randi",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Randi - Launch AI Agents Instantly",
    description: "Connect your Solana wallet, buy credits, and spin up hosted AI agent containers instantly.",
    siteName: "Randi",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Randi - AI Agent Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Randi - Launch AI Agents Instantly",
    description: "Connect your Solana wallet, buy credits, and spin up hosted AI agent containers instantly.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased bg-background text-foreground min-h-screen"
      >
        <PrivyContextProvider>{children}</PrivyContextProvider>
      </body>
    </html>
  );
}
