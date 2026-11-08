import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LectorMovilAutenticadoProvider } from './context/LectorMovilContext.jsx';
import { CarritoProvider } from './context/CarritoContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './index.css';
import { instalarAvisoCambiosResumen } from './hooks/useAvisoCambiosResumen';

instalarAvisoCambiosResumen();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <LectorMovilAutenticadoProvider>
        <CarritoProvider>
          <App />
        </CarritoProvider>
        </LectorMovilAutenticadoProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);
