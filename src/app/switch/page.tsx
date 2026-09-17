import { currentUser } from "@/lib/session";
import { store } from "@/lib/store/store";
import { BottomNav } from "@/components/shell/nav";
import { UserPicker } from "./picker";

export const dynamic = "force-dynamic";

export default async function SwitchPage() {
  const me = await currentUser();
  const users = [...store.users.values()].map((u) => ({
    id: u.id, name: u.name, city: u.city,
    home_area: u.is_guest ? "" : (u.home_area ?? ""),
    persona: u.is_guest ? "guest" : (u.persona ?? ""),
  }));
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-20 flex h-14 items-center border-b bg-background/90 px-4 backdrop-blur">
        <h1 className="text-sm font-medium">Who are you?</h1>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 pt-4 pb-28">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Demo identity</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Pick a person to play as</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Synthetic users grouped by city. Friends in the same crew see each other&apos;s plans.
            Switch any time to vote as someone else.
          </p>
        </div>
        <UserPicker users={users} currentId={me?.id} />
      </main>
      <BottomNav />
    </div>
  );
}
