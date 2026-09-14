"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { api, ApiError } from "@/components/client";

export function JoinForm({ token, planId, meName, already }: { token: string; planId: string; meName?: string; already: boolean }) {
  const router = useRouter();
  const [guest, setGuest] = useState(!meName);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const go = (body: unknown) => start(async () => { setErr(null); try { await api(`/api/join/${token}`, body); router.push(`/plans/${planId}`); router.refresh(); } catch (e) { setErr((e as ApiError).message); } });

  if (already) return <Link href={`/plans/${planId}`} className="flex items-center justify-center h-12 rounded-xl bg-brand-btn text-fg t-button1">You&apos;re in — open the plan</Link>;
  return (
    <div className="flex flex-col gap-3">
      {!guest && meName ? (
        <>
          <Button full disabled={pending} onClick={() => go({})}>Join as {meName}</Button>
          <button className="t-button2 text-fg-3" onClick={() => setGuest(true)}>Not {meName.split(" ")[0]}? Join as someone else</button>
        </>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); go({ as_guest: true, guest_name: name }); }}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-12 rounded-xl bg-surface border border-line-2 px-4 t-body1 text-fg placeholder:text-fg-3 focus:border-brand outline-none" />
          <Button type="submit" full disabled={pending || name.trim().length < 2}>Join the plan</Button>
          {meName && <button type="button" className="t-button2 text-fg-3" onClick={() => setGuest(false)}>Back</button>}
        </form>
      )}
      {err && <p className="t-body2 text-error text-center">{err}</p>}
    </div>
  );
}
