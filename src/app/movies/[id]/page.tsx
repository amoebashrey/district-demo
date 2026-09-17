import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getItem } from "@/lib/services/inventory";
import { BottomNav } from "@/components/shell/nav";
import { DetailShell } from "@/components/shell/detail-shell";

export const dynamic = "force-dynamic";

export default async function MovieDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ plan?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const { id } = await params;
  const { plan } = await searchParams;
  const item = getItem("movie", id);
  if (!item) notFound();
  return (
    <>
      <DetailShell item={item} meCity={me.city} startWithPlan={plan === "1"} />
      <BottomNav />
    </>
  );
}
