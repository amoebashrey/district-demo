"use client";
import { PageTransition } from "@/components/motion";
/** Re-mounts on every navigation → consistent screen-enter transition (fade + 12px rise, 220ms ease-out). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
