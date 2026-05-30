import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabase/server";
import { formatNepaliCurrency } from "@/lib/utils";
import { Calendar, MapPin, Ticket, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function EventsPage() {
  const supabase = await supabaseServer();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .order("event_date", { ascending: true });

  const now = new Date();
  const upcoming = events?.filter((e) => new Date(e.event_date) >= now) ?? [];
  const past = events?.filter((e) => new Date(e.event_date) < now) ?? [];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 text-[#e10600] mb-3">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Events</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">F1 Events & Watch Parties</h1>
          <p className="text-gray-300 text-lg">
            Join fellow fans for race screenings, meetups, and exclusive events across Nepal
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Upcoming Events */}
        {upcoming.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
            <div className="space-y-6">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} isPast={false} />
              ))}
            </div>
          </section>
        )}

        {/* Past Events */}
        {past.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 text-muted-foreground">Past Events</h2>
            <div className="space-y-4 opacity-60">
              {past.map((event) => (
                <EventCard key={event.id} event={event} isPast={true} />
              ))}
            </div>
          </section>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold mb-2">No events yet</h2>
            <p className="text-muted-foreground">Check back soon for upcoming watch parties and meetups.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({
  event,
  isPast,
}: {
  event: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    location: string | null;
    event_date: string;
    banner_image_url: string | null;
    is_ticketed: boolean;
    ticket_price: number | null;
    ticket_capacity: number | null;
  };
  isPast: boolean;
}) {
  const date = new Date(event.event_date);
  const isFree = event.is_ticketed && (event.ticket_price === 0 || event.ticket_price === null);

  return (
    <Link href={`/events/${event.slug}`}>
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-[#e10600]/50 hover:shadow-md transition-all group cursor-pointer">
        {event.banner_image_url && (
          <div className="relative h-48 w-full">
            <Image
              src={event.banner_image_url}
              alt={event.title}
              fill
              className="object-cover"
            />
            {!isPast && event.is_ticketed && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-[#e10600] text-white border-0">
                  <Ticket className="h-3 w-3 mr-1" />
                  {isFree ? "Free Entry" : `NPR ${Number(event.ticket_price).toLocaleString()}`}
                </Badge>
              </div>
            )}
            {isPast && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Badge variant="secondary">Past Event</Badge>
              </div>
            )}
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 group-hover:text-[#e10600] transition-colors">
                {event.title}
              </h3>
              {event.description && (
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                  {event.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {date.toLocaleDateString("en-NP", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {date.toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
            {!isPast && (
              <div className="shrink-0">
                {event.is_ticketed ? (
                  <Button size="sm" className="bg-[#e10600] hover:bg-[#c00500]">
                    Book <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline">
                    Details <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* No banner fallback: show ticket badge inline */}
          {!event.banner_image_url && !isPast && event.is_ticketed && (
            <div className="mt-3">
              <Badge className="bg-[#e10600]/10 text-[#e10600] border-[#e10600]/20">
                <Ticket className="h-3 w-3 mr-1" />
                {isFree ? "Free Entry" : formatNepaliCurrency(Number(event.ticket_price ?? 0))}
                {event.ticket_capacity ? ` · ${event.ticket_capacity} seats` : ""}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
