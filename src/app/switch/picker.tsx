"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Initials } from "@/components/screen";
import { api } from "@/components/client";

type U = { id: string; name: string; city: string; home_area: string; persona: string };
const personaLabel: Record<string, string> = { "metro-pro": "Metro pro", "genz-flaky": "Gen Z", guest: "Guest" };

export function UserPicker({ users, currentId }: { users: U[]; currentId?: string }) {
  const router = useRouter();
  const cities = [...new Set(users.map((u) => u.city))];
  const [pending, start] = useTransition();
  const initial = users.find((u) => u.id === currentId)?.city ?? cities[0];
  return (
    <Tabs defaultValue={initial}>
      <TabsList className="w-full">{cities.map((c) => <TabsTrigger key={c} value={c} className="flex-1">{c}</TabsTrigger>)}</TabsList>
      {cities.map((c) => (
        <TabsContent key={c} value={c}>
          <ul className="divide-y rounded-xl border bg-card">
            {users.filter((u) => u.city === c).map((u) => (
              <li key={u.id}>
                <button disabled={pending} onClick={() => start(async () => { await api("/api/session", { user_id: u.id }); router.push("/"); router.refresh(); })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50">
                  <Avatar><AvatarFallback><Initials name={u.name} /></AvatarFallback></Avatar>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{u.name}</span><span className="text-xs text-muted-foreground">{personaLabel[u.persona] ?? u.persona}{u.home_area ? ` · ${u.home_area}` : ""}</span></span>
                  {u.id === currentId && <Badge variant="secondary">you</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </TabsContent>
      ))}
    </Tabs>
  );
}
