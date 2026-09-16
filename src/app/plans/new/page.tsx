import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { Screen, Kicker, Headline } from "@/components/ui";
import { NewPlanForm } from "./form";

export const dynamic = "force-dynamic";
export default async function NewPlan() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  return (
    <Screen title="New plan" back="/">
      <div>
        <Kicker tone="brand">{me.city}</Kicker>
        <Headline className="mt-2" tail="what kind of night?">When, and</Headline>
        <p className="t-body2 text-fg-2 mt-2">District builds 2–3 options around this. Your crew votes. It locks itself.</p>
      </div>
      <NewPlanForm />
    </Screen>
  );
}
