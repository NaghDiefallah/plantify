import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { IBM_Plex_Sans_Arabic } from "next/font/google";

import {AppProviders} from "@/components/providers/app-providers";
import {DefaultIntlProvider} from "@/components/providers/default-intl-provider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sora",
  display: "swap"
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-plex-arabic",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Plantify - AI Plant Disease Detection",
  description: "Advanced plant disease detection and treatment recommendations powered by AI"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="en" 
      className={`${sora.variable} ${ibmPlexArabic.variable}`} 
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#22c55e" />
      </head>
      <body className="antialiased">
        <DefaultIntlProvider>
          <AppProviders>{children}</AppProviders>
        </DefaultIntlProvider>
      </body>
    </html>
  );
}
