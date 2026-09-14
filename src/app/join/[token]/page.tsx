import { notFound } from "next/navigation";
import { currentUser } from "@/lib/session";
import { planForToken } from "@/lib/services/invite";
import { membersOf, joinedMembers, getUser } from "@/lib/store/store";
import { Screen, Kicker, AvatarStack, Card, Pill } from "@/components/ui";
import { bandLabel, dateRange, firstName, statusLabel, vibeLabel } from "@/lib/format";
import { JoinForm } from "./form";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let plan; try { plan = planForToken(token); } catch { notFound(); }
  const me = await currentUser();
  const host = getUser(plan.creator_id);
  const joined = joinedMembers(plan.id); const all = membersOf(plan.id).filter((m) => m.rsvp_status !== "left");
  const already = !!me && all.some((m) => m.user_id === me.id && m.rsvp_status === "joined");
  const open = ["draft", "voting", "locked"].includes(plan.status);
  return (
    <Screen>
      <div className="pt-6">
        <Kicker>You&apos;re invited</Kicker>
        <h1 className="font-serif text-[36px] leading-[40px] mt-1">{firstName(host?.name ?? "A friend")} is planning a <span className="italic text-fg-2">{(vibeLabel[plan.vibe] ?? plan.vibe).toLowerCase()} night.</span></h1>
      </div>
      <Card>
        <div className="flex items-center justify-between"><p className="t-title1">{plan.city}</p><Pill tone={plan.status === "voting" ? "brand" : "neutral"}>{statusLabel[plan.status]}</Pill></div>
        <p className="t-body2 text-fg-2 mt-1">{dateRange(plan.date_start, plan.date_end)} · {bandLabel[plan.budget_band]} a head</p>
        <div className="flex items-center gap-3 mt-4">
          <AvatarStack names={all.map((m) => m.display_name)} size={32} />
          <p className="t-body2 text-fg-2">{joined.length === 1 ? `${firstName(joined[0].display_name)} is in` : `${joined.length} people are in`}{all.length > joined.length ? `, ${all.length - joined.length} deciding` : ""}</p>
        </div>
      </Card>
      {open ? <JoinForm token={token} planId={plan.id} meName={me?.name} already={already} /> : <Card tone="warning"><p className="t-button1 text-warning">This plan is {plan.status}</p></Card>}
      <p className="t-caption text-fg-3 text-center">Vote in one tap once you&apos;re in. No account needed — just a name.</p>
    </Screen>
  );
}
