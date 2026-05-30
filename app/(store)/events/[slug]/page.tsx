import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { formatNepaliCurrency } from "@/lib/utils";
import { Calendar, MapPin, Ticket, Clock, ArrowLeft, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@supabase/supabase-js";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!event) notFound();

  const isPast = new Date(event.event_date) < new Date();
  const isFree = event.is_ticketed && (event.ticket_price === 0 || event.ticket_price === null);

  // Check remaining capacity
  let remainingCapacity: number | null = null;
  let soldOut = false;
  if (event.is_ticketed && event.ticket_capacity) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: bookedData } = await supabaseAdmin
      .from("ticket_bookings")
      .select("quantity")
      .eq("event_id", event.id)
      .neq("payment_status", "rejected");

    const booked = bookedData?.reduce((sum, b) => sum + (b.quantity ?? 0), 0) ?? 0;
    remainingCapacity = event.ticket_capacity - booked;
    soldOut = remainingCapacity <= 0;
  }

  const date = new Date(event.event_date);

  return (
    <div className="min-h-screen">
      {/* Back link */}
      <div className="container mx-auto max-w-4xl px-4 pt-6">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> All Events
        </Link>
      </div>

      {/* Banner */}
      {event.banner_image_url && (
        <div className="relative h-64 md:h-96 w-full mb-8">
          <Image
            src={event.banner_image_url}
            alt={event.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      <div className="container mx-auto max-w-4xl px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="md:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#e10600]" />
                {date.toLocaleDateString("en-NP", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#e10600]" />
                {date.toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#e10600]" />
                  {event.location}
                </span>
              )}
            </div>

            {event.description && (
              <div className="prose prose-sm max-w-none text-foreground">
                <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Booking sidebar */}
          <div className="md:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              {event.is_ticketed ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Ticket className="h-5 w-5 text-[#e10600]" />
                    <h2 className="font-bold text-lg">Book Tickets</h2>
                  </div>

                  {!isFree && (
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-[#e10600]">
                        {formatNepaliCurrency(Number(event.ticket_price ?? 0))}
                      </span>
                      <span className="text-muted-foreground text-sm ml-1">/ person</span>
                    </div>
                  )}

                  {isFree && (
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">Free</span>
                      <span className="text-muted-foreground text-sm ml-2">Entry</span>
                    </div>
                  )}

                  {event.ticket_capacity && remainingCapacity !== null && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                      <Users className="h-4 w-4" />
                      {soldOut ? (
                        <span className="text-red-500 font-medium">Sold out</span>
                      ) : (
                        <span>{remainingCapacity} {remainingCapacity === 1 ? "seat" : "seats"} left</span>
                      )}
                    </div>
                  )}

                  {isPast ? (
                    <Badge variant="secondary" className="w-full justify-center py-2">
                      Event has ended
                    </Badge>
                  ) : soldOut ? (
                    <Button disabled className="w-full">Sold Out</Button>
                  ) : (
                    <Link href={`/events/${event.slug}/book`}>
                      <Button className="w-full bg-[#e10600] hover:bg-[#c00500]">
                        {isFree ? "Register Free" : "Book Now"}
                      </Button>
                    </Link>
                  )}

                  {!isFree && !isPast && !soldOut && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      Pay via bank transfer or eSewa. Upload proof after booking.
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Free entry — no booking required</p>
                  {event.location && (
                    <p className="text-xs mt-2">Just show up at {event.location}</p>
                  )}
                </div>
              )}

              {isPast && (
                <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground bg-muted rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>This event has already taken place.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
