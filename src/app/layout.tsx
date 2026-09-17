import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { HighlightProvider } from "@/components/highlight";

// Be Vietnam Pro — District's verified UI face (docs/DESIGN_LANGUAGE.md).
const geist = Be_Vietnam_Pro({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = { title: "District", description: "The plan, not just the ticket." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("dark h-full antialiased font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <HighlightProvider>{children}</HighlightProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
