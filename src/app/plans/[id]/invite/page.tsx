import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { currentUser } from "@/lib/session";
import { planView } from "@/lib/services/plan";
import { friendsOf, store } from "@/lib/store/store";
import { BottomNav } from "@/components/shell/nav";
import { WhosComing } from "./whos-coming";

export const dynamic = "force-dynamic";

/** Required step after "Yes, plan it", "Let the crew vote instead" and "Go together". */
export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const { id } = await params;
  if (!store.plans.has(id)) notFound();
  const view = planView(id, me.id);
  if (!view.is_member) redirect(`/join/${view.plan.share_token}`);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const friends = friendsOf(me.id).filter((f) => !f.is_guest).map((f) => ({ id: f.id, name: f.name, area: f.home_area ?? "" }));
  // "usual crew" = the friends this person has gone out with most (synthetic: first 3 contacts with an edge from co-attendance)
  const usual = store.edges.filter((e) => e.user_id === me.id && e.source === "co-attendance").map((e) => e.friend_id).filter((fid) => friends.some((f) => f.id === fid)).slice(0, 3);
  const already = view.members.filter((m) => m.user_id !== me.id).map((m) => m.user_id);
  return (
    <>
      <WhosComing planId={id} mode={view.plan.mode} title={view.locked?.title ?? `${view.plan.vibe} night`} perHead={view.locked?.est_cost_per_head} friends={friends} usual={usual.length >= 2 ? usual : friends.slice(0, 3).map((f) => f.id)} already={already} shareUrl={`${origin}/join/${view.plan.share_token}`} />
      <BottomNav />
    </>
  );
}
