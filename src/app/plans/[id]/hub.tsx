"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Share2, UserPlus, Lock, MoreHorizontal, Clock, Crown, Copy, RefreshCw, Flag, LogOut, XCircle, MessageCircle, MapPin, CalendarPlus, IndianRupee, Repeat, Ticket } from "lucide-react";
import { toast } from "sonner";
import type { PlanView } from "@/lib/services/plan";
import { Initials } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EntryPoint } from "@/components/highlight";
import { ActionButton, api, ApiError } from "@/components/client";
import { bandLabel, countdown, dateRange, day, inr, time, vibeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = { view: PlanView; meId: string; shareUrl: string; friends: { id: string; name: string; area: string }[]; names: Record<string, string>; openInvite?: boolean };
const kindLabel: Record<string, string> = { event: "Event", dining: "Table", movie: "Movie", ride: "Ride" };

export function PlanHub({ view, meId, shareUrl, friends, names, openInvite }: Props) {
  const { plan, members, suggestions, joined_count, votes_needed, my_vote, my_role, locked, splits, paid_count, my_split } = view;
  const router = useRouter();
  const isOrganiser = my_role === "organiser";
  const me = members.find((m) => m.user_id === meId);
  const invited = members.filter((m) => m.rsvp_status === "invited");
  const joined = members.filter((m) => m.rsvp_status === "joined");
  const anchored = plan.mode === "anchored";
  const money = plan.status === "locked" || plan.status === "booked";
  const canInvite = ["draft", "voting"].includes(plan.status) || (money && plan.status !== "cancelled");
  const leader = suggestions.reduce((a, s) => (s.votes.length > (a?.votes.length ?? 0) ? s : a), suggestions[0]);
  const totalVotes = suggestions.reduce((n, s) => n + s.votes.length, 0);
  const paidBy = (uid: string) => splits.find((s) => s.user_id === uid)?.status;
  const title = anchored && locked ? locked.title : `${vibeLabel[plan.vibe] ?? plan.vibe} night`;
  const when = locked?.components[0]?.starts_at;
  const where = locked?.components[0]?.area ?? plan.city;
  const invite = <InviteDrawer planId={plan.id} shareUrl={shareUrl} friends={friends} onInvited={() => router.refresh()} perHead={locked?.est_cost_per_head} title={title} defaultOpen={openInvite} />;

  return (
    <>
      <LockDialog planId={plan.id} active={plan.status === "locked" && !!locked && !anchored} title={locked?.title ?? ""} subtitle={locked ? `${joined.length} going · ${inr(locked.est_cost_per_head)} a head` : ""} />

      {/* header */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-soft">{plan.city}{anchored ? " · Going together" : ""}</p>
        <h2 className="text-2xl font-semibold tracking-tight capitalize">{title}</h2>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{when ? `${day(when)} · ${time(when)}` : dateRange(plan.date_start, plan.date_end)}</Badge>
          {locked ? <Badge variant="secondary">{inr(locked.est_cost_per_head)} a head</Badge> : <Badge variant="secondary">{bandLabel[plan.budget_band]}</Badge>}
          {plan.status === "voting" && <Badge variant="outline" className="gap-1"><Clock className="size-3" /> closes in {countdown(plan.expires_at)}</Badge>}
        </div>
      </div>

      {/* ---------- BOOKED: the shared plan card everyone gets ---------- */}
      {plan.status === "booked" && locked && (
        <Card className="border-brand/50 bg-brand/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Ticket className="size-4 text-brand-soft" /> You&apos;re all set</CardTitle>
            <CardDescription>{paid_count} paid · {joined.length} in the plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1.5">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-14 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="text-muted-foreground">{kindLabel[c.kind]} · </span>{c.title}<span className="block text-xs text-muted-foreground">{c.subtitle}</span></span></li>)}</ul>
            <div className="flex flex-wrap gap-1.5 pt-1">{joined.map((m) => <Badge key={m.id} variant={paidBy(m.user_id) === "captured" ? "default" : "outline"} className="gap-1">{paidBy(m.user_id) === "captured" && <Check className="size-3" />}{m.user_id === meId ? "You" : m.display_name.split(" ")[0]}</Badge>)}</div>
            {view.bookings[0]?.provider_ref && <p className="text-xs text-muted-foreground">Booking ref <span className="font-mono">{view.bookings[0].provider_ref}</span></p>}
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="outline" size="sm" asChild><a href={`https://www.google.com/maps/search/${encodeURIComponent(`${locked.components[0].title} ${where}`)}`} target="_blank" rel="noreferrer"><MapPin /> Directions</a></Button>
            <Button variant="outline" size="sm" onClick={() => toast("Added to calendar")}><CalendarPlus /> Calendar</Button>
          </CardFooter>
        </Card>
      )}

      {/* ---------- LOCKED (open mode) banner ---------- */}
      {plan.status === "locked" && locked && !anchored && (
        <Card className="border-brand/40 bg-brand/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize"><Lock className="size-4 text-brand-soft" /> {locked.title}</CardTitle>
            <CardDescription>Locked · {joined.length} going · pay your share to book</CardDescription>
          </CardHeader>
          <CardContent><ul className="space-y-1.5 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-14 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="text-muted-foreground">{kindLabel[c.kind]} · </span>{c.title}</span></li>)}</ul></CardContent>
        </Card>
      )}
      {plan.status === "locked" && locked && anchored && (
        <Card>
          <CardHeader><CardTitle className="text-base">The plan</CardTitle><CardDescription>Friends join from the link and pay their share. It books itself once everyone&apos;s paid.</CardDescription></CardHeader>
          <CardContent><ul className="space-y-1.5 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-14 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{c.subtitle}</span></span></li>)}</ul></CardContent>
        </Card>
      )}
      {plan.booking_failed_reason && plan.status === "locked" && (
        <Card className="border-destructive/40"><CardHeader><CardTitle className="text-base">{plan.booking_failed_reason}</CardTitle><CardDescription>Everyone&apos;s share was refunded automatically. Pick another night or try again later.</CardDescription></CardHeader></Card>
      )}
      {plan.status === "expired" && (
        <Card className="border-warning/40">
          <CardHeader><CardTitle>No majority before the window closed</CardTitle><CardDescription>Happens. Re-open for 24 hours and nudge the crew.</CardDescription></CardHeader>
          {isOrganiser && <CardFooter><ActionButton url={`/api/plans/${plan.id}/reopen`} size="sm"><RefreshCw /> Re-open voting</ActionButton></CardFooter>}
        </Card>
      )}
      {plan.status === "cancelled" && <Card className="border-destructive/40"><CardHeader><CardTitle>Plan cancelled</CardTitle></CardHeader></Card>}

      {/* ---------- SPLITPAY: your share + who's paid ---------- */}
      {money && locked && (
        <Card className={cn(my_split?.status !== "captured" && "border-brand/40")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><IndianRupee className="size-4 text-brand-soft" /> Splitpay</CardTitle>
            <CardDescription>{paid_count} of {joined.length} paid · {inr(locked.est_cost_per_head)} each{plan.status === "locked" ? " · books when everyone has paid" : ""}</CardDescription>
            <CardAction className="text-right"><p className="font-semibold tabular-nums">{inr(my_split?.amount ?? locked.est_cost_per_head)}</p><p className="text-xs text-muted-foreground">your share</p></CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={joined.length ? Math.round((paid_count / joined.length) * 100) : 0} className="h-1" />
            <ul className="divide-y rounded-md border">
              {joined.map((m) => { const st = paidBy(m.user_id); return (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={m.display_name} /></AvatarFallback></Avatar>
                  <span className="min-w-0 flex-1 truncate">{m.user_id === meId ? "You" : m.display_name}{m.role === "organiser" && <span className="text-muted-foreground"> · host</span>}</span>
                  {st === "captured" ? <Badge className="gap-1"><Check className="size-3" /> Paid</Badge> : st === "failed" ? <Badge variant="destructive">Failed</Badge> : <Badge variant="outline">Pending</Badge>}
                </li>); })}
              {invited.map((m) => <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm opacity-60"><Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={m.display_name} /></AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate">{m.display_name}</span><Badge variant="outline">Invited</Badge></li>)}
            </ul>
            {my_split?.status === "failed" && <p className="text-xs text-destructive">{my_split.failure_reason}. Nobody else was affected — try again.</p>}
          </CardContent>
          <CardFooter className="gap-2">
            {my_split?.status === "captured" ? (
              <Badge variant="secondary" className="gap-1 py-1"><Check className="size-3" /> You&apos;ve paid {inr(my_split.amount)}</Badge>
            ) : me?.rsvp_status === "joined" ? (
              <ActionButton url={`/api/plans/${plan.id}/pay`} className="flex-1" onDone={(r) => toast.success((r as { just_booked?: boolean }).just_booked ? "Paid — and the plan is booked" : "Paid your share")}>Pay {inr(my_split?.amount ?? locked.est_cost_per_head)} via Splitpay</ActionButton>
            ) : null}
            {isOrganiser && plan.status === "locked" && paid_count >= 2 && paid_count < joined.length && (
              <ActionButton url={`/api/plans/${plan.id}/book`} variant="outline" size="sm" onDone={() => toast.success("Booked for everyone who paid")}>Book for {paid_count} now</ActionButton>
            )}
          </CardFooter>
        </Card>
      )}

      {/* ---------- EP5: after Splitpay, plan the next one ---------- */}
      {plan.status === "booked" && (
        <EntryPoint n={5} block>
          <Card className="w-full border-brand/20 bg-brand/5">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/20"><Repeat className="size-5 text-brand-soft" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Loved it? Plan the next one</p><p className="mt-0.5 text-xs text-muted-foreground">Same crew, next weekend, one tap.</p></div>
              <ReplanButton planId={plan.id} />
            </CardContent>
          </Card>
        </EntryPoint>
      )}

      {/* pending invite for me */}
      {me?.rsvp_status === "invited" && plan.status !== "cancelled" && (
        <Card className="border-brand/40 bg-brand/5">
          <CardHeader><CardTitle>{names[plan.creator_id]?.split(" ")[0] ?? "Your friend"} invited you</CardTitle><CardDescription>{money ? "Say yes, then pay your share via Splitpay." : "Say yes and you're in. Voting below counts as yes too."}</CardDescription></CardHeader>
          <CardFooter className="gap-2">
            <ActionButton url={`/api/plans/${plan.id}/respond`} body={{ answer: "accept" }} size="sm">I&apos;m in</ActionButton>
            <ActionButton url={`/api/plans/${plan.id}/respond`} body={{ answer: "decline" }} size="sm" variant="ghost">Can&apos;t make it</ActionButton>
          </CardFooter>
        </Card>
      )}

      {/* crew */}
      <Card>
        <CardHeader>
          <CardTitle>Crew</CardTitle>
          <CardDescription>{joined.length} in{invited.length ? ` · ${invited.length} invited` : ""}{!money && plan.quorum > joined.length ? ` · need ${plan.quorum - joined.length} more to lock` : ""}</CardDescription>
          {canInvite && <CardAction>{invite}</CardAction>}
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-4 gap-x-2 gap-y-3">
            {members.map((m) => (
              <li key={m.id} className="flex flex-col items-center gap-1 text-center">
                <span className="relative">
                  <Avatar size="lg" className={cn(m.rsvp_status !== "joined" && "opacity-50 ring-1 ring-dashed ring-border")}><AvatarFallback><Initials name={m.display_name} /></AvatarFallback></Avatar>
                  {m.role === "organiser" && <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-card text-brand-soft ring-1 ring-border"><Crown className="size-3" /></span>}
                  {money && paidBy(m.user_id) === "captured" && m.role !== "organiser" && <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-card"><Check className="size-3" /></span>}
                </span>
                <span className="w-full truncate text-xs">{m.user_id === meId ? "You" : m.display_name.split(" ")[0]}</span>
                {m.rsvp_status === "invited" && <span className="-mt-1 text-[11px] text-muted-foreground">invited</span>}
              </li>
            ))}
            {canInvite && (
              <li className="flex flex-col items-center gap-1 text-center">
                <InviteDrawer planId={plan.id} shareUrl={shareUrl} friends={friends} onInvited={() => router.refresh()} perHead={locked?.est_cost_per_head} title={title} trigger={<button aria-label="Invite" className="grid size-10 place-items-center rounded-full border border-dashed text-muted-foreground transition-colors hover:border-brand hover:text-brand-soft"><UserPlus className="size-4" /></button>} />
                <span className="text-xs text-muted-foreground">Invite</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* ---------- OPEN MODE: options + voting (the optional "deciding" step) ---------- */}
      {!anchored && !money && (
        <section className="space-y-3">
          {plan.status === "draft" ? (
            <Card>
              <CardHeader><CardTitle>{isOrganiser ? "Two steps to go" : "Waiting for the host"}</CardTitle><CardDescription>{isOrganiser ? "District proposes 2–3 nights that fit the window and budget once you open voting." : "Options appear once voting opens."}</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                <Step done={members.length > 1} label="Invite the crew" hint={members.length > 1 ? `${members.length - 1} invited` : "Share the link or pick from contacts"} />
                <Step done={false} label="Open voting" hint="Everyone picks a night in one tap" />
              </CardContent>
              {isOrganiser && <CardFooter><ActionButton url={`/api/plans/${plan.id}/open`} className="w-full">Open voting</ActionButton></CardFooter>}
            </Card>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-sm font-medium">{plan.status === "voting" ? "Pick a night" : "Options"}</h3>
                  {plan.status === "voting" && <p className="text-xs text-muted-foreground">{leader && leader.votes.length > 0 ? `${leader.votes.length} of ${votes_needed} needed on the leader` : `${votes_needed} votes on one option locks it`}{totalVotes > 0 ? ` · ${totalVotes} of ${Math.max(joined_count, 1)} voted` : ""}</p>}
                </div>
                {suggestions.length > 0 && <span className="text-xs text-muted-foreground">{suggestions[0]?.rationale_source === "llm" ? "curated by AI" : "rules-based"}</span>}
              </div>
              {suggestions.map((s) => {
                const mine = my_vote === s.id; const isLeader = plan.status === "voting" && leader?.id === s.id && s.votes.length > 0;
                const pct = Math.min(100, Math.round((s.votes.length / Math.max(votes_needed, 1)) * 100));
                return (
                  <Card key={s.id} className={cn("transition-colors", mine && "border-brand/40", !s.is_available && "opacity-60")}>
                    <CardHeader>
                      <CardTitle className="capitalize">{s.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">{day(s.components[0].starts_at)}{isLeader && <Badge variant="secondary" className="text-brand-soft">Leading</Badge>}</CardDescription>
                      <CardAction className="text-right"><p className="font-semibold tabular-nums">{inr(s.est_cost_per_head)}</p><p className="text-xs text-muted-foreground">a head</p></CardAction>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ul className="space-y-2">{s.components.map((c) => <li key={c.ref} className="flex gap-3 text-sm"><span className="w-14 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span className="min-w-0"><span className="block truncate font-medium">{c.title}</span>{c.subtitle && <span className="block truncate text-xs text-muted-foreground">{c.subtitle}</span>}</span></li>)}</ul>
                      <p className="border-l-2 border-brand/40 pl-3 text-sm text-muted-foreground">{s.rationale}</p>
                      {plan.status === "voting" && <Progress value={pct} className="h-1" />}
                    </CardContent>
                    <CardFooter className="justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {s.votes.length > 0 ? <div className="flex -space-x-2">{s.votes.map((u) => <Avatar key={u} size="sm" className="ring-2 ring-card"><AvatarFallback className="text-[10px]"><Initials name={names[u] ?? "?"} /></AvatarFallback></Avatar>)}</div> : <span className="text-xs text-muted-foreground">No votes yet</span>}
                        {s.votes.length > 0 && <span className="text-xs text-muted-foreground tabular-nums">{s.votes.length}/{votes_needed}</span>}
                      </div>
                      {plan.status === "voting" && (!s.is_available ? <Badge variant="destructive">Sold out</Badge> :
                        <ActionButton url={`/api/plans/${plan.id}/vote`} body={{ suggestion_id: s.id }} size="sm" variant={mine ? "secondary" : "default"} onDone={(r) => { if ((r as { just_locked?: boolean }).just_locked) toast.success("Locked in"); }}>{mine ? <><Check /> Voted</> : "I'm in"}</ActionButton>)}
                    </CardFooter>
                  </Card>
                );
              })}
              {plan.status === "voting" && <Button variant="ghost" size="sm" className="w-full text-muted-foreground" asChild><Link href="/events">None of these — browse instead</Link></Button>}
            </>
          )}
        </section>
      )}
    </>
  );
}

function Step({ done, label, hint }: { done: boolean; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs", done ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>{done ? <Check className="size-3.5" /> : ""}</span>
      <div className="min-w-0"><p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{label}</p><p className="truncate text-xs text-muted-foreground">{hint}</p></div>
    </div>
  );
}

export function ReplanButton({ planId, variant = "default" }: { planId: string; variant?: "default" | "outline" }) {
  const router = useRouter();
  return <ActionButton url={`/api/plans/${planId}/replan`} size="sm" variant={variant} onDone={(r) => router.push(`/plans/${(r as { plan: { id: string } }).plan.id}?from=ep5`)}>Re-plan</ActionButton>;
}

/** Destructive / rare actions live in an overflow menu so they can't be tapped by accident. */
export function PlanMenu({ planId, status, isOrganiser }: { planId: string; status: string; isOrganiser: boolean }) {
  const router = useRouter();
  if (["cancelled", "completed"].includes(status)) return null;
  const run = async (url: string, body?: unknown, msg?: string) => { try { await api(url, body); if (msg) toast(msg); router.push("/profile"); router.refresh(); } catch (e) { toast.error((e as ApiError).message); } };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isOrganiser ? (
          <DropdownMenuItem variant="destructive" onClick={() => run(`/api/plans/${planId}/cancel`, undefined, "Plan cancelled")}><XCircle /> Cancel plan</DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => run(`/api/plans/${planId}/leave`, undefined, "You left the plan")}><LogOut /> Leave plan</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => run("/api/optout", { reason: "spam_report", plan_id: planId }, "You won't get invites again")}><Flag /> Report as spam</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Shown once per plan per browser when an open plan flips to locked. */
function LockDialog({ planId, active, title, subtitle }: { planId: string; active: boolean; title: string; subtitle: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!active) return;
    const k = `lock-seen:${planId}`;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch { /* private mode */ }
    const t = setTimeout(() => setOpen(true), 0);
    return () => clearTimeout(t);
  }, [active, planId]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="mb-2 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><Lock className="size-5" /></div>
          <DialogTitle className="capitalize">Locked in</DialogTitle>
          <DialogDescription className="capitalize">{title}</DialogDescription>
          <DialogDescription>{subtitle} · pay your share to book</DialogDescription>
        </DialogHeader>
        <Button onClick={() => setOpen(false)}>Nice</Button>
      </DialogContent>
    </Dialog>
  );
}

function InviteDrawer({ planId, shareUrl, friends, onInvited, trigger, perHead, title, defaultOpen }: { planId: string; shareUrl: string; friends: { id: string; name: string; area: string }[]; onInvited: () => void; trigger?: React.ReactNode; perHead?: number; title: string; defaultOpen?: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const msg = `Join me for ${title}${perHead ? ` — ${inr(perHead)} a head, pay your share in one tap` : ""}. No app needed:\n${shareUrl}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Join my plan on District", text: msg, url: shareUrl }); return; } catch { /* dismissed */ } }
    await navigator.clipboard.writeText(shareUrl); toast.success("Link copied");
  };
  return (
    <Drawer defaultOpen={defaultOpen}>
      <DrawerTrigger asChild>{trigger ?? <Button size="sm" variant="outline"><UserPlus /> Invite</Button>}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle>Invite the crew</DrawerTitle>
            <DrawerDescription>Friends tap the link, join, and pay their share — no app download.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5 px-4">
            <div className="space-y-2">
              <Button className="w-full bg-[#25D366] text-white hover:bg-[#1ebe5b]" asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> Share on WhatsApp</a></Button>
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                <Button variant="outline" size="icon" aria-label="Copy" onClick={async () => { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); }}><Copy /></Button>
                <Button variant="outline" size="icon" aria-label="Share" onClick={share}><Share2 /></Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-baseline justify-between"><Label>From your contacts</Label>{sel.length > 0 && <button className="text-xs text-muted-foreground" onClick={() => setSel([])}>Clear</button>}</div>
              {friends.length === 0 ? <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Everyone in your contacts is already here. Use the link for others.</p> : (
                <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
                  {friends.map((f) => { const on = sel.includes(f.id); return (
                    <li key={f.id}>
                      <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50", on && "bg-brand/5")}>
                        <Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={f.name} /></AvatarFallback></Avatar>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm">{f.name}</span><span className="text-xs text-muted-foreground">{f.area}</span></span>
                        <Checkbox checked={on} onCheckedChange={(v) => setSel((s) => (v ? [...s, f.id] : s.filter((x) => x !== f.id)))} />
                      </label>
                    </li>); })}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">We only reach people you pick. Anyone can opt out and we stop instantly.</p>
            </div>
          </div>
          <DrawerFooter className="flex-row gap-2">
            <DrawerClose asChild><Button variant="outline" className="flex-1">Done</Button></DrawerClose>
            <Button className="flex-1" disabled={sel.length === 0 || busy} onClick={async () => { setBusy(true); try { const r = await api<{ invited: unknown[] }>(`/api/plans/${planId}/invite`, { friend_ids: sel }); setSel([]); toast.success(r.invited.length ? `Invited ${r.invited.length}` : "No one new to invite"); onInvited(); } catch (e) { toast.error((e as ApiError).message); } finally { setBusy(false); } }}>
              Invite{sel.length ? ` ${sel.length}` : ""}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
