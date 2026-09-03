import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { auth, db } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export interface AuthUser extends User {
  role?: 'admin' | 'participante';
}

export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!active) return;

      // Do not block the authenticated area waiting for Firestore.
      // Firebase Auth restores the persisted session independently.
      setUser(firebaseUser as AuthUser | null);
      setLoading(false);

      if (!firebaseUser) return;

      // Role/profile data is secondary and must not prevent navigation after refresh.
      getDoc(doc(db, 'users', firebaseUser.uid))
        .then((snap) => {
          if (!active || !snap.exists()) return;
          const role = snap.data().role;
          setUser((current) => current ? ({ ...current, role } as AuthUser) : current);
        })
        .catch((err) => {
          console.error('Erro ao carregar perfil de autenticação:', err);
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signup = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      setError(null);

      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const now = new Date().toISOString();

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email,
        ...userData,
        role: 'participante',
        created_at: now,
        updated_at: now,
      });

      await setDoc(doc(db, 'participants', firebaseUser.uid), {
        user_id: firebaseUser.uid,
        nome: userData.nome,
        email,
        telefone: userData.telefone,
        cpf: userData.cpf,
        cidade: userData.cidade,
        estado: userData.estado,
        aceite_lgpd: userData.aceite_lgpd,
        status: 'lead',
        created_at: now,
        updated_at: now,
      });

      toast.success('Conta criada com sucesso!');
      return { success: true, user: firebaseUser };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao criar conta';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { user: firebaseUser } = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      toast.success('Bem-vindo de volta!');
      return { success: true, user: firebaseUser };
    } catch (err: any) {
      const errorMessage =
        err.code === 'auth/user-not-found'
          ? 'Email não encontrado.'
          : err.code === 'auth/wrong-password'
            ? 'Senha incorreta.'
            : err.code === 'auth/invalid-credential'
              ? 'Email ou senha incorretos.'
              : err.message || 'Erro ao fazer login';

      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      auth.languageCode = 'pt-BR';

      await sendPasswordResetEmail(auth, email, {
        url: 'https://ministeriobookteam.com.br/auth/action',
        handleCodeInApp: false,
      });
      toast.success('Enviamos as instruções de recuperação para seu email.');
      return { success: true };
    } catch (err: any) {
      const errorMessage =
        err.code === 'auth/user-not-found'
          ? 'Email não encontrado.'
          : err.message || 'Erro ao recuperar senha';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      toast.success('Desconectado com sucesso!');
      navigate({ to: '/inicio' });
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao desconectar';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signup,
    login,
    resetPassword,
    logout,
    isAuthenticated: !!user,
  };
}
