"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Upload, X, Ticket, Download, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type BookingFormValues = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  quantity: number;
};

function RacingLightsOverlay() {
  const [activeLight, setActiveLight] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLight((prev) => (prev < 5 ? prev + 1 : 0));
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-8">
      <div className="flex gap-4">
        {[0, 1, 2, 3, 4].map((light) => (
          <div
            key={light}
            className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-4 border-gray-700 transition-all duration-200 ${
              light < activeLight
                ? "bg-[#e10600] shadow-[0_0_30px_rgba(225,6,0,0.9)]"
                : "bg-gray-800"
            }`}
          />
        ))}
      </div>
      <p className="text-white text-lg md:text-xl font-bold tracking-widest uppercase">
        Booking Ticket...
      </p>
    </div>
  );
}

async function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

interface TicketBookingFormProps {
  event: {
    id: string;
    title: string;
    slug: string;
    event_date: string;
    location: string | null;
    ticket_price: number | null;
    ticket_capacity: number | null;
    payment_instructions: string | null;
    payment_qr_url: string | null;
  };
  remainingCapacity: number | null;
}

export default function TicketBookingForm({ event, remainingCapacity }: TicketBookingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const unitPrice = Number(event.ticket_price ?? 0);
  const isFree = unitPrice === 0;
  const maxQty = remainingCapacity !== null ? Math.min(10, remainingCapacity) : 10;

  const form = useForm<BookingFormValues>({
    defaultValues: { customer_name: "", customer_email: "", customer_phone: "", quantity: 1 },
  });

  const quantity = form.watch("quantity") || 1;
  const total = unitPrice * quantity;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large. Max 20MB.");
      return;
    }
    const compressed = await compressImage(file);
    setProofFile(compressed);
    const reader = new FileReader();
    reader.onloadend = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(compressed);
  };

  const removeProof = () => {
    setProofFile(null);
    setProofPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: BookingFormValues) => {
    if (!isFree && !proofFile) {
      toast.error("Please upload your payment proof");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("event_id", event.id);
      formData.append("customer_name", data.customer_name);
      formData.append("customer_email", data.customer_email);
      formData.append("customer_phone", data.customer_phone);
      formData.append("quantity", String(data.quantity));
      if (proofFile) formData.append("payment_proof", proofFile);

      const res = await fetch("/api/ticket-bookings", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Booking failed");

      router.push(
        `/booking-confirmation?ref=${json.booking_number}&email=${encodeURIComponent(data.customer_email)}&free=${json.is_free}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <RacingLightsOverlay />}
      <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="customer_name"
          rules={{ required: "Name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Your full name" disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customer_email"
          rules={{
            required: "Email is required",
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="you@example.com" disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customer_phone"
          rules={{ required: "Phone is required", minLength: { value: 10, message: "Enter a valid phone number" } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input {...field} type="tel" placeholder="98XXXXXXXX" disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          rules={{ required: true, min: { value: 1, message: "Minimum 1 ticket" }, max: { value: maxQty, message: `Maximum ${maxQty} tickets` } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Tickets</FormLabel>
              <FormControl>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange(Math.max(1, (field.value ?? 1) - 1))}
                    disabled={loading || (field.value ?? 1) <= 1}
                    className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center text-lg font-semibold tabular-nums">
                    {field.value ?? 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => field.onChange(Math.min(maxQty, (field.value ?? 1) + 1))}
                    disabled={loading || (field.value ?? 1) >= maxQty}
                    className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {maxQty < 10 && (
                    <span className="text-xs text-muted-foreground">max {maxQty}</span>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Total */}
        {!isFree && (
          <div className="bg-muted rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {quantity} × NPR {unitPrice.toLocaleString()}
            </span>
            <span className="font-bold text-lg">NPR {total.toLocaleString()}</span>
          </div>
        )}

        {/* Payment instructions + proof */}
        {!isFree && (
          <div className="space-y-4 border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm">Payment Instructions</h3>
            {event.payment_instructions ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.payment_instructions}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Payment details will be shared by the organizer.
              </p>
            )}

            {event.payment_qr_url && (
              <div>
                <p className="text-sm font-medium mb-2">Scan to Pay</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.payment_qr_url}
                  alt="Payment QR Code"
                  className="h-48 w-48 object-contain rounded-lg border border-border bg-white p-2"
                />
                <a
                  href={event.payment_qr_url}
                  download="payment-qr.jpg"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download QR
                </a>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">
                Upload Payment Proof <span className="text-red-500">*</span>
              </p>
              {proofPreview ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofPreview}
                    alt="Payment proof"
                    className="h-40 rounded-lg border border-border object-contain bg-muted"
                  />
                  <button
                    type="button"
                    onClick={removeProof}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-[#e10600]/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload screenshot</span>
                  <span className="text-xs text-muted-foreground/70 mt-1">JPG, PNG up to 10MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-[#e10600] hover:bg-[#c00500]"
          disabled={loading}
        >
          {loading ? (
            "Submitting..."
          ) : (
            <>
              <Ticket className="h-4 w-4 mr-2" />
              {isFree ? "Register Now" : "Submit Booking"}
            </>
          )}
        </Button>
      </form>
    </Form>
    </>
  );
}
