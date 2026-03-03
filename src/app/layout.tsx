import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat, Playfair_Display, Patrick_Hand, Inter_Tight, Dancing_Script, Crimson_Text } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import 'mapbox-gl/dist/mapbox-gl.css';
import { SkipToMain } from "@/components/ui/AccessibleIcon";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  subsets: ["latin"],
  weight: ["400"],
});

// Serif font for memory titles
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Photobook editor fonts
const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson-text",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "YoursTruly - Document Your Life",
  description: "A life platform for documenting the past, planning the future, and staying connected across generations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Cookiebot GDPR Cookie Consent - must load first to block non-essential cookies */}
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="4c3722ae-6bc8-454a-9330-fdad835a58cc"
          data-blockingmode="auto"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${interTight.variable} ${caveat.variable} ${patrickHand.variable} ${playfair.variable} ${dancingScript.variable} ${crimsonText.variable} antialiased`}
      >
        <SkipToMain />
        {children}
      </body>
    </html>
  );
}
