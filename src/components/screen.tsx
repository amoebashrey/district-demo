import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Phone-width page shell: sticky header, scrolling content, optional fixed bottom bar. */
export function Screen({ children, title, back, right, bottom }: { children: ReactNode; title?: string; back?: string; right?: ReactNode; bottom?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 flex flex-col">
      {(title || back) && (
        <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b bg-background/90 px-2 backdrop-blur">
          {back ? <Button variant="ghost" size="icon" asChild aria-label="Back"><Link href={back}><ArrowLeft /></Link></Button> : <span className="w-2" />}
          <h1 className="flex-1 truncate text-sm font-medium">{title}</h1>
          {right}
        </header>
      )}
      <div className={cn("flex-1 space-y-5 px-4 pt-4", bottom ? "pb-28" : "pb-8")}>{children}</div>
      {bottom && (
        <div className="fixed inset-x-0 z-20" style={{ bottom: "var(--nav-h, 0px)" }}>
          <div className="mx-auto w-full max-w-md border-t bg-background/95 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur">{bottom}</div>
        </div>
      )}
    </main>
  );
}

export function Initials({ name }: { name: string }) {
  return <>{name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</>;
}
