import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { generateCandidates } from "@/lib/services/candidates";
import { friendsOf, store } from "@/lib/store/store";
import type { Plan } from "@/lib/store/types";
import { BottomNav } from "@/components/shell/nav";
import { StarterCard } from "./starter";

export const dynamic = "force-dynamic";

/** EP1 — the light starter: District proposes ONE night for your usual crew. Yes/no, not a poll. */
export default async function StarterPage() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const t = new Date(); const dow = t.getDay();
  const sat = new Date(t); sat.setDate(t.getDate() + ((6 - dow + 7) % 7)); const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const taste = store.taste.get(me.id);
  const probe = { id: "probe", creator_id: me.id, city: me.city, date_start: iso(dow === 0 ? t : sat), date_end: iso(dow === 0 ? t : sun), vibe: "chill", budget_band: taste?.price_band ?? "₹₹₹", status: "draft", quorum: 2, lock_rule: "majority", mode: "open", share_token: "", invite_cap: 12, expires_at: "", created_at: "", updated_at: "" } as Plan;
  let options = generateCandidates(probe, 3, 3);
  if (options.length === 0) { const wide = { ...probe, date_start: iso(t), date_end: iso(new Date(t.getTime() + 13 * 86_400_000)) }; options = generateCandidates(wide, 3, 3); }
  const crew = friendsOf(me.id).slice(0, 4).map((f) => f.name);
  return (
    <div className="flex flex-col min-h-full">
      <StarterCard options={options.map((o) => ({ title: o.title, rationale: o.rationale, est: o.est_cost_per_head, components: o.components }))} crew={crew} city={me.city} weekend={dow === 0 ? "today" : "this weekend"} />
      <BottomNav />
    </div>
  );
}
