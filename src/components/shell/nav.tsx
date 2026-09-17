"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, Clapperboard, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "For You", icon: Home },
  { href: "/dining", label: "Dining", icon: UtensilsCrossed },
  { href: "/movies", label: "Movies", icon: Clapperboard },
  { href: "/events", label: "Events", icon: Ticket },
  { href: "/profile", label: "Profile", icon: User },
];

/** District's bottom nav (recreated). Profile lights up for /plans and /confirmation too. */
export function BottomNav() {
  const path = usePathname();
  const active = (href: string) =>
    href === "/"
      ? path === "/"
      : path.startsWith(href) ||
        (href === "/profile" && (path.startsWith("/plans") || path.startsWith("/confirmation")));
  return (
    <>
      {/* Set --nav-h so fixed-bottom content bars know how tall the nav is */}
      <style>{`:root { --nav-h: 64px; }`}</style>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <ul
          className="mx-auto grid w-full max-w-md grid-cols-5"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {TABS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active(t.href) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="size-5" />
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
