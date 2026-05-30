import { supabaseServer } from "@/lib/supabase/server";
import TicketScanner from "@/components/admin/TicketScanner";
import { ScanLine } from "lucide-react";

export default async function TicketScannerPage() {
  const supabase = await supabaseServer();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, location")
    .eq("is_active", true)
    .order("event_date", { ascending: false })
    .limit(20);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ScanLine className="h-6 w-6 text-[#e10600]" />
          <h1 className="text-2xl font-bold">Ticket Scanner</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Scan QR codes at the venue entrance to verify and check in attendees
        </p>
      </div>
      <TicketScanner events={events ?? []} />
    </div>
  );
}
