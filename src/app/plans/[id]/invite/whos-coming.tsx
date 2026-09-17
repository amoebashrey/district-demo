"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Copy, Plus, Check, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Initials } from "@/components/screen";
import { api, ApiError } from "@/components/client";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type F = { id: string; name: string; area: string };
type Props = { planId: string; mode: "open" | "anchored"; title: string; perHead?: number; friends: F[]; usual: string[]; already: string[]; shareUrl: string };

/** Who's coming? — pick friends, add by name, or share a link. Usual crew is a labelled suggestion the user confirms. */
export function WhosComing({ planId, mode, title, perHead, friends, usual, already, shareUrl }: Props) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const usualNames = usual.map((id) => friends.find((f) => f.id === id)?.name.split(" ")[0]).filter(Boolean);
  const usualApplied = usual.length > 0 && usual.every((id) => sel.includes(id));
  const msg = `Join me for ${title}${perHead ? ` — ${inr(perHead)} a head, tap "I'm in" to hold your seat` : ""}. No app needed:\n${shareUrl}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const count = sel.length + added.length + already.length;

  const addByName = () => start(async () => {
    try { const r = await api<{ member: { display_name: string } }>(`/api/plans/${planId}/members`, { name }); setAdded((a) => [...a, r.member.display_name]); setName(""); toast.success(`Added ${r.member.display_name}`); }
    catch (e) { toast.error((e as ApiError).message); }
  });
  const send = () => start(async () => {
    try {
      if (sel.length) await api(`/api/plans/${planId}/invite`, { friend_ids: sel });
      if (mode === "open") await api(`/api/plans/${planId}/open`);
      toast.success(count ? `Invite sent to ${count}` : "Plan created — share the link");
      router.push(`/plans/${planId}?from=invite`);
    } catch (e) { toast.error((e as ApiError).message); }
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 flex flex-col pb-44">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-background/90 px-4 backdrop-blur">
        <Link href={mode === "open" ? "/plans/starter" : "/movies"} aria-label="Back"><ArrowLeft className="size-5" /></Link>
        <div><p className="text-lg font-semibold leading-tight">Who&apos;s coming?</p><p className="truncate text-xs text-muted-foreground">{title}{perHead ? ` · ${inr(perHead)} a head` : ""}</p></div>
      </header>
      <div className="space-y-6 px-4 pt-2">
        {/* hero invite action */}
        <section className="rounded-2xl bg-[#141416] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4 text-brand-soft" /> Share a link with anyone</p>
          <p className="mt-1 text-xs text-muted-foreground">Friends tap the link and say &ldquo;I&apos;m in&rdquo; — no download, nothing to pay until the plan is confirmed.</p>
          <Button className="mt-3 w-full bg-[#25D366] text-black hover:bg-[#1ebe5b]" asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> Share on WhatsApp</a></Button>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="rounded-full bg-black/40 font-mono text-xs" />
            <Button variant="outline" size="icon" className="rounded-full border-white/20" aria-label="Copy link" onClick={async () => { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); }}><Copy /></Button>
          </div>
        </section>

        {/* usual crew — a suggestion, never silently applied */}
        {usual.length > 0 && (
          <section className="rounded-2xl border border-brand/30 bg-brand/8 p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/25 text-brand-hot"><Sparkles className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Suggestion: your usual crew</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{usualNames.join(", ")} — the people you go out with most. Nothing is selected until you say so.</p>
              </div>
              <Button size="sm" variant={usualApplied ? "secondary" : "outline"} className="rounded-full border-white/20" onClick={() => setSel((s) => (usualApplied ? s.filter((id) => !usual.includes(id)) : [...new Set([...s, ...usual])]))}>{usualApplied ? <><Check /> Added</> : "Use these"}</Button>
            </div>
          </section>
        )}

        {/* friend list */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between"><h2 className="text-sm font-semibold">From your contacts</h2>{sel.length > 0 && <button className="text-xs text-muted-foreground" onClick={() => setSel([])}>Clear</button>}</div>
          <ul className="divide-y divide-white/6 overflow-hidden rounded-2xl bg-[#141416]">
            {friends.map((f) => { const on = sel.includes(f.id); const dis = already.includes(f.id); return (
              <li key={f.id}>
                <label className={cn("flex items-center gap-3 px-4 py-3", dis ? "opacity-50" : "cursor-pointer", on && "bg-white/4")}>
                  <Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={f.name} /></AvatarFallback></Avatar>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm">{f.name}</span><span className="text-xs text-muted-foreground">{dis ? "Already invited" : f.area}</span></span>
                  {usual.includes(f.id) && !dis && <Badge variant="secondary" className="rounded-full text-[10px]">usual</Badge>}
                  <Checkbox checked={on || dis} disabled={dis} onCheckedChange={(v) => setSel((s) => (v ? [...s, f.id] : s.filter((x) => x !== f.id)))} />
                </label>
              </li>); })}
          </ul>
        </section>

        {/* add by name */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Add someone by name</h2>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) addByName(); }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohan" className="rounded-full bg-[#141416]" />
            <Button type="submit" variant="outline" className="rounded-full border-white/20" disabled={pending || name.trim().length < 2}><Plus /> Add</Button>
          </form>
          {added.length > 0 && <div className="flex flex-wrap gap-1.5">{added.map((n, i) => <Badge key={n + i} variant="secondary" className="rounded-full">{n}</Badge>)}</div>}
        </section>
      </div>

      {/* sticky primary CTA */}
      <div className="fixed inset-x-0 z-20" style={{ bottom: "var(--nav-h, 88px)" }}>
        <div className="mx-auto w-full max-w-md px-4 pb-2">
          <div className="rounded-3xl bg-[#141416]/95 p-3 shadow-[0_-12px_40px_-12px_rgba(0,0,0,.8)] backdrop-blur">
            <p className="mb-2 text-center text-xs text-muted-foreground">{count > 0 ? `${count} ${count === 1 ? "person" : "people"} will get a free one-tap "I'm in". Pay only once it's confirmed.` : "Pick a few people, or just share the link."}</p>
            <Button size="lg" className="h-12 w-full rounded-full text-base" disabled={pending} onClick={send}>{pending ? "Sending…" : count > 0 ? "Send invite" : mode === "open" ? "Open the vote" : "Continue"}</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
