import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// PATCH /api/ticket-bookings/[id] — admin: approve, reject, or mark used
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, admin_note } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    if (action === "approve") {
      // Fetch booking + event details
      const { data: booking, error: fetchError } = await supabaseAdmin
        .from("ticket_bookings")
        .select("*, events(title, event_date, location, ticket_promo_enabled, ticket_promo_discount)")
        .eq("id", id)
        .single();

      if (fetchError || !booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      if (booking.payment_status === "approved") {
        return NextResponse.json({ error: "Already approved" }, { status: 400 });
      }

      // Update status
      const { error: updateError } = await supabaseAdmin
        .from("ticket_bookings")
        .update({ payment_status: "approved" })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Create one QR code per ticket, upload each, send individual emails
      try {
        const QRCode = (await import("qrcode")).default;
        const event = booking.events as { title: string; event_date: string; location: string | null; ticket_promo_enabled: boolean; ticket_promo_discount: number };
        const eventDate = new Date(event.event_date).toLocaleDateString("en-NP", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        });

        await supabaseAdmin.storage.createBucket("ticket-qr-codes", { public: true }).catch(() => {});

        const [{ data: settings }, { data: eventRow }] = await Promise.all([
          supabaseAdmin.from("settings").select("logo_url").eq("id", 1).single(),
          supabaseAdmin.from("events").select("event_date, location").eq("id", booking.event_id).single(),
        ]);

        const { sendTicketConfirmationEmail } = await import("@/lib/email");

        // Try inserting into ticket_qr_codes; fall back to booking.qr_token if table missing
        const { data: qrCodes, error: qrInsertErr } = await supabaseAdmin
          .from("ticket_qr_codes")
          .insert(Array.from({ length: booking.quantity }, (_, i) => ({
            booking_id: booking.id,
            ticket_index: i + 1,
          })))
          .select("id, qr_token, ticket_index");

        if (qrInsertErr || !qrCodes) {
          // Fallback: table missing — send one email with the booking's existing qr_token
          console.warn("ticket_qr_codes insert failed, using legacy qr_token:", qrInsertErr?.message);
          const buf: Buffer = await QRCode.toBuffer(booking.qr_token, { width: 400, margin: 2 });
          const fileName = `${booking.booking_number}.png`;
          await supabaseAdmin.storage.from("ticket-qr-codes")
            .upload(fileName, buf, { contentType: "image/png", upsert: true });
          const { data: { publicUrl: qrCodeUrl } } = supabaseAdmin.storage
            .from("ticket-qr-codes").getPublicUrl(fileName);
          await sendTicketConfirmationEmail({
            bookingNumber: booking.booking_number,
            customerName: booking.customer_name,
            customerEmail: booking.customer_email,
            eventTitle: event.title,
            eventDate,
            eventLocation: eventRow?.location ?? event.location ?? "",
            quantity: booking.quantity,
            unitPrice: Number(booking.unit_price),
            totalAmount: Number(booking.total_amount),
            tickets: [{ ticketIndex: 1, qrCodeUrl }],
            logoUrl: settings?.logo_url ?? null,
          });
        } else {
          // Generate one promo code per ticket (if enabled for this event)
          let promoCodes: { code: string }[] | null = null;
          if (event.ticket_promo_enabled) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            const discountValue = Number(event.ticket_promo_discount ?? 100);
            const promoInserts = Array.from({ length: booking.quantity }, () => ({
              code: "TKT-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
              description: `Ticket perk — ${event.title}`,
              discount_type: "fixed",
              discount_value: discountValue,
              usage_limit: 1,
              used_count: 0,
              is_active: true,
              expires_at: expiry.toISOString(),
            }));
            const { data } = await supabaseAdmin
              .from("promo_codes")
              .insert(promoInserts)
              .select("code");
            promoCodes = data;
          }

          // Upload all QR images in parallel, then send ONE email with all tickets
          const ticketEntries = await Promise.all(qrCodes.map(async (qr) => {
            const buf: Buffer = await QRCode.toBuffer(qr.qr_token, { width: 400, margin: 2 });
            const fileName = `${booking.booking_number}-${qr.ticket_index}.png`;
            await supabaseAdmin.storage.from("ticket-qr-codes")
              .upload(fileName, buf, { contentType: "image/png", upsert: true });
            const { data: { publicUrl: qrCodeUrl } } = supabaseAdmin.storage
              .from("ticket-qr-codes").getPublicUrl(fileName);
            return {
              ticketIndex: qr.ticket_index,
              qrCodeUrl,
              promoCode: promoCodes?.[qr.ticket_index - 1]?.code,
            };
          }));

          await sendTicketConfirmationEmail({
            bookingNumber: booking.booking_number,
            customerName: booking.customer_name,
            customerEmail: booking.customer_email,
            eventTitle: event.title,
            eventDate,
            eventLocation: eventRow?.location ?? event.location ?? "",
            quantity: booking.quantity,
            unitPrice: Number(booking.unit_price),
            totalAmount: Number(booking.total_amount),
            tickets: ticketEntries.sort((a, b) => a.ticketIndex - b.ticketIndex),
            logoUrl: settings?.logo_url ?? null,
          });
        }
      } catch (emailErr) {
        console.error("Ticket email error (non-fatal):", emailErr);
      }

      return NextResponse.json({ success: true });
    }

    if (action === "reject") {
      const { error } = await supabaseAdmin
        .from("ticket_bookings")
        .update({ payment_status: "rejected", admin_note: admin_note ?? null })
        .eq("id", id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "mark_used") {
      const { data: booking } = await supabaseAdmin
        .from("ticket_bookings")
        .select("payment_status, used_at")
        .eq("id", id)
        .single();

      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      if (booking.payment_status !== "approved") {
        return NextResponse.json({ error: "Ticket is not approved" }, { status: 400 });
      }
      if (booking.used_at) {
        return NextResponse.json({ error: "Ticket already used" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("ticket_bookings")
        .update({ used_at: new Date().toISOString() })
        .eq("id", id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Ticket booking PATCH error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/ticket-bookings/[id] — get single booking (admin)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data, error } = await supabase
      .from("ticket_bookings")
      .select("*, events(title, event_date, location)")
      .eq("id", id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
