-- Adiciona role na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'OWNER';

-- Tabela de convites para professores/staff
CREATE TABLE IF NOT EXISTS invites (
    id          UUID PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    email       VARCHAR(255),
    token       VARCHAR(255) NOT NULL UNIQUE,
    role        VARCHAR(20)  NOT NULL DEFAULT 'TEACHER',
    used        BOOLEAN      NOT NULL DEFAULT false,
    expires_at  TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_token     ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_tenant    ON invites(tenant_id);
