import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/ticket-bookings/verify?token=<qr_token>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Try individual QR codes first (new system)
    const { data: qrCode } = await supabaseAdmin
      .from("ticket_qr_codes")
      .select("id, ticket_index, used_at, booking_id, ticket_bookings(id, booking_number, customer_name, customer_email, customer_phone, quantity, total_amount, unit_price, payment_status, event_id, events(title, event_date, location))")
      .eq("qr_token", token)
      .single();

    if (qrCode) {
      const booking = qrCode.ticket_bookings as any;
      if (booking?.payment_status !== "approved") {
        return NextResponse.json({ valid: false, error: "Ticket not approved", payment_status: booking?.payment_status });
      }
      return NextResponse.json({
        valid: true,
        already_used: !!qrCode.used_at,
        used_at: qrCode.used_at,
        qr_code_id: qrCode.id,
        ticket_index: qrCode.ticket_index,
        total_tickets: booking?.quantity,
        booking: {
          id: booking?.id,
          booking_number: booking?.booking_number,
          customer_name: booking?.customer_name,
          customer_email: booking?.customer_email,
          customer_phone: booking?.customer_phone,
          quantity: booking?.quantity,
          total_amount: booking?.total_amount,
          unit_price: booking?.unit_price,
          event: booking?.events,
        },
      });
    }

    // Legacy fallback: check ticket_bookings.qr_token
    const { data: legacyBooking } = await supabaseAdmin
      .from("ticket_bookings")
      .select("id, booking_number, customer_name, customer_email, customer_phone, quantity, total_amount, unit_price, payment_status, used_at, events(title, event_date, location)")
      .eq("qr_token", token)
      .single();

    if (!legacyBooking) {
      return NextResponse.json({ valid: false, error: "Invalid ticket" }, { status: 404 });
    }
    if (legacyBooking.payment_status !== "approved") {
      return NextResponse.json({ valid: false, error: "Ticket not approved", payment_status: legacyBooking.payment_status });
    }
    return NextResponse.json({
      valid: true,
      already_used: !!legacyBooking.used_at,
      used_at: legacyBooking.used_at,
      legacy_booking_id: legacyBooking.id,
      ticket_index: 1,
      total_tickets: legacyBooking.quantity,
      booking: {
        id: legacyBooking.id,
        booking_number: legacyBooking.booking_number,
        customer_name: legacyBooking.customer_name,
        customer_email: legacyBooking.customer_email,
        customer_phone: legacyBooking.customer_phone,
        quantity: legacyBooking.quantity,
        total_amount: legacyBooking.total_amount,
        unit_price: legacyBooking.unit_price,
        event: legacyBooking.events,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
