import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { listItems } from "@/lib/services/inventory";
import { BottomNav } from "@/components/shell/nav";
import { TopBar } from "@/components/shell/topbar";
import { CategoryList } from "@/components/shell/category-list";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const items = listItems("event", me.city);
  return (
    <div className="flex flex-col min-h-full">
      <TopBar city={me.city} name={me.name} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-28 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <CategoryList items={items} basePath="/events" />
      </main>
      <BottomNav />
    </div>
  );
}
