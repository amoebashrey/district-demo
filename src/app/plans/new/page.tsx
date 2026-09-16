import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { NewPlanForm } from "./form";

export const dynamic = "force-dynamic";
export default async function NewPlan() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  return <NewPlanForm city={me.city} />;
}
