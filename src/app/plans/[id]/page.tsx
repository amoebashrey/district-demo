import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { currentUser } from "@/lib/session";
import { planView } from "@/lib/services/plan";
import { friendsOf, store } from "@/lib/store/store";
import { Screen } from "@/components/screen";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { LiveRefresh } from "@/components/client";
import { PlanHub, PlanMenu } from "./hub";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) redirect("/switch");
  if (!store.plans.has(id)) notFound();
  const view = planView(id, me.id);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const friends = friendsOf(me.id).filter((f) => !view.members.some((m) => m.user_id === f.id)).map((f) => ({ id: f.id, name: f.name, area: f.home_area ?? "" }));
  const live = ["draft", "voting", "locked"].includes(view.plan.status);
  const names = Object.fromEntries([...store.users.values()].map((u) => [u.id, u.name]));
  return (
    <Screen title="Plan" back="/" right={<div className="flex items-center gap-1"><StatusBadge status={view.plan.status} />{view.is_member && <PlanMenu planId={id} status={view.plan.status} isOrganiser={view.my_role === "organiser"} />}</div>}>
      <LiveRefresh every={3000} active={live} />
      {!view.is_member ? (
        <Card><CardContent className="py-8 text-center"><p className="font-medium">You&apos;re not in this plan</p><p className="mt-1 text-sm text-muted-foreground">Ask the organiser for the link, or <Link className="text-primary underline" href={`/join/${view.plan.share_token}`}>join with this one</Link>.</p></CardContent></Card>
      ) : (
        <PlanHub view={view} meId={me.id} shareUrl={`${origin}/join/${view.plan.share_token}`} friends={friends} names={names} />
      )}
    </Screen>
  );
}
