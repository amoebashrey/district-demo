import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { currentUser } from "@/lib/session";
import { planView } from "@/lib/services/plan";
import { friendsOf, store } from "@/lib/store/store";
import { Screen, Pill } from "@/components/ui";
import { statusLabel } from "@/lib/format";
import { LiveRefresh } from "@/components/client";
import { PlanHub } from "./hub";

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
  const tone = view.plan.status === "locked" ? "success" : view.plan.status === "voting" ? "brand" : view.plan.status === "expired" ? "warning" : view.plan.status === "cancelled" ? "error" : "neutral";
  const live = ["draft", "voting", "locked"].includes(view.plan.status);
  const users = Object.fromEntries([...store.users.values()].map((u) => [u.id, u.name]));
  return (
    <Screen title="Plan" back="/" right={<Pill tone={tone}>{statusLabel[view.plan.status]}</Pill>}>
      <LiveRefresh every={3000} active={live} />
      {!view.is_member ? (
        <div className="rounded-[18px] border border-dashed border-line-3 p-6 text-center flex flex-col gap-3 items-center">
          <p className="t-title1">You&apos;re not in this plan</p>
          <p className="t-body2 text-fg-2">Ask the organiser for the link, or <Link className="text-offer underline" href={`/join/${view.plan.share_token}`}>join with this one</Link>.</p>
        </div>
      ) : (
        <PlanHub view={view} meId={me.id} shareUrl={`${origin}/join/${view.plan.share_token}`} friends={friends} names={users} />
      )}
    </Screen>
  );
}
