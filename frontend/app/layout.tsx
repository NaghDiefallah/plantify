import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Plantify SaaS",
  description: "Professional plant disease detection with ONNX inference"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
