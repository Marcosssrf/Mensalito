ALTER TABLE students ADD COLUMN IF NOT EXISTS mercado_pago_customer_id VARCHAR(255);
ALTER TABLE charges ADD COLUMN IF NOT EXISTS mercado_pago_order_id VARCHAR(255);