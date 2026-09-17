import { cn } from "@/lib/utils";

/** Gradient key-art stand-in. Real District shows the film poster; we show title typography on a mood gradient. */
export function Poster({ title, gradient, className, children, big }: { title: string; gradient: string; className?: string; children?: React.ReactNode; big?: boolean }) {
  const [a, b] = title.split(":");
  return (
    <div className={cn("poster", className)} style={{ ["--poster-bg" as string]: gradient }}>
      <div className="absolute inset-x-0 bottom-0 z-[1] px-4 pb-4">
        <p className={cn("font-black uppercase leading-[0.95] tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.8)]", big ? "text-[40px]" : "text-2xl")} style={{ fontFamily: "Impact, 'Arial Narrow Bold', sans-serif" }}>{a}</p>
        {b && <p className={cn("mt-1 font-semibold uppercase tracking-[0.25em] text-white/85", big ? "text-sm" : "text-[10px]")}>{b.trim()}</p>}
      </div>
      {children}
    </div>
  );
}
