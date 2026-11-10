import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import EscanerCamaraModal from '../../ui/EscanerCamaraModal';
import LectorMovilButton from '../../ui/LectorMovilButton';
import styles from '../../../styles/ManagementUI.module.css';
import local from './ProductoDatosGenerales.module.css';

export default function ProductoDatosGenerales({ formulario, codigoMostrado, onChange, bloqueado = false }) {
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [aviso, setAviso] = useState('');
  const campoCodigo = useRef(null);
  const enfocarCodigo = useRef(false);

  useEffect(() => {
    if (bloqueado) setCamaraAbierta(false);
  }, [bloqueado]);

  useEffect(() => {
    if (!camaraAbierta && enfocarCodigo.current) {
      enfocarCodigo.current = false;
      campoCodigo.current?.focus();
    }
  }, [camaraAbierta]);

  const recibirCodigo = (codigo) => {
    if (bloqueado) return;
    onChange({ target: { name: 'codigo_barras', value: codigo, type: 'text' } });
    setAviso('Código leído. Revisa los datos y guarda el producto.');
    if (camaraAbierta) enfocarCodigo.current = true;
    else campoCodigo.current?.focus();
    setCamaraAbierta(false);
  };
  return (
    <section className={styles.section} aria-labelledby="producto-datos-title">
      <h3 id="producto-datos-title" className={styles.sectionHeading}>Datos generales</h3>
      <div className={styles.field}>
          <label htmlFor="codigo_producto">Código</label>
          <input id="codigo_producto" type="text" value={codigoMostrado} disabled className={styles.input} />
          <p className={styles.helpText}>Se genera a partir de la presentación elegida.</p>
      </div>
      <div className={styles.field}>
        <label htmlFor="codigo_barras">Código de barras <span className={styles.optional}>(opcional)</span></label>
        <div className={local.codigoRow}>
          <input ref={campoCodigo} id="codigo_barras" type="text" name="codigo_barras" autoComplete="off" spellCheck={false}
            value={formulario.codigo_barras || ''} disabled={bloqueado}
            onChange={(evento) => { setAviso(''); onChange(evento); }} maxLength={64}
            onFocus={(evento) => evento.target.select()}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault();
                if (formulario.codigo_barras?.trim()) setAviso('Código leído. Revisa los datos y guarda el producto.');
              }
            }}
            placeholder="Ej.: 0012345678905…" aria-describedby="codigo-barras-ayuda" className={styles.input} />
          <button className={`${styles.button} ${local.camaraButton}`} type="button" disabled={bloqueado}
            onClick={() => setCamaraAbierta(true)} aria-label="Escanear código del producto con cámara">
            <Camera size={18} aria-hidden="true" />Cámara
          </button>
          <LectorMovilButton destino="producto" contexto={codigoMostrado} bloqueado={bloqueado || camaraAbierta} onCodigo={recibirCodigo} />
        </div>
        <p id="codigo-barras-ayuda" className={styles.helpText}>Escribe, pega o escanea el código del empaque. Déjalo vacío si todavía no lo tienes.</p>
        <p className={styles.helpText} aria-live="polite">{aviso}</p>
      </div>
      <div className={styles.field}>
        <label htmlFor="nombre_comercial" className="campo-requerido">Nombre comercial</label>
        <input id="nombre_comercial" type="text" name="nombre_comercial" autoComplete="off" value={formulario.nombre_comercial} onChange={onChange} placeholder="Ej.: Aspirina Forte…" maxLength={150} required className={styles.input} />
      </div>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="nombre_generico" className="campo-requerido">Nombre genérico</label>
          <input id="nombre_generico" type="text" name="nombre_generico" autoComplete="off" value={formulario.nombre_generico} onChange={onChange} placeholder="Ej.: Ácido acetilsalicílico…" maxLength={150} required className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor="concentracion">Concentración <span className={styles.optional}>(opcional)</span></label>
          <input id="concentracion" type="text" name="concentracion" autoComplete="off" value={formulario.concentracion} onChange={onChange} placeholder="Ej.: 500 mg…" maxLength={50} className={styles.input} />
        </div>
      </div>
      {camaraAbierta && <EscanerCamaraModal onClose={() => setCamaraAbierta(false)} onCodigo={recibirCodigo} />}
    </section>
  );
}
