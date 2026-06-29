-- Add per-event promo code settings for ticket buyers
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_promo_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_promo_discount DECIMAL(10, 2) NOT NULL DEFAULT 100;
