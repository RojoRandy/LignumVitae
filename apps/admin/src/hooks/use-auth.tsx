// Al arrancar revalida contra GET /auth/check-status en vez de confiar en
// que el token en localStorage siga siendo valido: si el usuario fue dado
// de baja, la sesion muere de inmediato en vez de esperar a que expire el JWT.
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { httpGet, httpPost } from '@/lib/http';
import { tokenStore } from '@/lib/api';
import type { UserDto } from '@/lib/types';

interface AuthContextValue {
  user: UserDto | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    httpGet<UserDto>('/auth/check-status')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (username: string, password: string) => {
    const result = await httpPost<{ accessToken: string; user: UserDto }>('/auth/sign-in', { username, password });
    tokenStore.set(result.accessToken);
    setUser(result.user);
  };

  const signOut = () => {
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: user?.role === 'admin' || user?.role === 'super_user', signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
