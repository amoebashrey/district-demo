"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Check, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Initials } from "@/components/screen";
import { PlanShell, Section, PlanUnavailable, Loading, usePlan } from "@/components/plans/common";
import { ShareRow } from "@/components/plans/share";
import { friendsOf, store } from "@/lib/store/store";
import { inviteContacts } from "@/lib/services/invite";
import { addGuestInvitee, openVoting } from "@/lib/services/plan";
import { mutate } from "@/lib/client/plans-store";
import { day, inr, time } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Screen 2 — Who's coming. Crew is chosen, never presumed. Share-a-link is the hero. */
export function CrewClient({ id }: { id: string }) {
  const router = useRouter();
  const { view, ready, meId } = usePlan(id);
  const [sel, setSel] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  if (!ready) return <Loading />;
  if (!view || !meId) return <PlanUnavailable />;
  if (!view.is_member) return <PlanUnavailable />;
  const { plan, locked } = view;
  const friends = friendsOf(meId).filter((f) => !f.is_guest).map((f) => ({ id: f.id, name: f.name, area: f.home_area ?? "" }));
  const already = view.members.filter((m) => m.user_id !== meId).map((m) => m.user_id);
  const usual = store.edges.filter((e) => e.user_id === meId && e.source === "co-attendance").map((e) => e.friend_id).filter((fid) => friends.some((f) => f.id === fid) && !already.includes(fid)).slice(0, 4);
  const title = locked?.title ?? `${plan.vibe} night`;
  const count = sel.length + already.length;
  const canSend = count > 0 || shared;

  const add = () => { try { const m = mutate(id, () => addGuestInvitee(id, meId, name)); setName(""); toast.success(`Added ${m.display_name}`); } catch (e) { toast.error((e as Error).message); } };
  const send = () => {
    try {
      mutate(id, () => { if (sel.length) inviteContacts(id, meId, sel); if (plan.mode === "open" && plan.status === "draft") openVoting(id, meId); });
      toast.success(count ? `Invite sent to ${count} — one message each, no spam` : "Plan is live — share the link");
      router.push(`/plans/${id}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <PlanShell title="Who's coming?" subtitle={count ? `${count} picked` : "Pick people or share a link"} back={plan.mode === "open" ? "/plans/new" : "/plans/starter"} bottom={
      <>
        <p className="mb-2 text-center text-xs text-muted-foreground">{canSend ? "They get one message. No spam. Nothing is booked until enough people are in." : "Pick at least one person, or share the link, to continue."}</p>
        <Button size="lg" className="h-12 w-full rounded-full text-base" disabled={!canSend} onClick={send}>{count ? "Send invite" : plan.mode === "open" ? "Open the vote" : "Continue"}</Button>
      </>
    }>
      {/* pinned item — "You're planning: …" */}
      {locked && (
        <Section className="flex items-center gap-3 border border-brand/30">
          <div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-wide text-brand-soft">You&apos;re planning</p><p className="truncate font-semibold capitalize">{locked.title}</p><p className="text-xs text-muted-foreground">{day(locked.components[0].starts_at)} · {time(locked.components[0].starts_at)} · {inr(locked.est_cost_per_head)} a head</p></div>
        </Section>
      )}
      {!locked && <Section><p className="text-xs font-medium uppercase tracking-wide text-brand-soft">You&apos;re planning</p><p className="font-semibold capitalize">{plan.vibe} night · crew votes on 2–3 options</p><p className="text-xs text-muted-foreground">{plan.city} · locks when {plan.quorum} are in</p></Section>}

      {/* hero: share a link */}
      <Section>
        <p className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4 text-brand-soft" /> Share a link — anyone can join, no app needed</p>
        <p className="mt-1 text-xs text-muted-foreground">They tap &ldquo;I&apos;m in&rdquo; on the web. Free to say yes; they pay their share only once it&apos;s locked.</p>
        <div className="mt-3"><ShareRow planId={id} title={title} perHead={locked?.est_cost_per_head} onShared={() => setShared(true)} /></div>
        {shared && <p className="mt-2 flex items-center gap-1 text-xs text-[#22c55e]"><Check className="size-3" /> Link shared — you can continue</p>}
      </Section>

      {/* usual crew — only with history, editable, never pre-selected */}
      {usual.length >= 2 && (
        <Section className="border border-brand/30 bg-brand/8">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/25 text-brand-hot"><Sparkles className="size-4" /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Your usual crew</p><p className="mt-0.5 text-xs text-muted-foreground">People you&apos;ve gone out with before. Tap to include — nothing is selected for you.</p></div>
          </div>
          <ul className="mt-3 space-y-1">
            {usual.map((fid) => { const f = friends.find((x) => x.id === fid)!; const on = sel.includes(fid); return (
              <li key={fid}><label className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2", on && "bg-white/6")}><Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={f.name} /></AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm">{f.name}</span><span className="text-xs text-muted-foreground">{on ? "Included" : "Tap to include"}</span></span><Checkbox checked={on} onCheckedChange={(v) => setSel((s) => (v ? [...s, fid] : s.filter((x) => x !== fid)))} /></label></li>); })}
          </ul>
        </Section>
      )}

      {/* add by name — no forced contact sync */}
      <Section className="space-y-2">
        <p className="text-sm font-semibold">Add someone by name</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) add(); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohan" className="rounded-full bg-black/40" />
          <Button type="submit" variant="outline" className="rounded-full border-white/20" disabled={name.trim().length < 2}><Plus /> Add</Button>
        </form>
        <p className="text-xs text-muted-foreground">No contact sync needed. Want it anyway? <button className="underline" onClick={() => toast("Contact sync is optional and not part of this demo")}>Sync contacts</button></p>
      </Section>

      {/* everyone else from contacts */}
      {friends.filter((f) => !usual.includes(f.id)).length > 0 && (
        <Section className="p-0">
          <p className="px-4 pt-4 text-sm font-semibold">From your contacts</p>
          <ul className="mt-2 divide-y divide-white/6">
            {friends.filter((f) => !usual.includes(f.id)).map((f) => { const on = sel.includes(f.id); const dis = already.includes(f.id); return (
              <li key={f.id}><label className={cn("flex items-center gap-3 px-4 py-3", dis ? "opacity-50" : "cursor-pointer", on && "bg-white/4")}><Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={f.name} /></AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm">{f.name}</span><span className="text-xs text-muted-foreground">{dis ? "Already invited" : f.area}</span></span><Checkbox checked={on || dis} disabled={dis} onCheckedChange={(v) => setSel((s) => (v ? [...s, f.id] : s.filter((x) => x !== f.id)))} /></label></li>); })}
          </ul>
        </Section>
      )}
      {already.length > 0 && <div className="flex flex-wrap gap-1.5">{view.members.filter((m) => m.user_id !== meId).map((m) => <Badge key={m.id} variant="secondary" className="rounded-full">{m.display_name}</Badge>)}</div>}
      <p className="text-center text-xs text-muted-foreground"><Link href={`/plans/${id}`} className="underline">Skip for now</Link> — you can invite from the plan page too.</p>
      <div className="h-28" />
    </PlanShell>
  );
}
