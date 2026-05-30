import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// GET /api/ticket-bookings/checklist?event_id=<id>
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
    const event_id = searchParams.get("event_id");
    if (!event_id) return NextResponse.json({ error: "event_id is required" }, { status: 400 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch approved bookings — try with QR codes, fall back if table not migrated yet
    let rawBookings: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from("ticket_bookings")
        .select("id, booking_number, customer_name, customer_phone, quantity, total_amount, unit_price, created_at, ticket_qr_codes(id, ticket_index, used_at)")
        .eq("event_id", event_id)
        .eq("payment_status", "approved")
        .order("created_at", { ascending: true });

      if (error) throw error;
      rawBookings = data ?? [];
    } catch {
      // ticket_qr_codes table may not exist yet — return bookings without individual QR data
      const { data, error } = await supabaseAdmin
        .from("ticket_bookings")
        .select("id, booking_number, customer_name, customer_phone, quantity, total_amount, unit_price, created_at")
        .eq("event_id", event_id)
        .eq("payment_status", "approved")
        .order("created_at", { ascending: true });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      rawBookings = (data ?? []).map((b: any) => ({ ...b, ticket_qr_codes: [] }));
    }

    const bookings = rawBookings;

    const enriched = (bookings ?? []).map((b: any) => {
      const qrCodes = b.ticket_qr_codes ?? [];
      const checkedIn = qrCodes.filter((q: any) => !!q.used_at).length;
      return {
        id: b.id,
        booking_number: b.booking_number,
        customer_name: b.customer_name,
        customer_phone: b.customer_phone,
        quantity: b.quantity,
        total_amount: b.total_amount,
        unit_price: b.unit_price,
        qr_codes: qrCodes.sort((a: any, b: any) => a.ticket_index - b.ticket_index),
        checked_in: checkedIn,
      };
    });

    const totalTickets = enriched.reduce((s, b) => s + b.quantity, 0);
    const totalCheckedIn = enriched.reduce((s, b) => s + b.checked_in, 0);

    return NextResponse.json({
      bookings: enriched,
      stats: {
        total_bookings: enriched.length,
        total_tickets: totalTickets,
        checked_in: totalCheckedIn,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
