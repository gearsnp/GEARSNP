import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";

interface TicketEntry {
  ticketIndex: number;
  qrCodeUrl: string;
}

interface TicketConfirmationEmailProps {
  bookingNumber: string;
  customerName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  tickets: TicketEntry[];
  logoUrl?: string | null;
}

export default function TicketConfirmationEmail({
  bookingNumber,
  customerName,
  eventTitle,
  eventDate,
  eventLocation,
  quantity,
  unitPrice,
  totalAmount,
  tickets,
  logoUrl,
}: TicketConfirmationEmailProps) {
  const isFree = unitPrice === 0;

  return (
    <Html>
      <Head />
      <Preview>
        Your {quantity === 1 ? "ticket" : `${quantity} tickets`} for {eventTitle} — {bookingNumber}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt="GearsNP"
                width={120}
                height={50}
                style={{ display: "block", margin: "0 auto 10px", objectFit: "contain" }}
              />
            ) : (
              <Heading style={headerTitle}>GearsNP</Heading>
            )}
            <Text style={headerSubtitle}>
              {quantity === 1 ? "Your Ticket is Confirmed!" : `Your ${quantity} Tickets are Confirmed!`}
            </Text>
          </Section>

          {/* Greeting */}
          <Section style={section}>
            <Text style={text}>Hi {customerName},</Text>
            <Text style={text}>
              Your booking has been approved. Present each QR code at the venue entrance — one scan per ticket.
            </Text>
          </Section>

          {/* Event Details */}
          <Section style={eventCard}>
            <Heading as="h2" style={eventTitle_}>
              {eventTitle}
            </Heading>
            <Row>
              <Column>
                <Text style={eventDetail}><strong>Date:</strong> {eventDate}</Text>
                {eventLocation && (
                  <Text style={eventDetail}><strong>Location:</strong> {eventLocation}</Text>
                )}
                <Text style={eventDetail}><strong>Booking #:</strong> {bookingNumber}</Text>
                <Text style={eventDetail}>
                  <strong>Tickets:</strong> {quantity} {quantity === 1 ? "ticket" : "tickets"}
                </Text>
                {!isFree && (
                  <Text style={eventDetail}>
                    <strong>Total Paid:</strong> NPR {totalAmount.toLocaleString()}
                  </Text>
                )}
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* QR Codes — one per ticket */}
          <Section style={qrSection}>
            <Text style={qrSectionTitle}>
              {quantity === 1 ? "Your Ticket QR Code" : "Your Ticket QR Codes"}
            </Text>
            <Text style={qrSectionSubtitle}>
              Show these at the venue entrance. Each QR code is for one person.
            </Text>

            {tickets.map((ticket) => (
              <Section key={ticket.ticketIndex} style={ticketBlock}>
                {quantity > 1 && (
                  <Text style={ticketLabel}>
                    Ticket {ticket.ticketIndex} of {quantity}
                  </Text>
                )}
                <Img
                  src={ticket.qrCodeUrl}
                  width={200}
                  height={200}
                  alt={`QR Code — Ticket ${ticket.ticketIndex}`}
                  style={qrImage}
                />
              </Section>
            ))}

            <Text style={qrNote}>
              Do not share these QR codes. Each code is unique and can only be scanned once.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              If you have any questions, contact us on Instagram or TikTok.
            </Text>
            <Text style={footerText}>© GearsNP — Formula 1 Merchandise Nepal</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f5f5f5",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};
const container = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
};
const header = {
  backgroundColor: "#e10600",
  padding: "32px 24px",
  textAlign: "center" as const,
};
const headerTitle = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0 0 4px",
};
const headerSubtitle = {
  color: "#ffcccc",
  fontSize: "16px",
  margin: "0",
};
const section = { padding: "24px 24px 0" };
const text = {
  fontSize: "15px",
  color: "#333333",
  lineHeight: "1.6",
  margin: "0 0 12px",
};
const eventCard = {
  margin: "16px 24px",
  padding: "20px",
  backgroundColor: "#f9f9f9",
  borderRadius: "8px",
  borderLeft: "4px solid #e10600",
};
const eventTitle_ = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#111111",
  margin: "0 0 16px",
};
const eventDetail = {
  fontSize: "14px",
  color: "#444444",
  margin: "0 0 6px",
  lineHeight: "1.5",
};
const divider = { borderColor: "#eeeeee", margin: "0 24px" };
const qrSection = {
  padding: "24px",
  textAlign: "center" as const,
};
const qrSectionTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#111111",
  margin: "0 0 6px",
};
const qrSectionSubtitle = {
  fontSize: "13px",
  color: "#666666",
  margin: "0 0 20px",
};
const ticketBlock = {
  margin: "0 0 24px",
  padding: "0",
  textAlign: "center" as const,
};
const ticketLabel = {
  display: "inline-block",
  backgroundColor: "#111111",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.05em",
  padding: "3px 12px",
  borderRadius: "999px",
  margin: "0 0 10px",
};
const qrImage = {
  display: "block",
  margin: "0 auto",
  border: "2px solid #e5e5e5",
  borderRadius: "8px",
};
const qrNote = {
  fontSize: "12px",
  color: "#888888",
  margin: "4px 0 0",
};
const footer = {
  padding: "20px 24px",
  textAlign: "center" as const,
};
const footerText = {
  fontSize: "12px",
  color: "#999999",
  margin: "0 0 4px",
};
