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

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  size?: string | null;
}

interface AdminOrderNotificationProps {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string;
  city: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  total: number;
  notes: string | null;
  createdAt: string;
}

export default function AdminOrderNotificationEmail({
  orderNumber,
  customerName,
  customerPhone,
  customerEmail,
  shippingAddress,
  city,
  items,
  subtotal,
  shippingFee,
  discountAmount,
  total,
  notes,
  createdAt,
}: AdminOrderNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>New Order {orderNumber} — NPR {total.toLocaleString()}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>New Order Received</Heading>
            <Text style={headerSub}>{orderNumber}</Text>
          </Section>

          <Section style={section}>
            <Heading as="h3" style={sectionTitle}>Customer</Heading>
            <Row>
              <Column>
                <Text style={detail}><strong>Name:</strong> {customerName}</Text>
                <Text style={detail}><strong>Phone:</strong> {customerPhone}</Text>
                {customerEmail && <Text style={detail}><strong>Email:</strong> {customerEmail}</Text>}
                <Text style={detail}><strong>Address:</strong> {shippingAddress}, {city}</Text>
                {notes && <Text style={detail}><strong>Notes:</strong> {notes}</Text>}
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Heading as="h3" style={sectionTitle}>Items</Heading>
            {items.map((item, i) => (
              <Row key={i} style={itemRow}>
                <Column style={{ flex: 1 }}>
                  <Text style={detail}>
                    {item.product_name}
                    {item.size ? ` (${item.size})` : ""}
                    {" ×"} {item.quantity}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" as const }}>
                  <Text style={detail}>NPR {(item.unit_price * item.quantity).toLocaleString()}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Row>
              <Column style={{ flex: 1 }}><Text style={detail}>Subtotal</Text></Column>
              <Column style={{ textAlign: "right" as const }}><Text style={detail}>NPR {subtotal.toLocaleString()}</Text></Column>
            </Row>
            {shippingFee > 0 && (
              <Row>
                <Column style={{ flex: 1 }}><Text style={detail}>Shipping</Text></Column>
                <Column style={{ textAlign: "right" as const }}><Text style={detail}>NPR {shippingFee.toLocaleString()}</Text></Column>
              </Row>
            )}
            {discountAmount > 0 && (
              <Row>
                <Column style={{ flex: 1 }}><Text style={detail}>Discount</Text></Column>
                <Column style={{ textAlign: "right" as const }}><Text style={{ ...detail, color: "#16a34a" }}>- NPR {discountAmount.toLocaleString()}</Text></Column>
              </Row>
            )}
            <Row>
              <Column style={{ flex: 1 }}><Text style={totalText}>Total</Text></Column>
              <Column style={{ textAlign: "right" as const }}><Text style={totalText}>NPR {total.toLocaleString()}</Text></Column>
            </Row>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>Placed at {createdAt} · GearsNP Admin</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f5f5f5", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { maxWidth: "520px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden" };
const header = { backgroundColor: "#e10600", padding: "24px", textAlign: "center" as const };
const headerTitle = { color: "#ffffff", fontSize: "22px", fontWeight: "700", margin: "0 0 4px" };
const headerSub = { color: "#ffcccc", fontSize: "14px", margin: "0" };
const section = { padding: "20px 24px 0" };
const sectionTitle = { fontSize: "14px", fontWeight: "700", textTransform: "uppercase" as const, color: "#888888", letterSpacing: "0.05em", margin: "0 0 10px" };
const detail = { fontSize: "14px", color: "#333333", margin: "0 0 6px", lineHeight: "1.5" };
const itemRow = { marginBottom: "4px" };
const totalText = { fontSize: "15px", fontWeight: "700", color: "#111111", margin: "4px 0 0" };
const divider = { borderColor: "#eeeeee", margin: "16px 24px" };
const footer = { padding: "16px 24px" };
const footerText = { fontSize: "12px", color: "#999999", margin: "0" };
