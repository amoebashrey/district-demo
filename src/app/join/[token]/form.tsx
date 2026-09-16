"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/components/client";

export function JoinForm({ token, planId, meName, already }: { token: string; planId: string; meName?: string; already: boolean }) {
  const router = useRouter();
  const [guest, setGuest] = useState(!meName);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const go = (body: unknown) => start(async () => { try { await api(`/api/join/${token}`, body); router.push(`/plans/${planId}`); router.refresh(); } catch (e) { toast.error((e as ApiError).message); } });

  if (already) return <Button asChild size="lg" className="w-full"><Link href={`/plans/${planId}`}>You&apos;re in — open the plan</Link></Button>;
  return (
    <div className="space-y-3">
      {!guest && meName ? (
        <>
          <Button size="lg" className="w-full" disabled={pending} onClick={() => go({})}>Join as {meName}</Button>
          <Button variant="ghost" className="w-full" onClick={() => setGuest(true)}>Not {meName.split(" ")[0]}? Join as someone else</Button>
        </>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); go({ as_guest: true, guest_name: name }); }}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11" />
          <Button type="submit" size="lg" className="w-full" disabled={pending || name.trim().length < 2}>Join the plan</Button>
          {meName && <Button type="button" variant="ghost" className="w-full" onClick={() => setGuest(false)}>Back</Button>}
        </form>
      )}
    </div>
  );
}
