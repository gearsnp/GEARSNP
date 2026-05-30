-- Individual QR code per physical ticket
-- One booking with quantity=3 generates 3 rows here
CREATE TABLE IF NOT EXISTS ticket_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES ticket_bookings(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  ticket_index INTEGER NOT NULL,  -- 1-based: 1 of 3, 2 of 3, 3 of 3
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_qr_codes_booking ON ticket_qr_codes(booking_id);
CREATE INDEX idx_ticket_qr_codes_token ON ticket_qr_codes(qr_token);

ALTER TABLE ticket_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ticket qr codes"
  ON ticket_qr_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );
