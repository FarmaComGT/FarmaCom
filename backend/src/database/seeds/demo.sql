-- Datos ficticios. El runner aporta la transacción y los hashes.
-- Una carga por base; no mezcla, elimina ni regenera información operativa.
SELECT pg_advisory_xact_lock(726341902);
CREATE TABLE IF NOT EXISTS seed_demo_ejecucion (
    version TEXT PRIMARY KEY, fecha_base DATE NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $demo$
DECLARE
    hoy DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::DATE;
BEGIN
    IF EXISTS (SELECT 1 FROM seed_demo_ejecucion WHERE version = 'baja-verapaz-v1') THEN
        RAISE NOTICE 'Demo Baja Verapaz ya cargada; se conserva sin cambios.';
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM sucursal) OR EXISTS (SELECT 1 FROM usuario)
       OR EXISTS (SELECT 1 FROM producto) OR EXISTS (SELECT 1 FROM cliente)
       OR EXISTS (SELECT 1 FROM paciente) OR EXISTS (SELECT 1 FROM laboratorio) THEN
        RAISE EXCEPTION 'La demo Baja Verapaz requiere una base vacía con las migraciones aplicadas. Use una base exclusiva de demo; no se eliminan ni mezclan datos existentes.';
    END IF;
    CREATE TEMP TABLE demo_sucursal (n INT, ciudad TEXT, nombre TEXT, direccion TEXT, tickets INT) ON COMMIT DROP;
    INSERT INTO demo_sucursal VALUES
      (1, 'Salamá', 'FarmaCom Salamá', 'Barrio El Centro, Salamá, Baja Verapaz', 18),
      (2, 'San Jerónimo', 'FarmaCom San Jerónimo', 'Barrio El Centro, San Jerónimo, Baja Verapaz', 12),
      (3, 'Rabinal', 'FarmaCom Rabinal', 'Zona 1, Rabinal, Baja Verapaz', 9);
    INSERT INTO ciudad (nombre_ciudad) SELECT ciudad FROM demo_sucursal ON CONFLICT DO NOTHING;
    INSERT INTO sucursal (id_ciudad,nombre_sucursal,direccion)
      SELECT c.id_ciudad,d.nombre,d.direccion FROM demo_sucursal d JOIN ciudad c ON c.nombre_ciudad=d.ciudad;
    ALTER TABLE demo_sucursal ADD COLUMN id INT;
    UPDATE demo_sucursal d SET id=s.id_sucursal FROM sucursal s WHERE s.nombre_sucursal=d.nombre;
    INSERT INTO caja (id_sucursal,nombre) SELECT id,'Caja principal' FROM demo_sucursal;
    INSERT INTO telefono_sucursal (id_sucursal,numero) SELECT id,'7940'||lpad(n::text,4,'0') FROM demo_sucursal;
    INSERT INTO correo_sucursal (id_sucursal,correo) SELECT id,'sucursal'||n||'@farmacom.example' FROM demo_sucursal;
    INSERT INTO laboratorio (id_ciudad,nombre_laboratorio,direccion)
      SELECT id_ciudad,'Laboratorio Salamá','Barrio El Centro, Salamá, Baja Verapaz' FROM ciudad WHERE nombre_ciudad='Salamá';
    INSERT INTO usuario (id_sucursal,nombre_usuario,correo_usuario,contrasena_hash,rol)
      SELECT id,'María Fernanda López','dueno@farma.com',current_setting('farmacom.seed.dueno_hash'),'dueno' FROM demo_sucursal WHERE n=1;
    INSERT INTO usuario (id_sucursal,id_laboratorio,nombre_usuario,correo_usuario,contrasena_hash,rol)
      SELECT d.id,l.id_laboratorio,'Ana Lucía Pérez','laboratorista@farma.com',current_setting('farmacom.seed.laboratorista_hash'),'laboratorista'
      FROM demo_sucursal d CROSS JOIN laboratorio l WHERE d.n=1;
    INSERT INTO usuario (id_sucursal,nombre_usuario,correo_usuario,contrasena_hash,rol)
      SELECT id,(ARRAY['Carlos Méndez','Rosa Chén','José García'])[n],
      'admin.'||n||'@farmacom.example',current_setting('farmacom.seed.administrador_hash'),'administrador' FROM demo_sucursal;
    INSERT INTO usuario (id_sucursal,nombre_usuario,correo_usuario,contrasena_hash,rol)
      SELECT id,(ARRAY['Elena Ramírez','Luis Caal','Marta López'])[n],
      'caja.'||n||'@farmacom.example',current_setting('farmacom.seed.dependiente_hash'),'dependiente' FROM demo_sucursal;
    INSERT INTO usuario (id_sucursal,nombre_usuario,correo_usuario,contrasena_hash,rol,estado_usuario)
      SELECT id,'Sistema (vencimiento automático)','sistema.laboratorio@farmacom.local',
      crypt(gen_random_uuid()::text,gen_salt('bf')),'administrador','inactivo' FROM demo_sucursal WHERE n=1;

    -- Casas, distribuidores y precios ilustrativos; no son cotizaciones comerciales.
    INSERT INTO categoria (nombre) VALUES ('Analgésicos'),('Antibióticos'),('Antialérgicos'),('Salud digestiva'),
      ('Vitaminas'),('Cuidado personal'),('Enfermedades crónicas'),('Primeros auxilios') ON CONFLICT DO NOTHING;
    INSERT INTO casa_farmaceutica (nombre) VALUES ('Laboratorios Verapaz Demo'),('Laboratorios del Valle Demo'),('Salud del Norte Demo') ON CONFLICT DO NOTHING;
    INSERT INTO proveedor (nombre) VALUES ('Distribuidora Médica Verapaz Demo'),('Droguería Regional Demo'),('Suministros del Valle Demo') ON CONFLICT DO NOTHING;
    INSERT INTO casa_proveedor SELECT c.id_casa,p.id_proveedor FROM casa_farmaceutica c CROSS JOIN proveedor p;
    INSERT INTO proveedor_telefono (id_proveedor,numero) SELECT id_proveedor,'79409900' FROM proveedor;
    INSERT INTO proveedor_email (id_proveedor,correo) SELECT id_proveedor,'pedidos'||id_proveedor||'@distribuidora.example' FROM proveedor;
    INSERT INTO presentacion (nombre) VALUES ('Frasco'),('Tubo'),('Sobre'),('Paquete') ON CONFLICT DO NOTHING;
    CREATE TEMP TABLE demo_catalogo (n SERIAL,generico TEXT,concentracion TEXT,presentacion TEXT,categoria TEXT,precio NUMERIC) ON COMMIT DROP;
    INSERT INTO demo_catalogo (generico,concentracion,presentacion,categoria,precio) VALUES
      ('Paracetamol','500 mg','Blíster','Analgésicos',8),
      ('Paracetamol','120 mg/5 mL','Frasco','Analgésicos',22),
      ('Ibuprofeno','400 mg','Blíster','Analgésicos',12),
      ('Ibuprofeno','100 mg/5 mL','Frasco','Analgésicos',28),
      ('Diclofenaco','50 mg','Blíster','Analgésicos',10),
      ('Naproxeno','500 mg','Blíster','Analgésicos',18),
      ('Amoxicilina','500 mg','Caja','Antibióticos',38),
      ('Amoxicilina','250 mg/5 mL','Frasco','Antibióticos',32),
      ('Azitromicina','500 mg','Caja','Antibióticos',48),
      ('Cefalexina','500 mg','Caja','Antibióticos',45),
      ('Loratadina','10 mg','Blíster','Antialérgicos',10),
      ('Loratadina','5 mg/5 mL','Frasco','Antialérgicos',24),
      ('Cetirizina','10 mg','Blíster','Antialérgicos',15),
      ('Clorfeniramina','4 mg','Blíster','Antialérgicos',6),
      ('Omeprazol','20 mg','Caja','Salud digestiva',25),
      ('Esomeprazol','40 mg','Caja','Salud digestiva',65),
      ('Sales de rehidratación oral','27.9 g','Sobre','Salud digestiva',5),
      ('Hidróxido de aluminio y magnesio','200 mg/200 mg/5 mL','Frasco','Salud digestiva',30),
      ('Simeticona','100 mg/mL','Frasco','Salud digestiva',27),
      ('Probióticos','5 mil millones UFC','Caja','Salud digestiva',72),
      ('Ácido ascórbico','500 mg','Caja','Vitaminas',28),
      ('Complejo B','B1/B6/B12','Caja','Vitaminas',35),
      ('Sulfato ferroso','300 mg','Caja','Vitaminas',18),
      ('Ácido fólico','5 mg','Caja','Vitaminas',16),
      ('Calcio y vitamina D','600 mg/400 UI','Frasco','Vitaminas',58),
      ('Multivitamínico infantil','120 mL','Frasco','Vitaminas',42),
      ('Losartán','50 mg','Caja','Enfermedades crónicas',35),
      ('Enalapril','10 mg','Caja','Enfermedades crónicas',22),
      ('Metformina','850 mg','Caja','Enfermedades crónicas',32),
      ('Amlodipino','5 mg','Caja','Enfermedades crónicas',28),
      ('Atorvastatina','20 mg','Caja','Enfermedades crónicas',48),
      ('Glibenclamida','5 mg','Caja','Enfermedades crónicas',20),
      ('Alcohol etílico','70 %, 120 mL','Frasco','Primeros auxilios',12),
      ('Agua oxigenada','3 %, 120 mL','Frasco','Primeros auxilios',10),
      ('Gasa estéril','10 × 10 cm','Paquete','Primeros auxilios',8),
      ('Venda elástica','3 pulgadas','Unidad','Primeros auxilios',15),
      ('Clotrimazol','1 %, 20 g','Tubo','Cuidado personal',22),
      ('Óxido de zinc','20 %, 30 g','Tubo','Cuidado personal',18),
      ('Protector solar','FPS 50, 100 mL','Tubo','Cuidado personal',85),
      ('Jabón de avena','100 g','Unidad','Cuidado personal',18);
    ALTER TABLE demo_catalogo ADD COLUMN id INT;
    INSERT INTO producto (codigo,codigo_barras,nombre_comercial,nombre_generico,concentracion,id_presentacion,
      descripcion,id_categoria,id_casa,id_proveedor,stock_minimo,meses_alerta_vencimiento,aplica_mayoreo,fecha_creacion)
      SELECT 'BV-'||lpad(d.n::text,3,'0'),'DEMO-BV-'||lpad(d.n::text,3,'0'),d.generico,d.generico,d.concentracion,
      pr.id_presentacion,'Catálogo de demostración: '||d.presentacion,ca.id_categoria,cf.id_casa,pv.id_proveedor,8,3,
      d.presentacion IN ('Blíster','Sobre'),hoy-75 FROM demo_catalogo d
      JOIN presentacion pr ON pr.nombre=d.presentacion JOIN categoria ca ON ca.nombre=d.categoria
      JOIN casa_farmaceutica cf ON cf.nombre=(ARRAY['Laboratorios Verapaz Demo','Laboratorios del Valle Demo','Salud del Norte Demo'])[1+(d.n-1)%3]
      JOIN proveedor pv ON pv.nombre=(ARRAY['Distribuidora Médica Verapaz Demo','Droguería Regional Demo','Suministros del Valle Demo'])[1+(d.n-1)%3];
    UPDATE demo_catalogo d SET id=p.id_producto FROM producto p WHERE p.codigo='BV-'||lpad(d.n::text,3,'0');

    CREATE TEMP TABLE demo_persona ON COMMIT DROP AS
      SELECT n,(ARRAY['María','José','Ana','Carlos','Juana','Pedro','Rosa','Luis','Elena','Miguel'])[1+(n-1)%10]
      ||' '||(ARRAY['López','Chén','García','Caal','Ramírez','Pérez'])[1+(n-1)/10]
      ||' '||(ARRAY['Méndez','Ical','Hernández','Gómez','Cruz'])[1+(n-1)%5] AS nombre FROM generate_series(1,60) n;
    INSERT INTO cliente (nombre_cliente,nit,observaciones) SELECT nombre,NULL,'DEMO-BV-CLIENTE-'||n FROM demo_persona;
    INSERT INTO cliente_telefono (id_cliente,numero)
      SELECT c.id_cliente,'5500'||lpad(p.n::text,4,'0') FROM demo_persona p JOIN cliente c ON c.observaciones='DEMO-BV-CLIENTE-'||p.n;
    INSERT INTO cliente_email (id_cliente,correo)
      SELECT c.id_cliente,'cliente'||p.n||'@demo.example' FROM demo_persona p JOIN cliente c ON c.observaciones='DEMO-BV-CLIENTE-'||p.n WHERE p.n%3=0;
    INSERT INTO paciente (id_laboratorio,nombre_paciente,fecha_nacimiento,sexo,telefono,direccion,observaciones,fecha_registro)
      SELECT l.id_laboratorio,p.nombre,(hoy-make_interval(years=>18+p.n))::date,
      CASE WHEN p.n%2=1 THEN 'F' ELSE 'M' END,'5500'||lpad(p.n::text,4,'0'),d.direccion,
      'Persona ficticia de demostración; sin DPI real.',(hoy-65)::timestamp AT TIME ZONE 'America/Guatemala'
      FROM demo_persona p JOIN demo_sucursal d ON d.n=1+(p.n-1)%3 CROSS JOIN laboratorio l WHERE p.n<=30;
    INSERT INTO expediente_laboratorio (id_paciente,antecedentes,fecha_creacion)
      SELECT id_paciente,'Expediente sintético de demostración.',fecha_registro FROM paciente;
    INSERT INTO visita_laboratorio (id_expediente,id_usuario,motivo_visita,notas,fecha_visita)
      SELECT e.id_expediente,u.id_usuario,(ARRAY['Control de glucosa','Hematología completa','Perfil lipídico'])[1+e.id_expediente%3],
      'Visita ficticia, sin resultados clínicos.',(hoy-(r*20+e.id_expediente%10))::timestamp AT TIME ZONE 'America/Guatemala'
      FROM expediente_laboratorio e CROSS JOIN generate_series(0,1) r CROSS JOIN usuario u WHERE u.rol='laboratorista';

    CREATE TEMP TABLE demo_sesion ON COMMIT DROP AS
      SELECT nextval('sesion_caja_id_sesion_caja_seq')::int AS id,d.id AS sucursal,d.n,d.tickets,c.id_caja,u.id_usuario,hoy-dia AS fecha,dia
      FROM demo_sucursal d JOIN caja c ON c.id_sucursal=d.id JOIN usuario u ON u.id_sucursal=d.id AND u.rol='dependiente'
      CROSS JOIN generate_series(0,60) dia;
    INSERT INTO sesion_caja (id_sesion_caja,id_caja,id_usuario_apertura,fecha_operacion,turno,fecha_hora_apertura,fondo_inicial,observaciones)
      SELECT id,id_caja,id_usuario,fecha,'mañana',fecha::timestamp AT TIME ZONE 'America/Guatemala',300,'Turno de demostración' FROM demo_sesion WHERE dia=0;
    -- Se insertan cerradas para respetar la única sesión abierta por caja.
    INSERT INTO sesion_caja (id_sesion_caja,id_caja,id_usuario_apertura,id_usuario_cierre,fecha_operacion,turno,
      fecha_hora_apertura,fecha_hora_cierre,fondo_inicial,total_ventas_efectivo,total_ventas_tarjeta,total_entradas,total_salidas,
      efectivo_esperado,efectivo_contado,diferencia_efectivo,cantidad_ventas,cantidad_anulaciones,estado,observaciones)
      SELECT id,id_caja,id_usuario,id_usuario,fecha,'mañana',(fecha+time '07:00') AT TIME ZONE 'America/Guatemala',
      (fecha+time '19:00') AT TIME ZONE 'America/Guatemala',300,0,0,0,0,300,300,0,0,0,'cerrada','Cierre de demostración' FROM demo_sesion WHERE dia>0;
    CREATE TEMP TABLE demo_ticket ON COMMIT DROP AS
      SELECT nextval('venta_id_venta_seq')::int AS id,s.*,t,(s.dia*41+s.n*17+t) AS clave,
      CASE WHEN s.dia=0 THEN (s.fecha::timestamp AT TIME ZONE 'America/Guatemala')+t*interval '1 second'
      ELSE ((s.fecha+time '08:00') AT TIME ZONE 'America/Guatemala')+t*interval '30 minutes' END AS momento
      FROM (SELECT id AS sesion,sucursal,n,tickets,id_usuario,fecha,dia FROM demo_sesion) s
      CROSS JOIN LATERAL generate_series(1,CASE WHEN s.dia=0 THEN 6 ELSE s.tickets+(s.dia%3)-1 END) t;
    INSERT INTO lote (id_producto,id_proveedor,id_sucursal,numero_lote,fecha_ingreso,fecha_vencimiento,
      cantidad_ingresada,stock_actual,precio_compra,precio_venta,margen_ganancia,precio_mayoreo,cantidad_mayoreo)
      SELECT p.id_producto,p.id_proveedor,s.id,'BV-'||d.n||'-'||s.n||'-'||r,
      (hoy-70)::timestamp AT TIME ZONE 'America/Guatemala',hoy+CASE WHEN r=1 THEN 540 WHEN d.n%4=0 THEN -10 WHEN d.n%4=1 THEN 40 ELSE 360 END,
      1,CASE WHEN d.n%13=0 THEN 0 WHEN d.n%11=0 THEN 2 WHEN r=2 THEN 6 ELSE 40+(d.n*s.n)%60 END,
      round(d.precio*0.65,2),d.precio,round((d.precio-round(d.precio*0.65,2))/round(d.precio*0.65,2),4),
      CASE WHEN p.aplica_mayoreo THEN round(d.precio*0.9,2) END,CASE WHEN p.aplica_mayoreo THEN 6 END
      FROM demo_catalogo d JOIN producto p ON p.id_producto=d.id CROSS JOIN demo_sucursal s CROSS JOIN generate_series(1,2) r;
    CREATE TEMP TABLE demo_detalle ON COMMIT DROP AS
      SELECT t.id AS venta,l.id_lote,1+(t.clave+j)%3 AS cantidad,l.precio_venta,l.precio_compra,p.id_producto,p.nombre_comercial,l.numero_lote
      FROM demo_ticket t CROSS JOIN LATERAL generate_series(1,1+t.clave%3) j
      JOIN demo_catalogo d ON d.n=1+(t.clave*7+j*11)%40 JOIN producto p ON p.id_producto=d.id
      JOIN lote l ON l.id_producto=d.id AND l.id_sucursal=t.sucursal AND l.numero_lote='BV-'||d.n||'-'||t.n||'-1';
    INSERT INTO venta (id_venta,id_sucursal,id_usuario,id_sesion_caja,id_cliente,metodo_pago,proveedor_pago,referencia_pago,estado_pago,
      total,monto_recibido,cambio,estado,fecha_venta,fecha_anulacion,motivo_anulacion,id_usuario_anulacion)
      SELECT t.id,t.sucursal,t.id_usuario,t.sesion,CASE WHEN t.clave%4<>0 THEN c.id_cliente END,
      CASE WHEN t.clave%5=0 THEN 'tarjeta' ELSE 'efectivo' END,CASE WHEN t.clave%5=0 THEN 'demo' END,
      CASE WHEN t.clave%5=0 THEN 'DEMO-BV-'||t.id END,CASE WHEN t.clave%5=0 THEN 'pagado' END,a.total,
      CASE WHEN t.clave%5=0 THEN a.total ELSE ceil(a.total/50)*50 END,
      CASE WHEN t.clave%5=0 THEN 0 ELSE ceil(a.total/50)*50-a.total END,
      CASE WHEN t.clave%37=0 THEN 'anulada' ELSE 'completada' END,t.momento,
      CASE WHEN t.clave%37=0 THEN t.momento+interval '1 second' END,
      CASE WHEN t.clave%37=0 THEN 'Corrección de ticket duplicado (demo)' END,CASE WHEN t.clave%37=0 THEN t.id_usuario END
      FROM demo_ticket t JOIN (SELECT venta,sum(cantidad*precio_venta) AS total FROM demo_detalle GROUP BY venta) a ON a.venta=t.id
      JOIN cliente c ON c.observaciones='DEMO-BV-CLIENTE-'||(1+t.clave%60);
    INSERT INTO detalle_venta (id_venta,id_lote,cantidad,precio_unitario,costo_unitario,id_producto_historico,numero_lote_historico,nombre_producto_historico)
      SELECT venta,id_lote,cantidad,precio_venta,precio_compra,id_producto,numero_lote,nombre_comercial FROM demo_detalle;
    UPDATE lote l SET cantidad_ingresada=greatest(1,l.stock_actual+x.vendido+CASE WHEN l.numero_lote LIKE '%-1' THEN 3 ELSE 0 END)
      FROM (SELECT l2.id_lote,coalesce(sum(d.cantidad) FILTER (WHERE v.estado='completada'),0)::int AS vendido
      FROM lote l2 LEFT JOIN detalle_venta d ON d.id_lote=l2.id_lote LEFT JOIN venta v ON v.id_venta=d.id_venta GROUP BY l2.id_lote) x WHERE l.id_lote=x.id_lote;
    INSERT INTO movimiento_inventario (id_lote,tipo,cantidad_anterior,cantidad_nueva,id_usuario,fecha_movimiento,id_sucursal,motivo,referencia)
      SELECT l.id_lote,'entrada',0,l.cantidad_ingresada,u.id_usuario,l.fecha_ingreso,l.id_sucursal,'Recepción inicial de demo','DEMO-BV-RECEPCION'
      FROM lote l JOIN usuario u ON u.id_sucursal=l.id_sucursal AND u.rol='dependiente';
    INSERT INTO movimiento_inventario (id_lote,tipo,cantidad_anterior,cantidad_nueva,id_usuario,fecha_movimiento,id_sucursal,motivo,referencia)
      SELECT l.id_lote,'ajuste',1,0,u.id_usuario,l.fecha_ingreso+interval '1 minute',l.id_sucursal,'Merma de demostración','DEMO-BV-MERMA'
      FROM lote l JOIN usuario u ON u.id_sucursal=l.id_sucursal AND u.rol='dependiente' WHERE l.stock_actual=0 AND l.cantidad_ingresada=1;
    WITH eventos AS (
      SELECT d.id_lote,v.id_venta,v.id_usuario,v.id_sucursal,v.fecha_venta AS fecha,-d.cantidad AS delta,'venta'::text AS tipo FROM detalle_venta d JOIN venta v USING(id_venta)
      UNION ALL
      SELECT d.id_lote,v.id_venta,v.id_usuario,v.id_sucursal,v.fecha_anulacion,d.cantidad,'anulacion' FROM detalle_venta d JOIN venta v USING(id_venta) WHERE v.estado='anulada'
    ), saldo AS (
      SELECT e.*,l.cantidad_ingresada+sum(delta) OVER (PARTITION BY e.id_lote ORDER BY fecha,id_venta,tipo ROWS UNBOUNDED PRECEDING) AS nuevo FROM eventos e JOIN lote l USING(id_lote)
    )
    INSERT INTO movimiento_inventario (id_lote,tipo,cantidad_anterior,cantidad_nueva,id_usuario,fecha_movimiento,id_sucursal,motivo,referencia)
      SELECT id_lote,tipo,nuevo-delta,nuevo,id_usuario,fecha,id_sucursal,'Ticket de demostración','VENTA-'||id_venta FROM saldo;
    INSERT INTO movimiento_inventario (id_lote,tipo,cantidad_anterior,cantidad_nueva,id_usuario,fecha_movimiento,id_sucursal,motivo,referencia)
      SELECT l.id_lote,'ajuste',l.stock_actual+3,l.stock_actual,u.id_usuario,CURRENT_TIMESTAMP,l.id_sucursal,
      'Ajuste por conteo físico (demo)','DEMO-BV-CONTEO' FROM lote l
      JOIN usuario u ON u.id_sucursal=l.id_sucursal AND u.rol='dependiente' WHERE l.numero_lote LIKE '%-1';
    INSERT INTO historial_precio_lote (id_lote,tipo_precio,valor_nuevo,origen,id_usuario,fecha_cambio)
      SELECT l.id_lote,t.tipo,CASE WHEN t.tipo='compra' THEN l.precio_compra ELSE l.precio_venta END,'ingreso_lote',u.id_usuario,l.fecha_ingreso
      FROM lote l JOIN usuario u ON u.id_sucursal=l.id_sucursal AND u.rol='dependiente' CROSS JOIN (VALUES ('compra'),('venta')) t(tipo);
    INSERT INTO movimiento_caja (id_sesion_caja,id_usuario,tipo,monto,motivo,fecha_hora)
      SELECT id,id_usuario,'salida',25,'Mensajería de pedidos (demo)',(fecha+time '12:00') AT TIME ZONE 'America/Guatemala' FROM demo_sesion WHERE dia>0 AND dia%7=0;
    UPDATE sesion_caja s SET total_ventas_efectivo=x.efectivo,total_ventas_tarjeta=x.tarjeta,total_entradas=0,total_salidas=x.salidas,
      efectivo_esperado=300+x.efectivo-x.salidas,efectivo_contado=300+x.efectivo-x.salidas,diferencia_efectivo=0,cantidad_ventas=x.ventas,cantidad_anulaciones=x.anuladas
      FROM (SELECT ds.id,coalesce(sum(v.total) FILTER (WHERE v.estado='completada' AND metodo_pago='efectivo'),0) AS efectivo,
      coalesce(sum(v.total) FILTER (WHERE v.estado='completada' AND metodo_pago='tarjeta'),0) AS tarjeta,
      count(*) FILTER (WHERE v.estado='completada') AS ventas,count(*) FILTER (WHERE v.estado='anulada') AS anuladas,CASE WHEN ds.dia%7=0 THEN 25 ELSE 0 END AS salidas
      FROM demo_sesion ds JOIN venta v ON v.id_sesion_caja=ds.id WHERE ds.dia>0 GROUP BY ds.id,ds.dia) x WHERE s.id_sesion_caja=x.id;
    INSERT INTO promocion (nombre,id_producto,id_sucursal,cantidad_minima,cantidad_maxima,precio_promocion,fecha_inicio,fecha_fin)
      SELECT CASE WHEN d.n=1 THEN 'Ahorro familiar' WHEN d.n=17 THEN 'Hidratación en casa' ELSE 'Temporada de vitaminas' END,
      d.id,s.id,3,60,round(d.precio*0.9,2),hoy+CASE WHEN d.n=21 THEN 7 ELSE -7 END,hoy+CASE WHEN d.n=21 THEN 30 ELSE 14 END
      FROM demo_catalogo d CROSS JOIN demo_sucursal s WHERE d.n IN (1,17,21);
    INSERT INTO seed_demo_ejecucion (version,fecha_base) VALUES ('baja-verapaz-v1',hoy);
END;
$demo$;
