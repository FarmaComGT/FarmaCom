import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth, AUTH_ACTIONS } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../utils/navigation';
import FondoParticulas from '../components/login/FondoParticulas.jsx';
import styles from './Login.module.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useAuth();
  const errorRef = useRef(null);

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    document.title = 'Iniciar sesión · FarmaCom';
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const correoLimpio = correo.trim();
    const contrasenaLimpia = contrasena.trim();

    if (!correoLimpio || !contrasenaLimpia) {
      setError('Ingresa tu correo y contraseña para continuar.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const data = await login(correoLimpio, contrasenaLimpia);

      dispatch({
        type: AUTH_ACTIONS.LOGIN,
        payload: {
          usuario: data.usuario,
          sucursalActivaId: data.usuario.id_sucursal ?? null,
        },
      });

      const rutaPredeterminada = getDefaultRouteForRole(data.usuario?.rol);
      const destination = data.usuario?.rol === 'laboratorista'
        ? rutaPredeterminada
        : location.state?.from?.pathname || rutaPredeterminada;
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Credenciales incorrectas');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className={styles.page}>
      <FondoParticulas />
      <div className={styles.shell}>
        <section className={styles.brandPanel} aria-labelledby="login-brand-title">
          <FondoParticulas colorFondo="#005147" colorPunto="#ffffff" />
          <div>
            <p className={styles.eyebrow}>Farmacia San Gabriel</p>
            <h1 id="login-brand-title" translate="no">FarmaCom</h1>
          </div>

          <p className={styles.brandDescription}>
            Operaciones diarias claras, seguras y conectadas para todo el equipo.
          </p>
        </section>

        <section className={styles.formPanel} aria-labelledby="login-title">
          <header className={styles.formHeader}>
            <p className={styles.mobileBrand} translate="no">FarmaCom</p>
            <h2 id="login-title">Iniciar sesión</h2>
            <p>Usa las credenciales asignadas por administración.</p>
          </header>

          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="correo" className="campo-requerido">Correo electrónico</label>
              <div className={styles.inputWrap}>
                <Mail aria-hidden="true" />
                <input aria-required="true"
                  id="correo"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  spellCheck="false"
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  placeholder="nombre@farmacom.com…"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="contrasena" className="campo-requerido">Contraseña</label>
              <div className={styles.inputWrap}>
                <LockKeyhole aria-hidden="true" />
                <input aria-required="true"
                  id="contrasena"
                  name="current-password"
                  type={mostrarContrasena ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(event) => setContrasena(event.target.value)}
                  placeholder="Ingresa tu contraseña…"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setMostrarContrasena((visible) => !visible)}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={mostrarContrasena}
                >
                  {mostrarContrasena
                    ? <EyeOff aria-hidden="true" />
                    : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && (
              <p
                ref={errorRef}
                id="login-error"
                role="alert"
                tabIndex={-1}
                className={styles.error}
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={cargando} className={styles.submit}>
              {cargando && <LoaderCircle className={styles.spinner} aria-hidden="true" />}
              <span>Iniciar sesión</span>
              {!cargando && <ArrowRight aria-hidden="true" />}
              {cargando && <span className={styles.srOnly}>Iniciando sesión…</span>}
            </button>
          </form>

          <p className={styles.support}>
            Si no puedes ingresar, solicita ayuda a la persona administradora de tu sucursal.
          </p>
        </section>
      </div>
    </main>
  );
}
