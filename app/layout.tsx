import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="cs" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={cn("font-sans min-h-screen", geist.variable)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}