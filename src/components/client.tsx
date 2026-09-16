"use client";
import { useEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

type BtnProps = React.ComponentProps<typeof Button>;
/** shadcn Button that runs an API call, refreshes server components, and toasts errors. */
export function ActionButton({ url, body, onDone, children, ...btn }: BtnProps & { url: string; body?: unknown; onDone?: (r: unknown) => void; children: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button {...btn} disabled={btn.disabled || pending} onClick={() => {
      start(async () => {
        try { const r = await api(url, body); router.refresh(); onDone?.(r); } catch (e) { toast.error((e as ApiError).message); }
      });
    }}>{children}</Button>
  );
}
