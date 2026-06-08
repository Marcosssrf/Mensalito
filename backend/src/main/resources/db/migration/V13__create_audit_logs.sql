-- audit_logs: registro imutável de todas as ações relevantes do sistema
CREATE TABLE audit_logs (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID         NOT NULL,
    user_id      UUID,                          -- null = evento de sistema (scheduler/webhook)
    user_email   VARCHAR(255),
    action       VARCHAR(60)  NOT NULL,
    entity_type  VARCHAR(50)  NOT NULL,
    entity_id    UUID,
    description  VARCHAR(500) NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Índices de busca mais comuns
CREATE INDEX idx_audit_tenant_id   ON audit_logs (tenant_id);
CREATE INDEX idx_audit_entity      ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_created_at  ON audit_logs (created_at DESC);
