import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";

interface AdminBookingNotificationProps {
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

export default function AdminBookingNotificationEmail({
  bookingNumber,
  customerName,
  customerPhone,
  customerEmail,
  eventTitle,
  eventDate,
  quantity,
  unitPrice,
  totalAmount,
  isFree,
  createdAt,
}: AdminBookingNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>New Ticket Booking {bookingNumber} — {eventTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>New Ticket Booking</Heading>
            <Text style={headerSub}>{bookingNumber} · Pending Review</Text>
          </Section>

          <Section style={section}>
            <Heading as="h3" style={sectionTitle}>Event</Heading>
            <Text style={detail}><strong>{eventTitle}</strong></Text>
            <Text style={detail}>{eventDate}</Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Heading as="h3" style={sectionTitle}>Customer</Heading>
            <Text style={detail}><strong>Name:</strong> {customerName}</Text>
            <Text style={detail}><strong>Phone:</strong> {customerPhone}</Text>
            <Text style={detail}><strong>Email:</strong> {customerEmail}</Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Row>
              <Column style={{ flex: 1 }}><Text style={detail}>Tickets</Text></Column>
              <Column style={{ textAlign: "right" as const }}><Text style={detail}>{quantity}</Text></Column>
            </Row>
            <Row>
              <Column style={{ flex: 1 }}><Text style={detail}>Price per ticket</Text></Column>
              <Column style={{ textAlign: "right" as const }}>
                <Text style={detail}>{isFree ? "Free" : `NPR ${unitPrice.toLocaleString()}`}</Text>
              </Column>
            </Row>
            {!isFree && (
              <Row>
                <Column style={{ flex: 1 }}><Text style={totalText}>Total</Text></Column>
                <Column style={{ textAlign: "right" as const }}><Text style={totalText}>NPR {totalAmount.toLocaleString()}</Text></Column>
              </Row>
            )}
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              {isFree ? "Auto-approved (free event)" : "⚠️ Payment proof uploaded — review required"} · {createdAt}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f5f5f5", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { maxWidth: "520px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden" };
const header = { backgroundColor: "#1d4ed8", padding: "24px", textAlign: "center" as const };
const headerTitle = { color: "#ffffff", fontSize: "22px", fontWeight: "700", margin: "0 0 4px" };
const headerSub = { color: "#bfdbfe", fontSize: "14px", margin: "0" };
const section = { padding: "20px 24px 0" };
const sectionTitle = { fontSize: "14px", fontWeight: "700", textTransform: "uppercase" as const, color: "#888888", letterSpacing: "0.05em", margin: "0 0 10px" };
const detail = { fontSize: "14px", color: "#333333", margin: "0 0 6px", lineHeight: "1.5" };
const totalText = { fontSize: "15px", fontWeight: "700", color: "#111111", margin: "4px 0 0" };
const divider = { borderColor: "#eeeeee", margin: "16px 24px" };
const footer = { padding: "16px 24px" };
const footerText = { fontSize: "12px", color: "#999999", margin: "0" };
