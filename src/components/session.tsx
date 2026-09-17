"use client";
/**
 * Client identity + store bootstrap. The server layout passes the cookie user id; a guest who joined via a
 * link is remembered in localStorage. Also loads persisted plans, adopts a plan from the URL hash, and
 * seeds the demo plan — all before the first client render of a plan screen.
 */
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { store, getUser } from "@/lib/store/store";
import type { User } from "@/lib/store/types";
import { loadPersisted, hydrateFromHash, subscribe, getVersion, notify, persistPlan } from "@/lib/client/plans-store";
import { ensureDemoPlan } from "@/lib/client/demo";
import { enrichMovies } from "@/lib/services/movies";

const GUEST = "district:guest_id";
const Ctx = createContext<{ meId: string | null; ready: boolean; setGuest: (u: User) => void }>({ meId: null, ready: false, setGuest: () => {} });

export function SessionProvider({ cookieId, children }: { cookieId: string | null; children: ReactNode }) {
  const [meId, setMeId] = useState<string | null>(cookieId);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      enrichMovies(); loadPersisted(); hydrateFromHash();
      let id = cookieId;
      if (!id) { try { const r = await fetch("/api/session"); const j = await r.json(); id = j.user_id ?? null; } catch { /* offline: stay anonymous */ } }
      let g: string | null = null; try { g = localStorage.getItem(GUEST); } catch { /* ignore */ }
      if (cancelled) return;
      if (g && getUser(g)) id = g;
      if (id) setMeId(id);
      ensureDemoPlan(id ?? undefined);
      setReady(true); notify();
    };
    const t = setTimeout(boot, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [cookieId, pathname]);
  const setGuest = (u: User) => { store.users.set(u.id, u); try { localStorage.setItem(GUEST, u.id); } catch { /* ignore */ } setMeId(u.id); notify(); };
  return <Ctx.Provider value={{ meId, ready, setGuest }}>{children}</Ctx.Provider>;
}

export function useSession() { return useContext(Ctx); }
/** Re-render on any store mutation. */
export function useStoreVersion() { return useSyncExternalStore(subscribe, getVersion, () => 0); }
export function useMe(): User | undefined { const { meId } = useSession(); useStoreVersion(); return meId ? getUser(meId) : undefined; }
export { persistPlan };
