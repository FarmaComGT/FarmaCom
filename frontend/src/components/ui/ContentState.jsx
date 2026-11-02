import React from 'react';
import { CircleAlert, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';
import styles from './ContentState.module.css';

const ICONOS = {
  loading: LoaderCircle,
  error: CircleAlert,
  empty: Inbox,
};

export default function ContentState({
  variant = 'empty',
  title,
  message,
  icon,
  compact = false,
  onRetry,
  retryLabel = 'Reintentar',
  className = '',
}) {
  const Icon = icon || ICONOS[variant] || Inbox;
  const esError = variant === 'error';
  const esCarga = variant === 'loading';
  const variantClass = esError ? styles.error : esCarga ? styles.loading : styles.empty;

  return (
    <div
      role={esError ? 'alert' : 'status'}
      aria-live={esError ? 'assertive' : 'polite'}
      aria-busy={esCarga}
      className={`${styles.state} ${variantClass} ${compact ? styles.compact : ''} ${className}`.trim()}
    >
      <Icon className={esCarga ? styles.spinner : styles.icon} size={24} aria-hidden="true" />
      {title && <strong>{title}</strong>}
      {message && <p>{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className={styles.retryButton}>
          <RefreshCw size={16} aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
