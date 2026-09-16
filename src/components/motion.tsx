"use client";
/**
 * The motion system. One vocabulary, used everywhere:
 *  - enter: fade + 12px rise, 220ms, ease-out            (PageTransition, Reveal, Stagger)
 *  - tactile: spring scale on press                        (Pressable, VoteButton)
 *  - state swap: blur + scale cross-fade                   (Swap, NumberFlow)
 *  - celebrate: glow burst + check draw, once              (LockReveal, SuccessCheck)
 * Respects prefers-reduced-motion via MotionConfig (JS) and globals.css (CSS).
 * Patterns adapted from smoothui.dev / transitions.dev (sliding tabs, number pop-in, success check, toast rise).
 */
import { AnimatePresence, LayoutGroup, MotionConfig, motion as m, useReducedMotion, type Transition } from "motion/react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { motion as T } from "@/lib/theme/tokens";

export const enter: Transition = { duration: T.duration.base, ease: T.ease.out };
export const fast: Transition = { duration: T.duration.fast, ease: T.ease.out };
export const snappy: Transition = T.spring.snappy;
export const soft: Transition = T.spring.soft;
export const rise = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 } };

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={enter}>{children}</MotionConfig>;
}

export function PageTransition({ children }: { children: ReactNode }) {
  return <m.div {...rise} transition={enter} className="flex-1 flex flex-col">{children}</m.div>;
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return <m.div {...rise} transition={{ ...enter, delay }} className={className}>{children}</m.div>;
}

/** Staggered children. Pass `as="ul"` for lists. */
export function Stagger({ children, className, as = "div", delay = 0 }: { children: ReactNode; className?: string; as?: "div" | "ul"; delay?: number }) {
  const C = as === "ul" ? m.ul : m.div;
  return <C initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: T.stagger, delayChildren: delay } } }} className={className}>{children}</C>;
}
export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const C = as === "li" ? m.li : m.div;
  return <C variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: enter } }} className={className}>{children}</C>;
}

/** Any pressable surface: spring scale on tap, nothing on hover (mobile-first). */
export function Pressable({ children, className, scale = 0.97, ...rest }: React.ComponentProps<typeof m.button> & { scale?: number }) {
  return <m.button whileTap={{ scale }} transition={snappy} className={className} {...rest}>{children}</m.button>;
}

/** Sliding-pill chip group (transitions.dev "tabs sliding"). Selected background glides between chips. */
export function ChipGroup<K extends string>({ options, value, onChange, className }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; className?: string }) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <m.button key={o.key} type="button" onClick={() => onChange(o.key)} whileTap={{ scale: 0.96 }} transition={snappy}
              className={`relative h-9 px-3.5 rounded-full t-button2 border transition-colors duration-150 ${on ? "text-bg border-transparent" : "text-fg-2 border-line-2 bg-surface"}`}>
              {on && <m.span layoutId={`${id}-pill`} transition={snappy} className="absolute inset-0 rounded-full bg-fg" />}
              <span className="relative">{o.label}</span>
            </m.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

/** Number pop-in (digits slide + blur) for steppers and tallies. */
export function NumberFlow({ value, className }: { value: number | string; className?: string }) {
  return (
    <span className={`relative inline-grid place-items-center overflow-hidden ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span key={String(value)} initial={{ y: 10, opacity: 0, filter: "blur(4px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }} exit={{ y: -10, opacity: 0, filter: "blur(4px)" }} transition={fast} className="tabular">
          {value}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

/** Blur cross-fade between two states (text or icon swap). */
export function Swap({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.span key={id} initial={{ opacity: 0, scale: 0.9, filter: "blur(3px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.9, filter: "blur(3px)" }} transition={fast} className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
        {children}
      </m.span>
    </AnimatePresence>
  );
}

/** Success check: stroke draws in, ring pops (transitions.dev "success check" + "checkbox check"). */
export function SuccessCheck({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <m.svg width={size} height={size} viewBox="0 0 72 72" fill="none" className={className} initial={{ scale: 0.6, rotate: -12, opacity: 0, filter: "blur(4px)" }} animate={{ scale: 1, rotate: 0, opacity: 1, filter: "blur(0px)" }} transition={soft}>
      <circle cx="36" cy="36" r="34" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <m.circle cx="36" cy="36" r="34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: T.duration.slow, ease: T.ease.out }} style={{ rotate: -90 }} />
      <m.path d="M22 37l9 9 19-20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: T.duration.slow, ease: T.ease.out, delay: 0.12 }} />
    </m.svg>
  );
}

/** Animated width bar (votes toward lock). */
export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  return <div className={`h-1 w-full rounded-full bg-surface-sel overflow-hidden ${className ?? ""}`}><m.div className="h-full rounded-full bg-brand-btn" initial={false} animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }} transition={soft} /></div>;
}

/** Avatars enter one by one with a spring; leaving ones shrink out. */
export function TallyAvatars({ children }: { children: ReactNode }) {
  return <LayoutGroup><AnimatePresence initial={false}>{children}</AnimatePresence></LayoutGroup>;
}
export function TallyAvatar({ id, children, first }: { id: string; children: ReactNode; first?: boolean }) {
  return <m.span layout key={id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={snappy} className={`inline-flex ${first ? "" : "-ml-2"}`}>{children}</m.span>;
}

/** Toast: rise + fade + blur + slight scale. */
export function ToastView({ msg }: { msg: string | null }) {
  return (
    <AnimatePresence>
      {msg && (
        <m.div role="status" key={msg} initial={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }} transition={enter}
          className="fixed left-1/2 -translate-x-1/2 bottom-28 z-50 max-w-[90vw] rounded-full bg-fg text-bg px-4 py-2.5 t-button2 shadow-[0_12px_32px_-12px_rgba(0,0,0,.6)]">
          {msg}
        </m.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Lock reveal: full-screen purple glow burst, check draw, title, then dismiss (tap or 2.2s).
 * Plays once per plan per browser (sessionStorage) so a refresh doesn't replay it.
 */
export function LockReveal({ planId, active, title, subtitle }: { planId: string; active: boolean; title: string; subtitle?: string }) {
  const [show, setShow] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!active) return;
    const k = `lock-seen:${planId}`;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch { /* private mode */ }
    const t0 = setTimeout(() => setShow(true), 0); // deferred so the effect itself doesn't set state
    const t1 = setTimeout(() => setShow(false), reduced ? 1200 : 2200);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [active, planId, reduced]);
  return (
    <AnimatePresence>
      {show && (
        <m.div key="lock" onClick={() => setShow(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fast} className="fixed inset-0 z-[60] grid place-items-center bg-[var(--overlay)] backdrop-blur-sm">
          <m.div initial={{ scale: 0.2, opacity: 0.8 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.9, ease: T.ease.out }} className="absolute w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, var(--glow-purple), transparent 65%)" }} />
          <m.div initial={{ scale: 0.92, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={soft} className="relative mx-6 w-[min(88vw,360px)] rounded-3xl p-6 text-center bg-[linear-gradient(160deg,#401cce_0%,#6d49fd_100%)] shadow-[0_30px_80px_-20px_rgba(109,73,253,0.7)]">
            <SuccessCheck className="text-white mx-auto" />
            <m.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enter, delay: 0.25 }} className="t-button3 uppercase tracking-[0.12em] text-white/70 mt-4">Locked in</m.p>
            <m.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enter, delay: 0.32 }} className="t-heading3 text-white mt-1 capitalize">{title}</m.p>
            {subtitle && <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...enter, delay: 0.4 }} className="t-body2 text-white/80 mt-2">{subtitle}</m.p>}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
