import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Instrument_Serif } from "next/font/google";
import "./globals.css";

// Be Vietnam Pro = District's verified UI face. Instrument Serif = provisional stand-in for Passenger Serif.
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "District Plans",
  description: "The plan, not just the ticket.",
};

export const viewport: Viewport = {
  themeColor: "#131316",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${beVietnam.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-fg">{children}</body>
    </html>
  );
}
