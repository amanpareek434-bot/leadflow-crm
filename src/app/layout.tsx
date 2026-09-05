import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "LeadFlow CRM — All-in-one CRM with WhatsApp, Ads & ERP integrations",
  description:
    "Multi-tenant CRM with official WhatsApp Business automation, Meta Ads / Google Ads / Shopify integrations, outgoing API for Google Sheets & your ERP, and full reporting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
