import { notFound } from "next/navigation";
import { currentUser } from "@/lib/session";
import { planForToken } from "@/lib/services/invite";
import { membersOf, joinedMembers, getUser, store } from "@/lib/store/store";
import { BottomNav } from "@/components/shell/nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Initials } from "@/components/screen";
import { bandLabel, dateRange, firstName, inr, vibeLabel } from "@/lib/format";
import { JoinForm } from "./form";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let plan; try { plan = planForToken(token); } catch { notFound(); }
  const me = await currentUser();
  const host = getUser(plan.creator_id);
  const joined = joinedMembers(plan.id); const all = membersOf(plan.id).filter((m) => m.rsvp_status !== "left");
  const already = !!me && all.some((m) => m.user_id === me.id && m.rsvp_status === "joined");
  const open = ["draft", "voting", "locked", "booked"].includes(plan.status);
  const money = ["locked", "booked"].includes(plan.status);
  const locked = plan.locked_suggestion_id ? store.suggestions.get(plan.locked_suggestion_id) : undefined;

  return (
    <div className="flex flex-col min-h-full">
      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 pt-6 pb-28">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">You&apos;re invited</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {locked ? <>{firstName(host?.name ?? "A friend")} is going to <span className="capitalize">{locked.title}</span></> : <>{firstName(host?.name ?? "A friend")} is planning a {(vibeLabel[plan.vibe] ?? plan.vibe).toLowerCase()} night</>}
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{plan.city}</CardTitle>
            <CardDescription>{dateRange(plan.date_start, plan.date_end)} · {locked ? `${inr(locked.est_cost_per_head)} a head` : `${bandLabel[plan.budget_band]} a head`}</CardDescription>
            <CardAction><StatusBadge status={plan.status} /></CardAction>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {all.slice(0, 5).map((m) => (
                <Avatar key={m.id} className="ring-2 ring-card">
                  <AvatarFallback><Initials name={m.display_name} /></AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {joined.length === 1 ? `${firstName(joined[0].display_name)} is in` : `${joined.length} people are in`}
              {all.length > joined.length ? `, ${all.length - joined.length} deciding` : ""}
            </p>
          </CardContent>
        </Card>
        {open
          ? <JoinForm token={token} planId={plan.id} meName={me?.name} already={already} />
          : <Alert variant="destructive"><AlertTitle>This plan is {plan.status}</AlertTitle></Alert>}
        <p className="text-center text-xs text-muted-foreground">
          {money ? "Join, then pay your share via Splitpay. No app download — just a name." : "Vote in one tap once you're in. No account needed — just a name."}
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
