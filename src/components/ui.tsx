import Link from "next/link";
import type { ReactNode } from "react";
import { initials } from "@/lib/format";

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

export function Screen({ children, title, back, right, bottom, ambient = true }: { children: ReactNode; title?: string; back?: string; right?: ReactNode; bottom?: ReactNode; ambient?: boolean }) {
  return (
    <main className={cx("phone-shell flex flex-col", ambient && "ambient")}>
      {(title || back) && (
        <header className="sticky top-0 z-20 flex items-center gap-2 px-3 h-14 bg-bg/80 backdrop-blur-xl border-b border-line">
          {back ? <Link href={back} aria-label="Back" className="w-10 h-10 grid place-items-center rounded-full active:bg-surface-sel text-fg transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></Link> : <span className="w-2" />}
          <h1 className="t-button1 flex-1 truncate">{title}</h1>
          {right}
        </header>
      )}
      <div className={cx("flex-1 px-4 pt-4 flex flex-col gap-5", bottom ? "pb-32" : "pb-10")}>{children}</div>
      {bottom && <div className="fixed bottom-0 inset-x-0 z-20 pointer-events-none"><div className="phone-shell !min-h-0 !bg-transparent !shadow-none px-4 pt-6 pb-[max(16px,env(safe-area-inset-bottom))] bg-gradient-to-t from-bg via-bg/90 to-transparent pointer-events-auto">{bottom}</div></div>}
    </main>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
export const buttonClass = (variant: Variant = "primary", small = false, full = false) => cx(
  "inline-flex items-center justify-center gap-2 rounded-[14px] transition-[opacity,background-color] duration-150 disabled:opacity-40",
  small ? "h-10 px-4 t-button2" : "h-12 px-5 t-button1",
  { primary: "bg-brand-btn text-fg glow-cta", secondary: "bg-surface-2 text-fg border border-line-2", ghost: "bg-transparent text-fg-2", danger: "bg-error-surface text-error" }[variant],
  full && "w-full",
);
export function Button({ children, variant = "primary", full, small, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean; small?: boolean }) {
  return <button {...rest} className={cx(buttonClass(variant, small, full), "active:scale-[0.97] transition-transform", className)}>{children}</button>;
}

export function Card({ children, className, tone = "surface" }: { children: ReactNode; className?: string; tone?: "surface" | "brand" | "success" | "warning" | "error" }) {
  const t = {
    surface: "bg-surface border-line",
    brand: "bg-[linear-gradient(160deg,#401cce_0%,#6d49fd_100%)] border-transparent shadow-[0_24px_60px_-24px_rgba(109,73,253,0.7)]",
    success: "bg-success-surface border-transparent", warning: "bg-warning-surface border-transparent", error: "bg-error-surface border-transparent",
  }[tone];
  return <section className={cx("rounded-[18px] border p-4", t, className)}>{children}</section>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "success" | "warning" | "error" }) {
  const t = { neutral: "bg-surface-2 text-fg-2", brand: "bg-brand/25 text-offer", success: "bg-success-surface text-success", warning: "bg-warning-surface text-warning", error: "bg-error-surface text-error" }[tone];
  return <span className={cx("inline-flex items-center h-6 px-2.5 rounded-full t-button3", t)}>{children}</span>;
}

/* Avatar hues come from the token palette's accent set (brand purples + vertical colours). */
const HUES = ["#6d49fd", "#e13ff3", "#f09275", "#45a4f7", "#58e487", "#e8d954", "#fb4173", "#8972fe"];
export function Avatar({ name, size = 32, ring, dim, className }: { name: string; size?: number; ring?: boolean; dim?: boolean; className?: string }) {
  const h = HUES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
  return (
    <span title={name} style={{ width: size, height: size, fontSize: size * 0.36, background: dim ? "transparent" : h, borderColor: dim ? "var(--line-3)" : ring ? "var(--surface)" : "transparent" }} className={cx("inline-grid place-items-center rounded-full font-semibold text-white shrink-0 border-2", dim && "text-fg-3 border-dashed", className)}>
      {initials(name)}
    </span>
  );
}
export function AvatarStack({ names, size = 28, max = 5 }: { names: string[]; size?: number; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <span className="inline-flex items-center">
      {shown.map((n, i) => <Avatar key={n + i} name={n} size={size} ring className={i > 0 ? "-ml-2" : ""} />)}
      {names.length > max && <span className="-ml-2 grid place-items-center rounded-full bg-surface-2 text-fg-2 border-2 border-surface t-button3" style={{ width: size, height: size }}>+{names.length - max}</span>}
    </span>
  );
}

export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return <div className="rounded-[18px] border border-dashed border-line-3 p-6 text-center flex flex-col items-center gap-2"><p className="t-title1">{title}</p>{body && <p className="t-body2 text-fg-2 max-w-[30ch]">{body}</p>}{children}</div>;
}

export function Kicker({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "brand" }) {
  return <p className={cx("t-button3 uppercase tracking-[0.1em]", tone === "brand" ? "text-accent" : "text-fg-3")}>{children}</p>;
}

/** Two-tone headline: strong first part, muted tail. */
export function Headline({ children, tail, className }: { children: ReactNode; tail?: ReactNode; className?: string }) {
  return <h1 className={cx("t-display", className)}>{children}{tail && <> <span className="text-fg-2">{tail}</span></>}</h1>;
}
