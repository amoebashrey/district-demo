"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Share2, UserPlus, Lock, MoreHorizontal, Clock, Crown, Copy, RefreshCw, Flag, LogOut, XCircle } from "lucide-react";
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
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ActionButton, api, ApiError } from "@/components/client";
import { bandLabel, countdown, dateRange, day, inr, time, vibeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = { view: PlanView; meId: string; shareUrl: string; friends: { id: string; name: string; area: string }[]; names: Record<string, string> };
const kindLabel: Record<string, string> = { event: "Event", dining: "Table", movie: "Movie", ride: "Ride" };

export function PlanHub({ view, meId, shareUrl, friends, names }: Props) {
  const { plan, members, suggestions, joined_count, votes_needed, my_vote, my_role, locked } = view;
  const router = useRouter();
  const isOrganiser = my_role === "organiser";
  const me = members.find((m) => m.user_id === meId);
  const invited = members.filter((m) => m.rsvp_status === "invited");
  const joined = members.filter((m) => m.rsvp_status === "joined");
  const canInvite = ["draft", "voting"].includes(plan.status);
  const leader = suggestions.reduce((a, s) => (s.votes.length > (a?.votes.length ?? 0) ? s : a), suggestions[0]);
  const totalVotes = suggestions.reduce((n, s) => n + s.votes.length, 0);

  return (
    <>
      <LockDialog planId={plan.id} active={plan.status === "locked" && !!locked} title={locked?.title ?? ""} subtitle={locked ? `${joined.length} going · ${inr(locked.est_cost_per_head)} a head` : ""} />

      {/* header */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{plan.city}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{vibeLabel[plan.vibe] ?? plan.vibe} night</h2>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{dateRange(plan.date_start, plan.date_end)}</Badge>
          <Badge variant="secondary">{bandLabel[plan.budget_band]}</Badge>
          {plan.status === "voting" && <Badge variant="outline" className="gap-1"><Clock className="size-3" /> closes in {countdown(plan.expires_at)}</Badge>}
        </div>
      </div>

      {/* state banners */}
      {plan.status === "locked" && locked && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize"><Lock className="size-4 text-primary" /> {locked.title}</CardTitle>
            <CardDescription>Locked · {joined.length} going · {inr(locked.est_cost_per_head)} a head</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-14 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="text-muted-foreground">{kindLabel[c.kind]} · </span>{c.title}</span></li>)}</ul>
            <p className="mt-3 text-xs text-muted-foreground">Booking and bill split arrive in Phase 4.</p>
          </CardContent>
        </Card>
      )}
      {plan.status === "expired" && (
        <Card className="border-warning/40">
          <CardHeader><CardTitle>No majority before the window closed</CardTitle><CardDescription>Happens. Re-open for 24 hours and nudge the crew.</CardDescription></CardHeader>
          {isOrganiser && <CardFooter><ActionButton url={`/api/plans/${plan.id}/reopen`} size="sm"><RefreshCw /> Re-open voting</ActionButton></CardFooter>}
        </Card>
      )}
      {plan.status === "cancelled" && <Card className="border-destructive/40"><CardHeader><CardTitle>Plan cancelled</CardTitle></CardHeader></Card>}

      {/* pending invite for me — highest priority action, so it sits above the crew */}
      {me?.rsvp_status === "invited" && plan.status !== "cancelled" && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader><CardTitle>{names[plan.creator_id]?.split(" ")[0] ?? "Your friend"} invited you</CardTitle><CardDescription>Say yes and you&apos;re in. Voting below counts as yes too.</CardDescription></CardHeader>
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
          <CardDescription>{joined.length} in{invited.length ? ` · ${invited.length} invited` : ""}{plan.quorum > joined.length ? ` · need ${plan.quorum - joined.length} more to lock` : ""}</CardDescription>
          {canInvite && <CardAction><InviteDrawer planId={plan.id} shareUrl={shareUrl} friends={friends} onInvited={() => router.refresh()} /></CardAction>}
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-4 gap-x-2 gap-y-3">
            {members.map((m) => (
              <li key={m.id} className="flex flex-col items-center gap-1 text-center">
                <span className="relative">
                  <Avatar size="lg" className={cn(m.rsvp_status !== "joined" && "opacity-50 ring-1 ring-dashed ring-border")}><AvatarFallback><Initials name={m.display_name} /></AvatarFallback></Avatar>
                  {m.role === "organiser" && <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-card text-primary ring-1 ring-border"><Crown className="size-3" /></span>}
                </span>
                <span className="w-full truncate text-xs">{m.user_id === meId ? "You" : m.display_name.split(" ")[0]}</span>
                {m.rsvp_status === "invited" && <span className="-mt-1 text-[11px] text-muted-foreground">invited</span>}
              </li>
            ))}
            {canInvite && (
              <li className="flex flex-col items-center gap-1 text-center">
                <InviteDrawer planId={plan.id} shareUrl={shareUrl} friends={friends} onInvited={() => router.refresh()} trigger={<button aria-label="Invite" className="grid size-10 place-items-center rounded-full border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"><UserPlus className="size-4" /></button>} />
                <span className="text-xs text-muted-foreground">Invite</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* options */}
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
              const mine = my_vote === s.id; const isLocked = plan.locked_suggestion_id === s.id; const isLeader = plan.status === "voting" && leader?.id === s.id && s.votes.length > 0;
              const pct = Math.min(100, Math.round((s.votes.length / Math.max(votes_needed, 1)) * 100));
              return (
                <Card key={s.id} className={cn("transition-colors", isLocked && "border-primary/50 bg-primary/5", mine && !isLocked && "border-primary/40", !s.is_available && "opacity-60")}>
                  <CardHeader>
                    <CardTitle className="capitalize">{s.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">{day(s.components[0].starts_at)}{isLeader && <Badge variant="secondary" className="text-primary">Leading</Badge>}</CardDescription>
                    <CardAction className="text-right"><p className="font-semibold tabular-nums">{inr(s.est_cost_per_head)}</p><p className="text-xs text-muted-foreground">a head</p></CardAction>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2">
                      {s.components.map((c) => (
                        <li key={c.ref} className="flex gap-3 text-sm">
                          <span className="w-14 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span>
                          <span className="min-w-0"><span className="block truncate font-medium">{c.title}</span>{c.subtitle && <span className="block truncate text-xs text-muted-foreground">{c.subtitle}</span>}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">{s.rationale}</p>
                    {plan.status === "voting" && <Progress value={pct} className="h-1" />}
                  </CardContent>
                  <CardFooter className="justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {s.votes.length > 0 ? <div className="flex -space-x-2">{s.votes.map((u) => <Avatar key={u} size="sm" className="ring-2 ring-card"><AvatarFallback className="text-[10px]"><Initials name={names[u] ?? "?"} /></AvatarFallback></Avatar>)}</div> : <span className="text-xs text-muted-foreground">No votes yet</span>}
                      {s.votes.length > 0 && <span className="text-xs text-muted-foreground tabular-nums">{s.votes.length}/{votes_needed}</span>}
                    </div>
                    {plan.status === "voting" ? (
                      !s.is_available ? <Badge variant="destructive">Sold out</Badge> :
                      <ActionButton url={`/api/plans/${plan.id}/vote`} body={{ suggestion_id: s.id }} size="sm" variant={mine ? "secondary" : "default"} onDone={(r) => { if ((r as { just_locked?: boolean }).just_locked) toast.success("Locked in"); }}>
                        {mine ? <><Check /> Voted</> : "I'm in"}
                      </ActionButton>
                    ) : isLocked ? <Badge className="gap-1"><Lock className="size-3" /> Locked</Badge> : null}
                  </CardFooter>
                </Card>
              );
            })}
            {plan.status === "voting" && <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => toast("Browse lands with curation in Phase 3")}>None of these — browse instead</Button>}
          </>
        )}
      </section>
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

/** Destructive / rare actions live in an overflow menu so they can't be tapped by accident. */
export function PlanMenu({ planId, status, isOrganiser }: { planId: string; status: string; isOrganiser: boolean }) {
  const router = useRouter();
  if (["cancelled", "completed"].includes(status)) return null;
  const run = async (url: string, body?: unknown, msg?: string) => { try { await api(url, body); if (msg) toast(msg); router.push("/"); router.refresh(); } catch (e) { toast.error((e as ApiError).message); } };
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

/** Shown once per plan per browser when the plan flips to locked. */
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
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <Button onClick={() => setOpen(false)}>Nice</Button>
      </DialogContent>
    </Dialog>
  );
}

function InviteDrawer({ planId, shareUrl, friends, onInvited, trigger }: { planId: string; shareUrl: string; friends: { id: string; name: string; area: string }[]; onInvited: () => void; trigger?: React.ReactNode }) {
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Join my plan on District", url: shareUrl }); return; } catch { /* dismissed */ } }
    await navigator.clipboard.writeText(shareUrl); toast.success("Link copied");
  };
  return (
    <Drawer>
      <DrawerTrigger asChild>{trigger ?? <Button size="sm" variant="outline"><UserPlus /> Invite</Button>}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle>Invite the crew</DrawerTitle>
            <DrawerDescription>Anyone with the link can join and vote — no account needed.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5 px-4">
            <div className="space-y-2">
              <Label>Share link</Label>
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                <Button variant="outline" size="icon" aria-label="Copy" onClick={async () => { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); }}><Copy /></Button>
                <Button onClick={share}><Share2 /> Share</Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between"><Label>From your contacts</Label>{sel.length > 0 && <button className="text-xs text-muted-foreground" onClick={() => setSel([])}>Clear</button>}</div>
              {friends.length === 0 ? <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Everyone in your contacts is already here. Use the link for others.</p> : (
                <ul className="max-h-56 divide-y overflow-y-auto rounded-md border">
                  {friends.map((f) => { const on = sel.includes(f.id); return (
                    <li key={f.id}>
                      <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50", on && "bg-primary/5")}>
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
