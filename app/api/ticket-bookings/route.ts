import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { sendAdminBookingNotification } from "@/lib/email";

// POST /api/ticket-bookings — create a booking (public)
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const formData = await request.formData();

    const event_id = formData.get("event_id") as string;
    const customer_name = formData.get("customer_name") as string;
    const customer_email = formData.get("customer_email") as string;
    const customer_phone = formData.get("customer_phone") as string;
    const quantity = parseInt(formData.get("quantity") as string, 10) || 1;
    const payment_proof = formData.get("payment_proof") as File | null;

    if (!event_id || !customer_name || !customer_email || !customer_phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch the event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, title, ticket_price, ticket_capacity, is_ticketed, is_active")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.is_active || !event.is_ticketed) {
      return NextResponse.json({ error: "Ticketing is not available for this event" }, { status: 400 });
    }

    const unit_price = Number(event.ticket_price ?? 0);
    const total_amount = unit_price * quantity;
    const isFree = unit_price === 0;

    // Check payment proof for paid events
    if (!isFree && (!payment_proof || payment_proof.size === 0)) {
      return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
    }

    // Check capacity
    if (event.ticket_capacity) {
      const { count } = await supabaseAdmin
        .from("ticket_bookings")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event_id)
        .neq("payment_status", "rejected");

      const booked = count ?? 0;
      if (booked + quantity > event.ticket_capacity) {
        return NextResponse.json({ error: "Not enough tickets available" }, { status: 400 });
      }
    }

    // Upload payment proof
    let payment_proof_url: string | null = null;
    if (payment_proof && payment_proof.size > 0) {
      // Ensure bucket exists
      await supabaseAdmin.storage.createBucket("payment-proofs", { public: true }).catch(() => {});

      const fileExt = payment_proof.name.split(".").pop() ?? "jpg";
      const fileName = `${event_id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("payment-proofs")
        .upload(fileName, payment_proof, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);
      payment_proof_url = publicUrl;
    }

    // Create booking (auto-approve free events)
    const payment_status = isFree ? "approved" : "pending";
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("ticket_bookings")
      .insert({
        event_id,
        customer_name,
        customer_email,
        customer_phone,
        quantity,
        unit_price,
        total_amount,
        payment_proof_url,
        payment_status,
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // Notify admin (non-blocking)
    sendAdminBookingNotification({
      bookingNumber: booking.booking_number,
      customerName: customer_name,
      customerPhone: customer_phone,
      customerEmail: customer_email,
      eventTitle: event.title,
      eventDate: new Date(
        (await supabaseAdmin.from("events").select("event_date").eq("id", event_id).single()).data?.event_date ?? ""
      ).toLocaleString("en-NP", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      quantity,
      unitPrice: unit_price,
      totalAmount: total_amount,
      isFree,
      createdAt: new Date().toLocaleString("en-NP"),
    }).catch(console.error);

    // For free events, create individual QR codes and send emails immediately
    if (isFree) {
      try {
        const QRCode = (await import("qrcode")).default;

        const qrInserts = Array.from({ length: quantity }, (_, i) => ({
          booking_id: booking.id,
          ticket_index: i + 1,
        }));
        const { data: qrCodes } = await supabaseAdmin
          .from("ticket_qr_codes")
          .insert(qrInserts)
          .select("id, qr_token, ticket_index");

        await supabaseAdmin.storage.createBucket("ticket-qr-codes", { public: true }).catch(() => {});

        const [{ data: settings }, { data: eventRow }] = await Promise.all([
          supabaseAdmin.from("settings").select("logo_url").eq("id", 1).single(),
          supabaseAdmin.from("events").select("event_date, location").eq("id", event_id).single(),
        ]);
        const eventDate = new Date(eventRow?.event_date ?? "")
          .toLocaleDateString("en-NP", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

        const { sendTicketConfirmationEmail } = await import("@/lib/email");

        // Upload all QR images in parallel, then send ONE email with all tickets
        const ticketEntries = await Promise.all((qrCodes ?? []).map(async (qr) => {
          const buf: Buffer = await QRCode.toBuffer(qr.qr_token, { width: 400, margin: 2 });
          const fileName = `${booking.booking_number}-${qr.ticket_index}.png`;
          await supabaseAdmin.storage.from("ticket-qr-codes")
            .upload(fileName, buf, { contentType: "image/png", upsert: true });
          const { data: { publicUrl: qrCodeUrl } } = supabaseAdmin.storage
            .from("ticket-qr-codes").getPublicUrl(fileName);
          return { ticketIndex: qr.ticket_index, qrCodeUrl };
        }));

        await sendTicketConfirmationEmail({
          bookingNumber: booking.booking_number,
          customerName: customer_name,
          customerEmail: customer_email,
          eventTitle: event.title,
          eventDate,
          eventLocation: eventRow?.location ?? "",
          quantity,
          unitPrice: unit_price,
          totalAmount: total_amount,
          tickets: ticketEntries.sort((a, b) => a.ticketIndex - b.ticketIndex),
          logoUrl: settings?.logo_url ?? null,
        });
      } catch (emailErr) {
        console.error("Free ticket email error:", emailErr);
      }
    }

    return NextResponse.json(
      { success: true, booking_number: booking.booking_number, is_free: isFree },
      { status: 201 }
    );
  } catch (error) {
    console.error("Ticket booking error:", error);
    const msg = error instanceof Error ? error.message : "Booking failed. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/ticket-bookings — admin: list all bookings
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const event_id = searchParams.get("event_id");

    let query = supabase
      .from("ticket_bookings")
      .select("*, events(title, event_date, location)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("payment_status", status);
    if (event_id) query = query.eq("event_id", event_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
