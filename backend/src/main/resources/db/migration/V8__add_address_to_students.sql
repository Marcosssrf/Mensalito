-- Adiciona campos de endereço na tabela students
ALTER TABLE students
    ADD COLUMN address_zip_code   VARCHAR(10),
    ADD COLUMN address_street     VARCHAR(255),
    ADD COLUMN address_number     VARCHAR(20),
    ADD COLUMN address_complement VARCHAR(255),
    ADD COLUMN address_neighborhood VARCHAR(255),
    ADD COLUMN address_city       VARCHAR(255),
    ADD COLUMN address_state      VARCHAR(2);
