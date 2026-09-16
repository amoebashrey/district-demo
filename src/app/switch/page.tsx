import { store } from "@/lib/store/store";
import { currentUser } from "@/lib/session";
import { Screen } from "@/components/screen";
import { UserPicker } from "./picker";

export const dynamic = "force-dynamic";

export default async function SwitchPage() {
  const me = await currentUser();
  const users = [...store.users.values()].map((u) => ({ id: u.id, name: u.name, city: u.city, home_area: u.is_guest ? "" : (u.home_area ?? ""), persona: u.is_guest ? "guest" : (u.persona ?? "") }));
  return (
    <Screen title="Who are you?" back={me ? "/" : undefined}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Demo identity</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Pick a person to play as</h2>
        <p className="mt-1 text-sm text-muted-foreground">Synthetic users grouped by city. Friends in the same crew see each other&apos;s plans. Switch any time to vote as someone else.</p>
      </div>
      <UserPicker users={users} currentId={me?.id} />
    </Screen>
  );
}
