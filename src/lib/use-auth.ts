import { useAuth as useSharedAuth, type AuthUser } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'participante';

export interface AuthState {
  user: (AuthUser & { id: string }) | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const { user, loading } = useSharedAuth();
  const userWithId = user ? Object.assign(user, { id: user.uid }) : null;
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_master' || user?.role === 'admin_suporte';

  return {
    user: userWithId,
    roles: [isAdmin ? 'admin' : 'participante'],
    loading,
    isAdmin,
  };
}
