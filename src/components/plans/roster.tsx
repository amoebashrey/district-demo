"use client";
import { Check, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Initials } from "@/components/screen";
import type { PlanView } from "@/lib/services/plan";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

/** In vs Pending, each with their share. Member states: invited → in → paid. */
export function Roster({ view, meId }: { view: PlanView; meId: string | null }) {
  const perHead = view.locked?.est_cost_per_head;
  const paidBy = (uid: string) => view.splits.find((s) => s.user_id === uid)?.status;
  const rows = [...view.members.filter((m) => m.rsvp_status === "joined"), ...view.members.filter((m) => m.rsvp_status === "invited")];
  return (
    <ul className="divide-y divide-white/6">
      {rows.map((m) => { const st = paidBy(m.user_id); return (
        <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
          <span className="relative"><Avatar size="sm" className={cn(m.rsvp_status !== "joined" && "opacity-50")}><AvatarFallback className="text-[10px]"><Initials name={m.display_name} /></AvatarFallback></Avatar>{m.role === "organiser" && <Crown className="absolute -right-1 -bottom-1 size-3.5 text-brand-hot" />}</span>
          <span className={cn("min-w-0 flex-1 truncate", m.rsvp_status !== "joined" && "text-muted-foreground")}>{m.user_id === meId ? "You" : m.display_name}</span>
          {perHead && <span className={cn("text-xs tabular-nums", m.rsvp_status === "joined" ? "text-foreground" : "text-muted-foreground")}>{inr(perHead)}</span>}
          {m.rsvp_status === "invited" ? <Badge variant="outline" className="rounded-full">Pending</Badge> : st === "captured" ? <Badge className="gap-1 rounded-full"><Check className="size-3" /> Paid</Badge> : st === "failed" ? <Badge variant="destructive" className="rounded-full">Failed</Badge> : <Badge className="gap-1 rounded-full border-0 bg-[#22c55e]/15 text-[#22c55e]"><Check className="size-3" /> In</Badge>}
        </li>); })}
    </ul>
  );
}
