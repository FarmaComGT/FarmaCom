import { useState } from 'react';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import BrandLogo from '../components/BrandLogo.jsx';
import { useAuth, AUTH_ACTIONS } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../utils/navigation';

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { dispatch } = useAuth();

  const [correo,    setCorreo]    = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error,     setError]     = useState('');
  const [cargando,  setCargando]  = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setCargando(true);

    try {
      const data = await login(correo, contrasena);

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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,81,71,0.10),_transparent_30%),linear-gradient(180deg,_#fdfdfd_0%,_#f6f7f7_100%)] px-6 py-10 text-on-surface">
      <div className="medical-pattern pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col items-center justify-center">
        <div className="mb-10">
          <BrandLogo compact />
        </div>

        <section className="w-full max-w-[34rem] rounded-[2rem] bg-white px-8 py-10 shadow-[0_24px_60px_rgba(26,28,28,0.08)] ring-1 ring-primary/5 sm:px-10 sm:py-12">
          <header className="text-center">
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
              Bienvenido/a de nuevo
            </h2>
            <p className="mt-3 text-sm font-medium text-on-surface-variant/70">
              Gestión farmacéutica
            </p>
          </header>

          <form onSubmit={handleSubmit} className="mt-12 space-y-8">
            <div className="space-y-3">
              <label
                htmlFor="correo"
                className="block text-[11px] font-extrabold uppercase tracking-[0.22em] text-on-surface-variant"
              >
                Usuario
              </label>
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3 transition-colors focus-within:border-primary">
                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  placeholder="Nombre"
                  required
                  className="w-full border-none bg-transparent text-base text-on-surface placeholder:text-slate-300 focus:outline-none"
                />
                <Mail className="h-4 w-4 shrink-0 text-on-surface-variant" />
              </div>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="contrasena"
                className="block text-[11px] font-extrabold uppercase tracking-[0.22em] text-on-surface-variant"
              >
                Contraseña
              </label>
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3 transition-colors focus-within:border-primary">
                <input
                  id="contrasena"
                  type="password"
                  value={contrasena}
                  onChange={(event) => setContrasena(event.target.value)}
                  placeholder="........"
                  required
                  className="w-full border-none bg-transparent text-base text-on-surface placeholder:text-slate-300 focus:outline-none"
                />
                <Lock className="h-4 w-4 shrink-0 text-on-surface-variant" />
              </div>
            </div>

            {error && (
              <p className="rounded-2xl border border-error/15 bg-error-container/50 px-4 py-3 text-sm font-medium text-on-error-container">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-headline text-base font-bold text-white shadow-[0_12px_24px_rgba(0,81,71,0.20)] transition-all hover:-translate-y-0.5 hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span>{cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}</span>
              {!cargando && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
