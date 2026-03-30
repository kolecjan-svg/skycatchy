import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyCatchy – Cheap Flights & Travel Deals",
  description: "Find the best flight deals and travel offers from multiple sources in one place.",
  openGraph: {
    title: "SkyCatchy – Cheap Flights & Travel Deals",
    description: "Find the best flight deals and travel offers from multiple sources in one place.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}