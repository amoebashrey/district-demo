import { ConfirmedClient } from "./confirmed";
export const dynamic = "force-dynamic";
export default async function ConfirmedPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ConfirmedClient id={id} />; }
