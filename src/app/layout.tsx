import type { Metadata } from "next";
import { Geist, Caveat, Playfair_Display, Inter_Tight } from "next/font/google";
import "./globals.css";
import "@/styles/themes.css";
// Map CSS moved to dashboard layout — only load where maps are used
import { SkipToMain } from "@/components/ui/AccessibleIcon";
import { CookiebotScript } from "@/components/ui/CookiebotScript";
import { Providers } from "@/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Brand primary font - Inter Tight
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Handwritten font for category pills and warm touches
const caveat = Caveat({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Serif font for memory titles
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "YoursTruly",
  description: "Live on. Preserve your memories, stories, and legacy for the people who matter most.",
  openGraph: {
    title: "YoursTruly",
    description: "Live on. Preserve your memories, stories, and legacy for the people who matter most.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YoursTruly",
    description: "Live on. Preserve your memories, stories, and legacy for the people who matter most.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${interTight.variable} ${caveat.variable} ${playfair.variable} antialiased`}
      >
        <CookiebotScript />
        <SkipToMain />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
