import { store } from "@/lib/store/store";
import { currentUser } from "@/lib/session";
import { Screen, Kicker } from "@/components/ui";
import { UserPicker } from "./picker";

export const dynamic = "force-dynamic";

export default async function SwitchPage() {
  const me = await currentUser();
  const users = [...store.users.values()].filter((u) => !u.is_guest).map((u) => ({ id: u.id, name: u.name, city: u.city, home_area: u.home_area ?? "", persona: u.persona ?? "" }));
  const guests = [...store.users.values()].filter((u) => u.is_guest).map((u) => ({ id: u.id, name: u.name, city: u.city, home_area: "guest", persona: "guest" }));
  return (
    <Screen title="Who are you?" back={me ? "/" : undefined}>
      <div>
        <Kicker>Demo identity</Kicker>
        <h2 className="font-serif text-[32px] leading-[36px] mt-1">Pick a person to <span className="italic text-fg-2">play as.</span></h2>
        <p className="t-body2 text-fg-2 mt-2">Synthetic users grouped by city. Friends in the same crew can see each other&apos;s plans. Switch any time to vote as someone else.</p>
      </div>
      <UserPicker users={[...users, ...guests]} currentId={me?.id} />
    </Screen>
  );
}
