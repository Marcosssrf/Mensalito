ALTER TABLE students
    ADD COLUMN IF NOT EXISTS trial_ends_at DATE NULL;

COMMENT ON COLUMN students.trial_ends_at IS
    'Data final do período de trial (inclusive). NULL = sem trial. Enquanto DATE <= trial_ends_at, nenhuma cobrança é gerada.';