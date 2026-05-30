import { supabaseServer } from "@/lib/supabase/server";
import { formatNepaliCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ApproveBookingButton } from "@/components/admin/ticket-bookings/ApproveBookingButton";
import { RejectBookingButton } from "@/components/admin/ticket-bookings/RejectBookingButton";
import { Ticket, Eye } from "lucide-react";
import Image from "next/image";

export default async function TicketBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; event_id?: string }>;
}) {
  const { status, event_id } = await searchParams;
  const supabase = await supabaseServer();

  let query = (supabase as any)
    .from("ticket_bookings")
    .select("*, events(title, event_date, location)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("payment_status", status);
  if (event_id) query = query.eq("event_id", event_id);

  const { data: bookings } = await query;

  const pending = bookings?.filter((b: any) => b.payment_status === "pending").length ?? 0;

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
    if (s === "rejected") return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Ticket Bookings</h1>
            {pending > 0 && (
              <Badge className="bg-[#e10600] text-white">{pending} pending</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">Review payment proofs and approve ticket bookings</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { label: "All", value: "" },
          { label: "Pending", value: "pending" },
          { label: "Approved", value: "approved" },
          { label: "Rejected", value: "rejected" },
        ].map((tab) => (
          <a
            key={tab.value}
            href={tab.value ? `?status=${tab.value}` : "/admin/ticket-bookings"}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              (status ?? "") === tab.value
                ? "bg-[#e10600] text-white border-[#e10600]"
                : "bg-card border-border hover:border-[#e10600]/40"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {!bookings || bookings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => {
            const event = booking.events as { title: string; event_date: string; location: string | null } | null;
            return (
              <div
                key={booking.id}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Booking info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-mono text-sm text-[#e10600] font-semibold">
                          {booking.booking_number}
                        </span>
                        <p className="font-bold text-base mt-0.5">{booking.customer_name}</p>
                      </div>
                      {statusBadge(booking.payment_status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                      <span>{booking.customer_email}</span>
                      <span>{booking.customer_phone}</span>
                      {event && (
                        <span className="font-medium text-foreground col-span-2 md:col-span-1">
                          {event.title}
                        </span>
                      )}
                      <span>
                        {booking.quantity} {booking.quantity === 1 ? "ticket" : "tickets"}
                        {Number(booking.unit_price) > 0 && (
                          <> · {formatNepaliCurrency(Number(booking.total_amount))}</>
                        )}
                      </span>
                      <span>
                        {new Date(booking.created_at).toLocaleDateString("en-NP", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </div>

                    {booking.admin_note && (
                      <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 mt-1">
                        Note: {booking.admin_note}
                      </p>
                    )}

                    {booking.used_at && (
                      <p className="text-xs text-green-600 mt-1">
                        Checked in at {new Date(booking.used_at).toLocaleString("en-NP")}
                      </p>
                    )}
                  </div>

                  {/* Payment proof thumbnail */}
                  {booking.payment_proof_url && (
                    <a
                      href={booking.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 group relative"
                      title="View payment proof"
                    >
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                        <Image
                          src={booking.payment_proof_url}
                          alt="Payment proof"
                          fill
                          className="object-cover group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-1">View proof</p>
                    </a>
                  )}

                  {/* Actions */}
                  {booking.payment_status === "pending" && (
                    <div className="flex md:flex-col gap-2 shrink-0">
                      <ApproveBookingButton bookingId={booking.id} />
                      <RejectBookingButton bookingId={booking.id} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
