import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { HighlightProvider } from "@/components/highlight";
import { SessionProvider } from "@/components/session";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

// Be Vietnam Pro — District's verified UI face (docs/DESIGN_LANGUAGE.md).
const geist = Be_Vietnam_Pro({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = { title: "District", description: "The plan, not just the ticket." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieId = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return (
    <html lang="en" className={cn("dark h-full antialiased font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider cookieId={cookieId}><HighlightProvider>{children}</HighlightProvider></SessionProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
