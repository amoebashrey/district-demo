import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { currentUser } from "@/lib/session";
import { planView } from "@/lib/services/plan";
import { friendsOf, store } from "@/lib/store/store";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiveRefresh } from "@/components/client";
import { BottomNav } from "@/components/shell/nav";
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
  const friends = friendsOf(me.id)
    .filter((f) => !view.members.some((m) => m.user_id === f.id))
    .map((f) => ({ id: f.id, name: f.name, area: f.home_area ?? "" }));
  const live = ["draft", "voting", "locked"].includes(view.plan.status);
  const names = Object.fromEntries([...store.users.values()].map((u) => [u.id, u.name]));

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b bg-background/90 px-2 backdrop-blur mx-auto w-full max-w-md">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link href="/profile"><ArrowLeft /></Link>
        </Button>
        <h1 className="flex-1 truncate text-sm font-medium">Plan</h1>
        <div className="flex items-center gap-1">
          <StatusBadge status={view.plan.status} />
          {view.is_member && (
            <PlanMenu planId={id} status={view.plan.status} isOrganiser={view.my_role === "organiser"} />
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 pt-4 pb-28">
        <LiveRefresh every={3000} active={live} />
        {!view.is_member ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="font-medium">You&apos;re not in this plan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask the organiser for the link, or{" "}
                <Link className="text-primary underline" href={`/join/${view.plan.share_token}`}>join with this one</Link>.
              </p>
            </CardContent>
          </Card>
        ) : (
          <PlanHub
            view={view}
            meId={me.id}
            shareUrl={`${origin}/join/${view.plan.share_token}`}
            friends={friends}
            names={names}
          />
        )}
      </main>
      <BottomNav />
    </div>
  );
}
