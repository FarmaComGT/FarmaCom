-- Corrección de contenido para instalaciones nuevas y cargas anteriores.
-- No altera importes, cantidades, fechas, claves ni sesiones.
DO $contenido$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seed_demo_ejecucion WHERE version='baja-verapaz-v1')
     OR EXISTS (SELECT 1 FROM seed_demo_ejecucion WHERE version='baja-verapaz-contenido-v2') THEN
    RETURN;
  END IF;

  -- Nombres comerciales ilustrativos, separados del principio activo.
  CREATE TEMP TABLE contenido_producto (n INT, comercial TEXT) ON COMMIT DROP;
  INSERT INTO contenido_producto VALUES
    (1,'Paraliv'),(2,'Paraliv Infantil'),(3,'Ibucalm'),(4,'Ibucalm Pediátrico'),
    (5,'Dicloflex'),(6,'Naproaliv'),(7,'Amoxival'),(8,'Amoxival Pediátrico'),
    (9,'Azitroval'),(10,'Cefalex'),(11,'LoraClear'),(12,'LoraClear Infantil'),
    (13,'CetiAliv'),(14,'Clorofin'),(15,'Gastrozol'),(16,'Esogastric'),
    (17,'HidraSal'),(18,'GastroBalance'),(19,'SimiGotas'),(20,'FloraVital'),
    (21,'Cevital'),(22,'NeuroVital B'),(23,'FerroVital'),(24,'FoliVital'),
    (25,'CalciForte D'),(26,'VitaPeques'),(27,'Losarval'),(28,'Enalacard'),
    (29,'MetfoControl'),(30,'Amlocard'),(31,'Atorval'),(32,'GlucoControl'),
    (33,'AlcoClean'),(34,'OxiClean'),(35,'GasaCare'),(36,'FlexiVenda'),
    (37,'ClotriCare'),(38,'ZinciCare'),(39,'SolarCare 50'),(40,'AvenaSuave');
  UPDATE detalle_venta d SET nombre_producto_historico=c.comercial
    FROM producto p JOIN contenido_producto c ON p.codigo='BV-'||lpad(c.n::text,3,'0')
    WHERE d.id_producto_historico=p.id_producto AND d.nombre_producto_historico=p.nombre_generico;
  UPDATE producto p SET nombre_comercial=c.comercial,codigo_barras='BV-P-'||lpad(c.n::text,3,'0'),
    descripcion=pr.nombre||' de '||p.nombre_generico||' '||p.concentracion
    FROM contenido_producto c,presentacion pr
    WHERE p.codigo='BV-'||lpad(c.n::text,3,'0') AND pr.id_presentacion=p.id_presentacion;

  CREATE TEMP TABLE contenido_persona ON COMMIT DROP AS
    SELECT n,
      (ARRAY['María Fernanda','José Andrés','Ana Lucía','Carlos Eduardo','Juana Isabel','Pedro Antonio',
      'Rosa Elena','Luis Fernando','Elena Patricia','Miguel Ángel','Claudia Beatriz','Jorge Alberto',
      'Sandra Yolanda','Francisco Javier','Carmen Alicia','Manuel Estuardo','Patricia Lorena','Óscar René',
      'Marta Julia','Víctor Hugo','Gloria Esperanza','Ricardo Alfonso','Teresa Judith','Roberto David',
      'Silvia Noemí','Mario Enrique','Sonia Estela','Héctor Leonel','Irma Consuelo','Julio César',
      'Diana Carolina','Sergio Adolfo','Brenda Marisol','Edgar Rolando','Verónica Leticia','Raúl Ernesto',
      'Ingrid Paola','Armando Rafael','Natalia Sofía','Byron Amílcar','Cristina Gabriela','Edwin Alexander',
      'Adriana Melissa','Daniel Alejandro','Flor de María','William Oswaldo','Leslie Alejandra','Erick Giovanni',
      'Mayra Aracely','Hugo Ramiro','Julia Eugenia','César Augusto','Luisa Mercedes','Marco Tulio',
      'Evelyn Rocío','Álvaro Israel','Mirna Lissette','René Salvador','Aura Marina','Estuardo Benjamín'])[n]
      ||' '||(ARRAY['López','Chén','García','Caal','Ramírez','Pérez','Méndez','Ical','Hernández','Gómez',
      'Cruz','González','Morales','Paz','Reyes','Castillo','Coc','Gutiérrez','Alvarado','Lemus',
      'Ramos','Choc','Ajún','Sánchez','Vásquez','Ortiz','Juárez','Pineda','Tun','Ac',
      'Pec','Córdova','Aguilar','Santos','Coj','Valdez','Mejía','Quijivix','Cux','Oxlaj'])[1+(n-1)%40]
      ||' '||(ARRAY['Torres','Cifuentes','Chávez','Pop','Díaz','Álvarez','Ruiz','Mazariegos','Tzul','Chub',
      'Guzmán','Escobar','Barrios','Chaj','Tuy','Monzón','Salazar','Bautista','Saj','Cahuec',
      'Molina','Cabrera','Flores','Coy','Tec','Rosales','Figueroa','Rodas','Yat','Cuc',
      'Ponce','Delgado','Aguirre','Xol','Batz','Mendoza','Fuentes','Maldonado','Yax','Tot'])[1+((n-1)*17)%40] AS nombre,
      (ARRAY['María','José','Ana','Carlos','Juana','Pedro','Rosa','Luis','Elena','Miguel'])[1+(n-1)%10]
      ||' '||(ARRAY['López','Chén','García','Caal','Ramírez','Pérez'])[1+(n-1)/10]
      ||' '||(ARRAY['Méndez','Ical','Hernández','Gómez','Cruz'])[1+(n-1)%5] AS anterior
    FROM generate_series(1,60) n;
  UPDATE cliente c SET nombre_cliente=p.nombre
    FROM contenido_persona p WHERE c.observaciones='DEMO-BV-CLIENTE-'||p.n AND c.nombre_cliente=p.anterior;
  UPDATE cliente_email e SET correo=replace(e.correo,'@demo.example','@correo.example')
    FROM cliente c WHERE c.id_cliente=e.id_cliente AND c.observaciones LIKE 'DEMO-BV-CLIENTE-%';
  UPDATE cliente SET observaciones=replace(observaciones,'DEMO-BV-CLIENTE-','Registro de cliente BV-')
    WHERE observaciones LIKE 'DEMO-BV-CLIENTE-%';
  UPDATE paciente p SET nombre_paciente=c.nombre,observaciones=NULL
    FROM contenido_persona c,laboratorio l WHERE c.n<=30 AND p.nombre_paciente=c.anterior
    AND p.id_laboratorio=l.id_laboratorio AND l.nombre_laboratorio='Laboratorio Salamá'
    AND p.observaciones='Persona ficticia de demostración; sin DPI real.';
  UPDATE expediente_laboratorio SET antecedentes=NULL WHERE antecedentes='Expediente sintético de demostración.';
  UPDATE visita_laboratorio SET notas=NULL WHERE notas='Visita ficticia, sin resultados clínicos.';
  UPDATE casa_farmaceutica SET nombre=replace(nombre,' Demo','') WHERE nombre IN ('Laboratorios Verapaz Demo','Laboratorios del Valle Demo','Salud del Norte Demo');
  UPDATE proveedor SET nombre=replace(nombre,' Demo','') WHERE nombre IN ('Distribuidora Médica Verapaz Demo','Droguería Regional Demo','Suministros del Valle Demo');
  UPDATE sesion_caja SET observaciones=replace(observaciones,' de demostración','') WHERE observaciones IN ('Turno de demostración','Cierre de demostración');
  UPDATE venta SET proveedor_pago='terminal',referencia_pago=replace(referencia_pago,'DEMO-BV-','BV-PAGO-') WHERE proveedor_pago='demo' AND referencia_pago LIKE 'DEMO-BV-%';
  UPDATE venta SET motivo_anulacion='Corrección de ticket duplicado' WHERE motivo_anulacion='Corrección de ticket duplicado (demo)';
  UPDATE movimiento_caja SET motivo='Mensajería de pedidos' WHERE motivo='Mensajería de pedidos (demo)';
  UPDATE movimiento_inventario SET
    motivo=CASE motivo WHEN 'Recepción inicial de demo' THEN 'Recepción inicial de mercadería'
      WHEN 'Merma de demostración' THEN 'Merma por deterioro de empaque'
      WHEN 'Ticket de demostración' THEN 'Venta en mostrador'
      WHEN 'Ajuste por conteo físico (demo)' THEN 'Ajuste por conteo físico' ELSE motivo END,
    referencia=replace(referencia,'DEMO-BV-','BV-')
    WHERE referencia LIKE 'DEMO-BV-%' OR motivo='Ticket de demostración';
  INSERT INTO seed_demo_ejecucion (version,fecha_base)
    SELECT 'baja-verapaz-contenido-v2',fecha_base FROM seed_demo_ejecucion WHERE version='baja-verapaz-v1';
END;
$contenido$;
