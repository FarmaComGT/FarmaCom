import React from 'react';
import styles from '../../styles/ManagementUI.module.css';

export default function SucursalAlert({ mensaje }) {
  if (!mensaje) {
    return null;
  }

  return (
    <div className={styles.alert} role="alert">
      {mensaje}
    </div>
  );
}
