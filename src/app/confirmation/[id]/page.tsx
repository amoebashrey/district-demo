import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { currentUser } from "@/lib/session";
import { getBooking } from "@/lib/services/booking";
import { BottomNav } from "@/components/shell/nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EntryPoint } from "@/components/highlight";
import { day, inr, time } from "@/lib/format";
import { InviteToBookingButton } from "../group-button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const { id } = await params;
  let booking;
  try { booking = getBooking(id); } catch { notFound(); }

  return (
    <div className="flex flex-col min-h-full">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-8 shell-nav-pad space-y-5">
        {/* Confirmation hero */}
        <div className="text-center space-y-3">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#22c55e] text-black">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">You&apos;re booked</h1>
          <p className="text-sm text-muted-foreground">Ticket&apos;s in your wallet.</p>
        </div>

        {/* Booking card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{booking.title}</CardTitle>
            <CardDescription>
              {day(booking.starts_at)} · {time(booking.starts_at)} · {booking.venue}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{booking.qty} {booking.qty === 1 ? "ticket" : "tickets"} · paid via Splitpay</span>
              <span className="font-semibold">{inr(booking.amount)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs"><span className="text-muted-foreground">Booking ref</span><Badge variant="outline" className="font-mono">{booking.provider_ref}</Badge></div>
          </CardContent>
        </Card>

        {/* EP4 — "Bring your friends" post-booking */}
        <EntryPoint n={4} block>
          <Card className="border-brand/30 bg-brand/5 w-full">
            <CardContent className="py-5 space-y-3">
              <div className="space-y-1">
                <p className="font-semibold text-sm">Bring your friends →</p>
                <p className="text-xs text-muted-foreground">
                  Share via WhatsApp. Friends tap the link, join the booking, and pay their share. No download needed to RSVP or pay.
                </p>
              </div>
              <InviteToBookingButton bookingId={booking.id} planId={booking.plan_id} />
            </CardContent>
          </Card>
        </EntryPoint>

        <Button variant="outline" className="w-full" asChild>
          <Link href="/">Back to For You</Link>
        </Button>
      </main>
      <BottomNav />
    </div>
  );
}
