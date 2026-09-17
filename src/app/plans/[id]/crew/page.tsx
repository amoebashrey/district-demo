import { CrewClient } from "./crew";
export const dynamic = "force-dynamic";
export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CrewClient id={id} />; }
