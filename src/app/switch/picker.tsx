"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import { api } from "@/components/client";
import { ChipGroup, Stagger, StaggerItem, Pressable } from "@/components/motion";

type U = { id: string; name: string; city: string; home_area: string; persona: string };
const personaLabel: Record<string, string> = { "metro-pro": "Metro pro", "genz-flaky": "Gen Z", guest: "Guest via link" };

export function UserPicker({ users, currentId }: { users: U[]; currentId?: string }) {
  const router = useRouter();
  const cities = [...new Set(users.map((u) => u.city))];
  const [city, setCity] = useState(users.find((u) => u.id === currentId)?.city ?? cities[0]);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <ChipGroup options={cities.map((c) => ({ key: c, label: c }))} value={city} onChange={setCity} />
      <Stagger key={city} as="ul" className="rounded-[18px] bg-surface border border-line divide-y divide-line overflow-hidden">
        {users.filter((u) => u.city === city).map((u) => (
          <StaggerItem as="li" key={u.id}>
            <Pressable scale={0.985} disabled={pending} onClick={() => start(async () => { await api("/api/session", { user_id: u.id }); router.push("/"); router.refresh(); })}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left ${u.id === currentId ? "bg-brand/10" : ""}`}>
              <Avatar name={u.name} size={36} />
              <span className="flex-1 min-w-0"><span className="t-button2 block truncate">{u.name}</span><span className="t-caption text-fg-3">{personaLabel[u.persona] ?? u.persona}{u.home_area && u.persona !== "guest" ? ` · ${u.home_area}` : ""}</span></span>
              {u.id === currentId && <span className="t-button3 text-offer">you</span>}
            </Pressable>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
