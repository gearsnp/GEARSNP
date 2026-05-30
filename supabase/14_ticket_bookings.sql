-- ============================================
-- Ticket Bookings System
-- ============================================

-- Add ticketing fields to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_ticketed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ticket_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- ============================================
-- TICKET BOOKINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ticket_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  booking_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_proof_url TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'approved', 'rejected')),
  qr_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  used_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_bookings_event ON ticket_bookings(event_id);
CREATE INDEX idx_ticket_bookings_qr_token ON ticket_bookings(qr_token);
CREATE INDEX idx_ticket_bookings_status ON ticket_bookings(payment_status);
CREATE INDEX idx_ticket_bookings_email ON ticket_bookings(customer_email);

-- Booking number trigger (format: TKT-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_booking_number_trigger
BEFORE INSERT ON ticket_bookings
FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

CREATE TRIGGER update_ticket_bookings_updated_at
BEFORE UPDATE ON ticket_bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE ticket_bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can create a booking (guest checkout)
CREATE POLICY "Anyone can insert ticket bookings"
  ON ticket_bookings FOR INSERT
  WITH CHECK (true);

-- Admins/staff can view and manage all bookings
CREATE POLICY "Admins can manage ticket bookings"
  ON ticket_bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Allow public read by qr_token (for scanner verify endpoint via service role)
-- Note: the verify API uses service role key, so this policy is just for reference
