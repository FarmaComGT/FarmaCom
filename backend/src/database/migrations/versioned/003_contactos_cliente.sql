-- Permite registrar varios teléfonos y correos por cliente.
-- Los valores se guardan normalizados desde la aplicación (teléfono sin
-- espacios ni guiones, correo en minúsculas) para detectar duplicados dentro
-- de un mismo cliente. Distintos clientes sí pueden compartir un contacto.

CREATE TABLE IF NOT EXISTS cliente_telefono (
    id_telefono SERIAL      PRIMARY KEY,
    id_cliente  INTEGER     NOT NULL,
    numero      VARCHAR(20) NOT NULL,

    CONSTRAINT fk_cliente_telefono_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente)
        ON DELETE CASCADE,

    CONSTRAINT uq_cliente_telefono_numero
        UNIQUE (id_cliente, numero),

    CONSTRAINT chk_cliente_telefono_formato
        CHECK (numero ~ '^\+?[0-9]{8,15}$')
);

CREATE TABLE IF NOT EXISTS cliente_email (
    id_email   SERIAL       PRIMARY KEY,
    id_cliente INTEGER      NOT NULL,
    correo     VARCHAR(150) NOT NULL,

    CONSTRAINT fk_cliente_email_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_email_correo
    ON cliente_email (id_cliente, LOWER(correo));
