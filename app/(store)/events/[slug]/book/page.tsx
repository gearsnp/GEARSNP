import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import TicketBookingForm from "@/components/store/TicketBookingForm";
import { ArrowLeft, Calendar, MapPin, Clock } from "lucide-react";

export default async function BookTicketPage({
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

  if (!event || !event.is_ticketed) notFound();

  const isPast = new Date(event.event_date) < new Date();
  if (isPast) notFound();

  // Check remaining capacity
  let remainingCapacity: number | null = null;
  if (event.ticket_capacity) {
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
    if (remainingCapacity <= 0) notFound();
  }

  const date = new Date(event.event_date);
  const isFree = Number(event.ticket_price ?? 0) === 0;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Link
          href={`/events/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Event
        </Link>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Event summary header */}
          <div className="bg-[#e10600] text-white p-5">
            <h1 className="text-xl font-bold mb-1">{event.title}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-red-100">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {date.toLocaleDateString("en-NP", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {date.toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </span>
              )}
            </div>
            {!isFree && (
              <p className="text-sm font-semibold mt-2 text-red-100">
                NPR {Number(event.ticket_price).toLocaleString()} per ticket
              </p>
            )}
            {isFree && (
              <p className="text-sm font-semibold mt-2 text-red-100">Free Entry</p>
            )}
          </div>

          {/* Form */}
          <div className="p-6">
            <h2 className="text-lg font-bold mb-5">
              {isFree ? "Register for this Event" : "Complete Your Booking"}
            </h2>
            <TicketBookingForm
              event={{
                id: event.id,
                title: event.title,
                slug: event.slug,
                event_date: event.event_date,
                location: event.location,
                ticket_price: event.ticket_price,
                ticket_capacity: event.ticket_capacity,
                payment_instructions: event.payment_instructions,
                payment_qr_url: event.payment_qr_url,
              }}
              remainingCapacity={remainingCapacity}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
