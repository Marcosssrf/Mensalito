ALTER TABLE charges ADD COLUMN IF NOT EXISTS manual BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_charges_manual ON charges(manual);
