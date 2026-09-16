import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/motion";

// Be Vietnam Pro — District's verified UI face (see docs/DESIGN_LANGUAGE.md).
const beVietnam = Be_Vietnam_Pro({ variable: "--font-be-vietnam", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = { title: "District Plans", description: "The plan, not just the ticket." };
export const viewport: Viewport = { themeColor: "#120e1b", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ground text-fg">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
