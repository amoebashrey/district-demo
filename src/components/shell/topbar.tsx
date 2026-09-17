import Link from "next/link";
import { Search, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Initials } from "@/components/screen";
import { HighlightToggle } from "@/components/highlight";

/** District-style home header: city, search, avatar — plus the proposal toggle. */
export function TopBar({ city, name }: { city: string; name: string }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-md items-center gap-3 px-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Exploring</p>
          <p className="flex items-center gap-1 truncate text-sm font-semibold"><MapPin className="size-3.5 text-primary" />{city}</p>
        </div>
        <HighlightToggle />
        <Link href="/switch" aria-label="Switch user"><Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={name} /></AvatarFallback></Avatar></Link>
      </div>
      <div className="mx-auto w-full max-w-md px-4 pb-3">
        <div className="flex h-10 items-center gap-2 rounded-full border bg-muted/40 px-4 text-sm text-muted-foreground"><Search className="size-4" /> Search for events, movies and restaurants</div>
      </div>
    </header>
  );
}
