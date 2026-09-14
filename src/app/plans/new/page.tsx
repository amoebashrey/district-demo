import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { Screen, Kicker } from "@/components/ui";
import { NewPlanForm } from "./form";

export const dynamic = "force-dynamic";
export default async function NewPlan() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  return (
    <Screen title="New plan" back="/">
      <div>
        <Kicker>{me.city}</Kicker>
        <h2 className="font-serif text-[32px] leading-[36px] mt-1">When, and <span className="italic text-fg-2">what kind of night?</span></h2>
        <p className="t-body2 text-fg-2 mt-2">District builds 2–3 options around this. Your crew votes. It locks itself.</p>
      </div>
      <NewPlanForm />
    </Screen>
  );
}
