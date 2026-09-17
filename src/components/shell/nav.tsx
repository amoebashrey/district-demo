"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clapperboard, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Clapperboard },
  { href: "/profile", label: "Profile", icon: User },
];

/** District's floating pill nav (recreated). Profile lights up for /plans and /confirmation too. */
export function BottomNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/profile" && (path.startsWith("/plans") || path.startsWith("/confirmation"))));
  return (
    <>
      <style>{`:root { --nav-h: 88px; }`}</style>
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(12px,env(safe-area-inset-bottom))]">
        <ul className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#18181b]/95 p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,.9)] backdrop-blur-xl">
          {TABS.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className={cn("flex h-14 w-24 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors", active(t.href) ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground")}>
                <t.icon className="size-5" />{t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
