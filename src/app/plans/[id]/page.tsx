import { StatusClient } from "./status";
export const dynamic = "force-dynamic";
export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <StatusClient id={id} />; }
