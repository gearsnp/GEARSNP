"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertTriangle, ScanLine, RefreshCw, Users, Ticket, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNepaliCurrency } from "@/lib/utils";

type ScanState = "idle" | "scanning" | "loading" | "result";

type VerifyResult = {
  valid: boolean;
  already_used?: boolean;
  used_at?: string;
  error?: string;
  payment_status?: string;
  qr_code_id?: string;
  legacy_booking_id?: string;
  ticket_index?: number;
  total_tickets?: number;
  booking?: {
    id: string;
    booking_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    quantity: number;
    total_amount: number;
    unit_price: number;
    event: { title: string; event_date: string; location: string | null } | null;
  };
};

type QrCode = { id: string; ticket_index: number; used_at: string | null };
type GuestBooking = {
  id: string;
  booking_number: string;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  total_amount: number;
  unit_price: number;
  checked_in: number;
  qr_codes: QrCode[];
};
type ChecklistData = {
  bookings: GuestBooking[];
  stats: { total_bookings: number; total_tickets: number; checked_in: number };
};

interface TicketScannerProps {
  events: { id: string; title: string; event_date: string; location: string | null }[];
}

export default function TicketScanner({ events }: TicketScannerProps) {
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
    }
    scannerRef.current = null;
  }, []);

  const fetchChecklist = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setChecklistLoading(true);
    setChecklistError(null);
    try {
      const res = await fetch(`/api/ticket-bookings/checklist?event_id=${eventId}`);
      const json = await res.json();
      if (!res.ok) {
        setChecklistError(json.error || "Failed to load guest list");
      } else {
        setChecklist(json);
      }
    } catch {
      setChecklistError("Network error — check your connection");
    } finally {
      setChecklistLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) fetchChecklist(selectedEventId);
    else setChecklist(null);
  }, [selectedEventId, fetchChecklist]);

  const startScanner = useCallback(async () => {
    scannedRef.current = false;
    setState("scanning");
    setResult(null);
    const { Html5Qrcode } = await import("html5-qrcode");
    const html5QrCode = new Html5Qrcode("qr-scanner-container");
    scannerRef.current = html5QrCode;
    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 260, height: 260 } },
      async (decodedText: string) => {
        if (scannedRef.current) return;
        scannedRef.current = true;
        await stopScanner();
        setState("loading");
        const res = await fetch(`/api/ticket-bookings/verify?token=${encodeURIComponent(decodedText.trim())}`);
        const data: VerifyResult = await res.json();
        setResult(data);
        setState("result");
      },
      () => {}
    );
  }, [stopScanner]);

  const handleCheckIn = async () => {
    if (!result) return;
    setCheckingIn(true);
    try {
      let url: string;
      if (result.qr_code_id) {
        url = `/api/ticket-qr-codes/${result.qr_code_id}`;
      } else {
        url = `/api/ticket-bookings/${result.legacy_booking_id}`;
      }

      const body = result.qr_code_id ? undefined : JSON.stringify({ action: "mark_used" });
      const headers = result.qr_code_id ? undefined : { "Content-Type": "application/json" };
      const res = await fetch(url, { method: "PATCH", body, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");

      toast.success("Checked in successfully!");
      setResult((prev) => prev ? { ...prev, already_used: true, used_at: new Date().toISOString() } : prev);
      if (selectedEventId) fetchChecklist(selectedEventId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  };

  useEffect(() => { return () => { stopScanner(); }; }, [stopScanner]);

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Event selector */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Select Event</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e10600]"
        >
          <option value="">— Choose an event —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} · {new Date(ev.event_date).toLocaleDateString("en-NP", { month: "short", day: "numeric", year: "numeric" })}
            </option>
          ))}
        </select>
      </div>

      {/* Scanner */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div
          id="qr-scanner-container"
          className="w-full"
          style={{ minHeight: state === "scanning" ? "320px" : "0" }}
        />
        {state === "idle" && (
          <div className="p-8 text-center">
            <ScanLine className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-4">Tap Start Scanner to activate the camera</p>
            <Button onClick={startScanner} className="bg-[#e10600] hover:bg-[#c00500]">
              Start Scanner
            </Button>
          </div>
        )}
        {state === "loading" && (
          <div className="p-10 text-center">
            <div className="animate-spin h-10 w-10 border-4 border-[#e10600] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Verifying ticket...</p>
          </div>
        )}
      </div>

      {/* Scan result */}
      {state === "result" && result && (
        <div className="space-y-3">
          <div className={`rounded-xl p-4 border-2 ${
            !result.valid ? "bg-red-50 border-red-200" :
            result.already_used ? "bg-amber-50 border-amber-300" :
            "bg-green-50 border-green-300"
          }`}>
            <div className="flex items-center gap-3">
              {!result.valid ? <XCircle className="h-7 w-7 text-red-500 shrink-0" /> :
               result.already_used ? <AlertTriangle className="h-7 w-7 text-amber-500 shrink-0" /> :
               <CheckCircle className="h-7 w-7 text-green-600 shrink-0" />}
              <div>
                <p className={`font-bold text-lg ${!result.valid ? "text-red-700" : result.already_used ? "text-amber-700" : "text-green-700"}`}>
                  {!result.valid ? "Invalid Ticket" : result.already_used ? "Already Checked In" : "Valid Ticket"}
                </p>
                {result.ticket_index && result.total_tickets && (
                  <p className="text-sm font-medium text-gray-600">
                    Ticket {result.ticket_index} of {result.total_tickets}
                  </p>
                )}
                {result.already_used && result.used_at && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Used at {new Date(result.used_at).toLocaleString("en-NP")}
                  </p>
                )}
                {!result.valid && result.error && (
                  <p className="text-xs text-red-600 mt-0.5">{result.error}</p>
                )}
              </div>
            </div>
          </div>

          {result.booking && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              {result.booking.event && (
                <p className="font-bold text-sm">{result.booking.event.title}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Name</p><p className="font-semibold">{result.booking.customer_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-semibold">{result.booking.customer_phone}</p></div>
                <div><p className="text-xs text-muted-foreground">Booking #</p><p className="font-mono text-[#e10600] text-xs font-semibold">{result.booking.booking_number}</p></div>
                {Number(result.booking.unit_price) > 0 && (
                  <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold">{formatNepaliCurrency(Number(result.booking.total_amount))}</p></div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {result.valid && !result.already_used && (
              <Button onClick={handleCheckIn} disabled={checkingIn} className="flex-1 bg-green-600 hover:bg-green-700">
                {checkingIn ? "Checking in..." : "Check In"}
              </Button>
            )}
            <Button variant="outline" onClick={() => startScanner()} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Scan Next
            </Button>
          </div>
        </div>
      )}

      {state === "scanning" && (
        <Button variant="outline" onClick={async () => { await stopScanner(); setState("idle"); }} className="w-full">
          Stop Scanner
        </Button>
      )}

      {/* Guest Checklist */}
      {selectedEventId && (
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#e10600]" />
              <h2 className="font-bold text-lg">Guest List</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchChecklist(selectedEventId)} disabled={checklistLoading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${checklistLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {checklist && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Bookings", value: checklist.stats.total_bookings },
                  { label: "Tickets", value: checklist.stats.total_tickets },
                  { label: "Checked In", value: checklist.stats.checked_in, highlight: true },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 text-center border ${s.highlight ? "bg-green-50 border-green-200" : "bg-muted border-border"}`}>
                    <p className={`text-2xl font-black ${s.highlight ? "text-green-700" : ""}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Guest rows */}
              {checklist.bookings.length > 0 && (
                <div className="space-y-2">
                  {checklist.bookings.map((b) => {
                    const allIn = b.checked_in === b.quantity;
                    const noneIn = b.checked_in === 0;
                    return (
                      <div key={b.id} className={`rounded-xl border p-3 ${allIn ? "border-green-200 bg-green-50/50" : "border-border bg-card"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm truncate">{b.customer_name}</p>
                              <Badge className={`text-xs shrink-0 ${allIn ? "bg-green-100 text-green-700 border-green-200" : noneIn ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                                {b.checked_in}/{b.quantity} in
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />{b.customer_phone}
                            </p>
                            <p className="text-xs font-mono text-[#e10600] mt-0.5">{b.booking_number}</p>
                          </div>

                          {/* Individual ticket status dots */}
                          {b.qr_codes.length > 0 && (
                            <div className="flex gap-1 shrink-0 flex-wrap justify-end max-w-[100px]">
                              {b.qr_codes.map((qr) => (
                                <div
                                  key={qr.id}
                                  title={qr.used_at ? `Ticket ${qr.ticket_index}: checked in ${new Date(qr.used_at).toLocaleTimeString()}` : `Ticket ${qr.ticket_index}: not yet`}
                                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
                                    qr.used_at
                                      ? "bg-green-500 border-green-600 text-white"
                                      : "bg-muted border-border text-muted-foreground"
                                  }`}
                                >
                                  {qr.ticket_index}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Legacy: no individual qr_codes yet */}
                          {b.qr_codes.length === 0 && (
                            <Ticket className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {checklistLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <div className="animate-spin h-6 w-6 border-2 border-[#e10600] border-t-transparent rounded-full mx-auto mb-2" />
              Loading guest list...
            </div>
          )}

          {!checklistLoading && checklistError && (
            <div className="text-center py-8 text-red-500 text-sm">
              <p className="font-medium">Failed to load guest list</p>
              <p className="text-xs mt-1 text-muted-foreground">{checklistError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchChecklist(selectedEventId)}>
                Try Again
              </Button>
            </div>
          )}

          {!checklistLoading && !checklistError && checklist && checklist.bookings.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">No approved bookings for this event yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
