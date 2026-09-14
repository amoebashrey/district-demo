import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { plansFor, joinedMembers, membersOf } from "@/lib/store/store";
import { getPlan } from "@/lib/services/plan";
import { Screen, Card, Pill, AvatarStack, Empty, Kicker, Avatar } from "@/components/ui";
import { dateRange, firstName, statusLabel, vibeLabel } from "@/lib/format";
import { LiveRefresh } from "@/components/client";

export const dynamic = "force-dynamic";
type Tone = "neutral" | "brand" | "success" | "warning" | "error";
const tone = (s: string): Tone => (s === "locked" || s === "booked" ? "success" : s === "voting" ? "brand" : s === "expired" ? "warning" : s === "cancelled" ? "error" : "neutral");

export default async function Home() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const plans = plansFor(me.id).map((p) => getPlan(p.id)).filter((p) => !["cancelled", "completed"].includes(p.status));
  return (
    <Screen bottom={<Link href="/plans/new" className="flex items-center justify-center h-12 w-full rounded-xl bg-brand-btn text-fg t-button1 shadow-[0_8px_24px_-8px_rgba(109,73,253,0.6)] active:scale-[0.97] transition-transform">Start a plan</Link>}>
      <LiveRefresh every={5000} />
      <div className="flex items-start justify-between pt-2">
        <div>
          <Kicker>District Plans</Kicker>
          <h1 className="font-serif text-[36px] leading-[40px] mt-1">Hey {firstName(me.name)}, <span className="italic text-fg-2">who&apos;s free?</span></h1>
        </div>
        <Link href="/switch" className="flex flex-col items-center gap-1 -mt-1" title="Switch demo user"><Avatar name={me.name} size={40} /><span className="t-caption text-fg-3">switch</span></Link>
      </div>

      <div className="flex flex-col gap-3">
        <Kicker>Your plans</Kicker>
        {plans.length === 0 ? (
          <Empty title="Nothing on yet" body="Start a plan, share the link, and let the crew vote. It locks itself." />
        ) : plans.map((p) => {
          const joined = joinedMembers(p.id); const all = membersOf(p.id).filter((m) => m.rsvp_status !== "left");
          return (
            <Link key={p.id} href={`/plans/${p.id}`} className="block active:scale-[0.99] transition-transform">
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <p className="t-title1 truncate">{vibeLabel[p.vibe] ?? p.vibe} night</p>
                  <Pill tone={tone(p.status)}>{statusLabel[p.status]}</Pill>
                </div>
                <p className="t-body2 text-fg-2 mt-0.5">{p.city} · {dateRange(p.date_start, p.date_end)} · {p.budget_band}</p>
                <div className="flex items-center justify-between mt-3">
                  <AvatarStack names={all.map((m) => m.display_name)} />
                  <span className="t-caption text-fg-3">{joined.length} in{all.length > joined.length ? ` · ${all.length - joined.length} invited` : ""}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
      <p className="t-caption text-fg-3 text-center mt-2">Prototype · in-memory demo data · everyone here is synthetic</p>
    </Screen>
  );
}
