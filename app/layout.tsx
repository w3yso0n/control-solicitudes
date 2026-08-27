import type { Metadata } from "next";
import { Fraunces, Inter, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beatriz Mojica",
  description: "Temperatura ciudadana en tiempo real. Fase campaña.",
  icons: {
    icon: [{ url: "/brand/logo-wordmark_og.png", type: "image/png" }],
    apple: "/brand/logo-wordmark_og.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-hueso font-sans text-tinta">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
