import Link from "next/link";
import { MapPin, ChevronDown, Home as HomeIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Initials } from "@/components/screen";
import { HighlightToggle } from "@/components/highlight";

/** District home header: pin + locality/area line + avatar. `section` variant = "Movies / <locality>" with a home button. */
export function TopBar({ city, name, area, section }: { city: string; name: string; area?: string; section?: string }) {
  const locality = area ?? city;
  return (
    <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-md items-center gap-3 px-4">
        {section ? (
          <Link href="/" aria-label="Home" className="grid size-9 place-items-center rounded-full bg-white/8 text-foreground"><HomeIcon className="size-4" /></Link>
        ) : (
          <MapPin className="size-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          {section ? (
            <><p className="truncate text-base font-semibold leading-tight">{section}</p><p className="flex items-center gap-0.5 truncate text-xs text-muted-foreground">{locality} <ChevronDown className="size-3" /></p></>
          ) : (
            <><p className="flex items-center gap-0.5 truncate text-base font-semibold leading-tight">{locality} <ChevronDown className="size-4 text-muted-foreground" /></p><p className="truncate text-xs text-muted-foreground">{area ? `${area}, ${city}` : city}</p></>
          )}
        </div>
        <HighlightToggle compact />
        <Link href="/switch" aria-label="Switch user" className="rounded-full ring-2 ring-brand/60 ring-offset-2 ring-offset-background"><Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={name} /></AvatarFallback></Avatar></Link>
      </div>
    </header>
  );
}
