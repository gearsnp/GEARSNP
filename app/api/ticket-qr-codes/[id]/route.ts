import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// PATCH /api/ticket-qr-codes/[id] — mark individual ticket as used (admin only)
export async function PATCH(
  _request: NextRequest,
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
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: qrCode } = await supabaseAdmin
      .from("ticket_qr_codes")
      .select("id, used_at, ticket_bookings(payment_status)")
      .eq("id", id)
      .single();

    if (!qrCode) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const booking = qrCode.ticket_bookings as any;
    if (booking?.payment_status !== "approved") {
      return NextResponse.json({ error: "Ticket is not approved" }, { status: 400 });
    }
    if (qrCode.used_at) {
      return NextResponse.json({ error: "Ticket already used" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("ticket_qr_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
