import { Resend } from "resend";
import OrderConfirmationEmail from "@/emails/order-confirmation";
import ShippingConfirmationEmail from "@/emails/shipping-confirmation";
import TicketConfirmationEmail from "@/emails/ticket-confirmation";
import AdminOrderNotificationEmail from "@/emails/admin-order-notification";
import AdminBookingNotificationEmail from "@/emails/admin-booking-notification";

const ADMIN_EMAIL = "gearsnp@gmail.com";

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  size: string | null;
  image_url: string | null;
}

interface SendOrderConfirmationEmailParams {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  city: string;
  address: string;
  landmark: string | null;
  orderNote: string | null;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount?: number;
  promoCode?: string | null;
  total: number;
  createdAt: string;
}

export async function sendOrderConfirmationEmail(params: SendOrderConfirmationEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "GearsNP <onboarding@resend.dev>",
      to: params.customerEmail,
      subject: `Order Confirmation #${params.orderNumber} - GearsNP`,
      react: OrderConfirmationEmail(params),
    });

    if (error) {
      console.error("Error sending order confirmation email:", error);
      return { success: false, error: error.message };
    }

    console.log("Order confirmation email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

interface ShippingItem {
  name: string;
  price: number;
  quantity: number;
  size: string | null;
}

interface SendShippingConfirmationEmailParams {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  gaaubesiOrderId: string;
  city: string;
  address: string;
  landmark: string | null;
  items: ShippingItem[];
  total: number;
  shippedAt: string;
}

export async function sendShippingConfirmationEmail(params: SendShippingConfirmationEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "GearsNP <onboarding@resend.dev>",
      to: params.customerEmail,
      subject: `Your Order #${params.orderNumber} is on its way! - GearsNP`,
      react: ShippingConfirmationEmail(params),
    });

    if (error) {
      console.error("Error sending shipping confirmation email:", error);
      return { success: false, error: error.message };
    }

    console.log("Shipping confirmation email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send shipping confirmation email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

interface SendTicketConfirmationEmailParams {
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  tickets: { ticketIndex: number; qrCodeUrl: string; promoCode?: string; promoDiscount?: number }[];
  logoUrl?: string | null;
}

export async function sendTicketConfirmationEmail(params: SendTicketConfirmationEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "GearsNP <onboarding@resend.dev>",
      to: params.customerEmail,
      subject: `Your Ticket for ${params.eventTitle} — ${params.bookingNumber}`,
      react: TicketConfirmationEmail({
        bookingNumber: params.bookingNumber,
        customerName: params.customerName,
        eventTitle: params.eventTitle,
        eventDate: params.eventDate,
        eventLocation: params.eventLocation,
        quantity: params.quantity,
        unitPrice: params.unitPrice,
        totalAmount: params.totalAmount,
        tickets: params.tickets,
        logoUrl: params.logoUrl,
      }),
    });

    if (error) {
      console.error("Error sending ticket confirmation email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send ticket confirmation email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Admin notifications ──────────────────────────────────────────────────────

interface AdminOrderNotificationParams {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string;
  city: string;
  items: { product_name: string; quantity: number; unit_price: number; size?: string | null }[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  total: number;
  notes: string | null;
  createdAt: string;
}

export async function sendAdminOrderNotification(params: AdminOrderNotificationParams) {
  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "GearsNP <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `New Order ${params.orderNumber} — NPR ${params.total.toLocaleString()}`,
      react: AdminOrderNotificationEmail(params),
    });
    if (error) console.error("Admin order notification error:", error);
  } catch (error) {
    console.error("Failed to send admin order notification:", error);
  }
}

interface AdminBookingNotificationParams {
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  eventTitle: string;
  eventDate: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  isFree: boolean;
  createdAt: string;
}

export async function sendAdminBookingNotification(params: AdminBookingNotificationParams) {
  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "GearsNP <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `New Ticket Booking ${params.bookingNumber} — ${params.eventTitle}`,
      react: AdminBookingNotificationEmail(params),
    });
    if (error) console.error("Admin booking notification error:", error);
  } catch (error) {
    console.error("Failed to send admin booking notification:", error);
  }
}
