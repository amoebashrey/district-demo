"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ToastView, Pressable } from "./motion";

export class ApiError extends Error { code: string; status: number; constructor(msg: string, code: string, status: number) { super(msg); this.code = code; this.status = status; } }
export async function api<T = unknown>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(data.error ?? "Something went wrong", data.code ?? "error", r.status);
  return data as T;
}

/** Polls router.refresh() so tallies/avatars update live without a socket. */
export function LiveRefresh({ every = 3000, active = true }: { every?: number; active?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, every);
    return () => clearInterval(id);
  }, [router, every, active]);
  return null;
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (m: string) => { setMsg(m); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 2600); };
  const node: ReactNode = <ToastView msg={msg} />;
  return { show, node };
}

/** Button that runs an API call then refreshes the server components. Spring press feedback built in. */
export function ActionButton({ url, body, onDone, onError, children, className, disabled }: { url: string; body?: unknown; onDone?: (r: unknown) => void; onError?: (e: ApiError) => void; children: ReactNode; className?: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Pressable disabled={disabled || pending} className={className} onClick={() => {
      start(async () => {
        try { const r = await api(url, body); router.refresh(); onDone?.(r); } catch (e) { onError?.(e as ApiError); }
      });
    }}>{children}</Pressable>
  );
}
