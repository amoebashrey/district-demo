import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ChevronRight, CalendarDays } from "lucide-react";
import { currentUser } from "@/lib/session";
import { plansFor, joinedMembers, membersOf, store, voteKey } from "@/lib/store/store";
import { getPlan } from "@/lib/services/plan";
import { Screen, Initials } from "@/components/screen";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { dateRange, firstName, vibeLabel } from "@/lib/format";
import { LiveRefresh } from "@/components/client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const plans = plansFor(me.id).map((p) => getPlan(p.id)).filter((p) => !["cancelled", "completed"].includes(p.status));
  const needsMe = (planId: string, status: string) => status === "voting" && !store.votes.has(voteKey(planId, me.id));
  return (
    <Screen bottom={<Button asChild size="lg" className="w-full"><Link href="/plans/new"><Plus /> Start a plan</Link></Button>}>
      <LiveRefresh every={5000} />
      <div className="flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">District Plans</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Hey {firstName(me.name)}, who&apos;s free?</h1>
        </div>
        <Button variant="outline" size="sm" asChild><Link href="/switch"><Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={me.name} /></AvatarFallback></Avatar>Switch</Link></Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-sm font-medium text-muted-foreground">Your plans</h2>{plans.length > 0 && <span className="text-xs text-muted-foreground">{plans.length}</span>}</div>
        {plans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><CalendarDays className="size-5" /></div>
              <p className="font-medium">Nothing on yet</p>
              <p className="mt-1 max-w-[26ch] text-sm text-muted-foreground">Start a plan, share the link, and let the crew vote. It locks itself.</p>
            </CardContent>
          </Card>
        ) : plans.map((p) => {
          const joined = joinedMembers(p.id); const all = membersOf(p.id).filter((m) => m.rsvp_status !== "left");
          const yourMove = needsMe(p.id, p.status);
          return (
            <Link key={p.id} href={`/plans/${p.id}`} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className={yourMove ? "border-primary/40" : ""}>
                <CardContent className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2"><p className="truncate font-medium">{vibeLabel[p.vibe] ?? p.vibe} night</p><StatusBadge status={p.status} /></div>
                    <p className="text-sm text-muted-foreground">{p.city} · {dateRange(p.date_start, p.date_end)} · {p.budget_band}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">{all.slice(0, 5).map((m) => <Avatar key={m.id} size="sm" className="ring-2 ring-card"><AvatarFallback className="text-[10px]"><Initials name={m.display_name} /></AvatarFallback></Avatar>)}</div>
                      <span className="text-xs text-muted-foreground">{joined.length} in{all.length > joined.length ? ` · ${all.length - joined.length} invited` : ""}</span>
                      {yourMove && <Badge variant="secondary" className="ml-auto text-primary">Your vote</Badge>}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
      <p className="text-center text-xs text-muted-foreground">Prototype · in-memory demo data · everyone here is synthetic</p>
    </Screen>
  );
}
