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

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const { id } = await params;
  let booking;
  try { booking = getBooking(id); } catch { notFound(); }

  return (
    <div className="flex flex-col min-h-full">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-8 pb-28 space-y-5">
        {/* Confirmation hero */}
        <div className="text-center space-y-3">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
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
              <span className="text-muted-foreground">{booking.qty} {booking.qty === 1 ? "ticket" : "tickets"}</span>
              <span className="font-semibold">{inr(booking.amount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* EP4 — "Bring your friends" post-booking */}
        <EntryPoint n={4} block>
          <Card className="border-primary/30 bg-primary/5 w-full">
            <CardContent className="py-5 space-y-3">
              <div className="space-y-1">
                <p className="font-semibold text-sm">Bring your friends →</p>
                <p className="text-xs text-muted-foreground">
                  Share via WhatsApp. Friends tap the link, join the booking, and pay their share. No download needed to RSVP or pay.
                </p>
              </div>
              <Button className="w-full" asChild>
                <Link href="/plans/new?from=ep4">Invite the crew to join</Link>
              </Button>
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
