import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// PATCH /api/events/[id] - Update event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await params;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or staff
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();

    // Extract form data
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const event_date = formData.get("event_date") as string;
    const is_active = formData.get("is_active") === "true";
    const is_ticketed = formData.get("is_ticketed") === "true";
    const ticket_price = formData.get("ticket_price") ? parseFloat(formData.get("ticket_price") as string) : null;
    const ticket_capacity = formData.get("ticket_capacity") ? parseInt(formData.get("ticket_capacity") as string, 10) : null;
    const payment_instructions = formData.get("payment_instructions") as string | null;
    const banner_image = formData.get("banner_image") as File | null;
    const payment_qr = formData.get("payment_qr") as File | null;

    // Prepare update data
    const updateData: Record<string, unknown> = {
      title,
      slug,
      description,
      location,
      event_date,
      is_active,
      is_ticketed,
      ticket_price: is_ticketed ? ticket_price : null,
      ticket_capacity: is_ticketed ? ticket_capacity : null,
      payment_instructions: is_ticketed ? payment_instructions : null,
      updated_at: new Date().toISOString(),
    };

    // Handle banner image upload if provided
    if (banner_image && banner_image.size > 0) {
      const fileExt = banner_image.name.split(".").pop();
      const fileName = `${slug}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-banners")
        .upload(filePath, banner_image, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-banners").getPublicUrl(filePath);

      updateData.banner_image_url = publicUrl;
    }

    // Handle payment QR upload if provided
    if (is_ticketed && payment_qr && payment_qr.size > 0) {
      const fileExt = payment_qr.name.split(".").pop();
      const fileName = `qr-${slug}-${Date.now()}.${fileExt}`;
      const { error: qrUploadError } = await supabase.storage
        .from("event-banners")
        .upload(fileName, payment_qr, { cacheControl: "3600", upsert: true });
      if (qrUploadError) throw qrUploadError;
      const { data: { publicUrl } } = supabase.storage.from("event-banners").getPublicUrl(fileName);
      updateData.payment_qr_url = publicUrl;
    }

    // Update event
    const { data, error } = await supabase
      .from("events")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
