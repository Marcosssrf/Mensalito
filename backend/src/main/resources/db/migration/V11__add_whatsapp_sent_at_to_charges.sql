-- Registra quando a notificação WhatsApp foi enviada com sucesso.
-- NULL = mensagem ainda não enviada ou falhou; NOT NULL = entregue à Evolution API.
ALTER TABLE charges ADD COLUMN whatsapp_sent_at TIMESTAMP;

CREATE INDEX idx_charges_whatsapp_sent_at ON charges(whatsapp_sent_at);
