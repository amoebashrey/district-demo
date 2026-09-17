import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { BottomNav } from "@/components/shell/nav";
import { TopBar } from "@/components/shell/topbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Initials } from "@/components/screen";
import { YourPlans } from "@/components/plans/your-plans";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  return (
    <div className="flex flex-col min-h-full">
      <TopBar city={me.city} name={me.name} area={me.home_area} section="Profile" />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 shell-nav-pad space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14"><AvatarFallback className="text-lg"><Initials name={me.name} /></AvatarFallback></Avatar>
          <div><p className="text-lg font-semibold">{me.name}</p><p className="text-sm text-muted-foreground">{me.city}{me.home_area ? ` · ${me.home_area}` : ""}</p></div>
        </div>
        <YourPlans />
        <ul className="divide-y divide-white/6 rounded-2xl bg-[#141416] text-sm">
          {["Your bookings", "Splitpay", "District Money", "Hotlists", "Help & support"].map((l) => <li key={l} className="flex items-center justify-between px-4 py-3 text-muted-foreground">{l}<span className="text-xs">demo</span></li>)}
        </ul>
      </main>
      <BottomNav />
    </div>
  );
}
