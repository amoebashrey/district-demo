import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { BottomNav } from "@/components/shell/nav";
import { NewPlanForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  return (
    <div className="flex flex-col min-h-full">
      <NewPlanForm city={me.city} />
      <BottomNav />
    </div>
  );
}
