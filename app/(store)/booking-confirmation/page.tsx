import Link from "next/link";
import { CheckCircle, Clock, Mail, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; email?: string; free?: string }>;
}) {
  const { ref, email, free } = await searchParams;
  const isFree = free === "true";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          {isFree ? (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-4">
              <Clock className="h-10 w-10 text-orange-500" />
            </div>
          )}

          <h1 className="text-2xl font-bold mb-2">
            {isFree ? "You're Registered!" : "Booking Submitted!"}
          </h1>
          <p className="text-muted-foreground">
            {isFree
              ? "Your ticket has been confirmed. Check your email for the QR code."
              : "Your booking is pending payment verification. We'll email your ticket once approved."}
          </p>
        </div>

        {ref && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="h-4 w-4 text-[#e10600]" />
              <span className="text-sm font-semibold">Booking Reference</span>
            </div>
            <p className="text-2xl font-mono font-bold text-[#e10600]">{ref}</p>
            {email && (
              <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Confirmation sent to <span className="font-medium">{email}</span>
              </div>
            )}
          </div>
        )}

        {!isFree && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800 text-left">
            <p className="font-semibold mb-1">What happens next?</p>
            <ol className="list-decimal list-inside space-y-1 text-amber-700">
              <li>Our team reviews your payment proof</li>
              <li>Once verified, your ticket QR code is emailed to you</li>
              <li>Present the QR code at the venue entrance</li>
            </ol>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link href="/events">
            <Button className="w-full bg-[#e10600] hover:bg-[#c00500]">
              View All Events
            </Button>
          </Link>
          <Link href="/shop">
            <Button variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
