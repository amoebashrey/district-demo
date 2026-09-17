import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, CalendarDays, RepeatIcon, Users } from "lucide-react";
import { currentUser } from "@/lib/session";
import { plansFor, joinedMembers, membersOf, store, voteKey } from "@/lib/store/store";
import { getPlan } from "@/lib/services/plan";
import { BottomNav } from "@/components/shell/nav";
import { TopBar } from "@/components/shell/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EntryPoint } from "@/components/highlight";
import { StatusBadge } from "@/components/status-badge";
import { Initials } from "@/components/screen";
import { dateRange, firstName, vibeLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await currentUser();
  if (!me) redirect("/switch");

  const allPlans = plansFor(me.id).map((p) => getPlan(p.id));
  const active = allPlans.filter((p) => !["cancelled", "completed", "expired"].includes(p.status));
  const past = allPlans.filter((p) => ["completed", "booked"].includes(p.status)).slice(0, 3);
  const lastCompleted = past[0];

  return (
    <div className="flex flex-col min-h-full">
      <TopBar city={me.city} name={me.name} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-28 space-y-6">

        {/* Profile header */}
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg"><Initials name={me.name} /></AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">{me.name}</p>
            <p className="text-sm text-muted-foreground">{me.city}{me.home_area ? ` · ${me.home_area}` : ""}</p>
          </div>
        </div>

        {/* EP5 — post-Splitpay "Loved it? Plan the next one" */}
        {lastCompleted && (
          <EntryPoint n={5} block>
            <Card className="border-primary/20 bg-primary/5 w-full">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/20">
                  <RepeatIcon className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">Loved it? Plan the next one</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Re-plan with your crew from {vibeLabel[lastCompleted.vibe] ?? lastCompleted.vibe} night
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/plans/new">Re-plan</Link>
                </Button>
              </CardContent>
            </Card>
          </EntryPoint>
        )}

        {/* EP6 — "Your Plans" */}
        <EntryPoint n={6} block>
          <section className="w-full space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarDays className="size-4 text-primary" /> Your Plans
              </h2>
              {active.length > 0 && (
                <Badge variant="secondary">{active.length} active</Badge>
              )}
            </div>

            {active.length === 0 && past.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-10 text-center">
                  <Users className="size-8 text-muted-foreground mb-3" />
                  <p className="font-medium">No plans yet</p>
                  <p className="mt-1 max-w-[26ch] text-sm text-muted-foreground">Start a plan, invite your crew, and let it lock itself.</p>
                  <Button size="sm" className="mt-4" asChild><Link href="/plans/new">Start a plan</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {[...active, ...past].map((p) => {
                  const joined = joinedMembers(p.id);
                  const all = membersOf(p.id).filter((m) => m.rsvp_status !== "left");
                  const myVote = store.votes.has(voteKey(p.id, me.id));
                  const yourMove = p.status === "voting" && !myVote;
                  return (
                    <Link key={p.id} href={`/plans/${p.id}`} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Card className={yourMove ? "border-primary/40" : ""}>
                        <CardContent className="flex items-center gap-3">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{vibeLabel[p.vibe] ?? p.vibe} night</p>
                              <StatusBadge status={p.status} />
                            </div>
                            <p className="text-sm text-muted-foreground">{p.city} · {dateRange(p.date_start, p.date_end)}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {all.slice(0, 4).map((m) => (
                                  <Avatar key={m.id} className="size-6 ring-2 ring-card">
                                    <AvatarFallback className="text-[9px]"><Initials name={m.display_name} /></AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">{joined.length} in</span>
                              {yourMove && <Badge variant="secondary" className="ml-auto text-primary text-xs">Your vote</Badge>}
                            </div>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}

            <Button variant="outline" className="w-full" asChild>
              <Link href="/plans/new">+ Start a new plan</Link>
            </Button>
          </section>
        </EntryPoint>
      </main>
      <BottomNav />
    </div>
  );
}
