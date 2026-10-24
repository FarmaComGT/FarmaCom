-- Recrea la vista para que lote.* incorpore fecha_ingreso sin intentar
-- reemplazar las columnas calculadas que ya existían al final de la vista.

DROP VIEW IF EXISTS v_lote_estado;

CREATE VIEW v_lote_estado AS
SELECT
    l.*,
    CASE
        WHEN l.fecha_vencimiento < CURRENT_DATE
            THEN 'vencido'
        WHEN l.fecha_vencimiento <= (CURRENT_DATE + (p.meses_alerta_vencimiento || ' months')::INTERVAL)
            THEN 'proximo_a_vencer'
        ELSE 'normal'
    END AS estado_vencimiento,
    CASE
        WHEN l.stock_actual = 0
            THEN 'agotado'
        WHEN l.stock_actual <= p.stock_minimo
            THEN 'poco_stock'
        ELSE 'normal'
    END AS estado_stock
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto;
