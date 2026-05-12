ALTER TABLE tenants ADD COLUMN IF NOT EXISTS evolution_instance_key VARCHAR(255);

UPDATE tenants
SET evolution_instance_key = evolution_instance_name
WHERE evolution_instance_key IS NULL
  AND evolution_instance_name IS NOT NULL;