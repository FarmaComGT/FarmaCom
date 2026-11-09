import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { getCurrentUser } from '../api/auth';
import { setUnauthorizedHandler } from '../api/authSession';
import { clearSession, saveSession } from '../utils/auth';

const AuthContext = createContext(null);

export const AUTH_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  RESTORE_SESSION: 'RESTORE_SESSION',
  SET_SUCURSAL_ACTIVA: 'SET_SUCURSAL_ACTIVA',
};

const initialState = {
  usuario: null,
  sucursalActivaId: null,
  status: 'checking',
};

function buildAuthenticatedState(payload) {
  return {
    usuario: payload.usuario,
    sucursalActivaId: payload.sucursalActivaId ?? payload.usuario.id_sucursal ?? null,
    status: 'authenticated',
  };
}

function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN:
    case AUTH_ACTIONS.RESTORE_SESSION:
      return buildAuthenticatedState(action.payload);
    case AUTH_ACTIONS.SET_SUCURSAL_ACTIVA:
      return {
        ...state,
        sucursalActivaId: action.payload,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        usuario: null,
        sucursalActivaId: null,
        status: 'unauthenticated',
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    if (state.usuario) {
      saveSession({
        usuario: state.usuario,
        sucursalActivaId: state.sucursalActivaId,
      });
      return;
    }

    clearSession();
  }, [state.sucursalActivaId, state.usuario]);

  useEffect(() => {
    const cleanup = setUnauthorizedHandler(() => {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    });

    return cleanup;
  }, []);

  useEffect(() => {
    let ignore = false;

    const restoreSession = async () => {
      try {
        const data = await getCurrentUser();

        if (ignore) {
          return;
        }

        dispatch({
          type: AUTH_ACTIONS.RESTORE_SESSION,
          payload: {
            usuario: data.usuario,
            sucursalActivaId: data.usuario.id_sucursal ?? null,
          },
        });
      } catch {
        if (!ignore) {
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      }
    };

    restoreSession();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }

  return {
    usuario: context.state.usuario,
    sucursalActivaId: context.state.sucursalActivaId,
    status: context.state.status,
    isAuthenticated: context.state.status === 'authenticated' && Boolean(context.state.usuario),
    dispatch: context.dispatch,
  };
}

export function useAuthOpcional() {
  const context = useContext(AuthContext);
  if (!context) return null;
  return {
    usuario: context.state.usuario,
    sucursalActivaId: context.state.sucursalActivaId,
    status: context.state.status,
  };
}
