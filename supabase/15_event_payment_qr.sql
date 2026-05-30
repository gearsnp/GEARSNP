-- Add payment QR code image to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;
