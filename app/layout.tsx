import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Forecast Ledger", template: "%s · Forecast Ledger" },
  description: "Scored, sourced predictions in interventional psychiatry and psychedelic medicine.",
  metadataBase: new URL("https://psych-forecast-ledger.vercel.app"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} js`}>
      <body>{children}</body>
    </html>
  );
}
