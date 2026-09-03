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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          const userData = userDocSnap.exists() ? userDocSnap.data() : {};

          setUser({
            ...firebaseUser,
            role: userData.role || 'participante',
          } as AuthUser);
        } catch (err) {
          console.error('Error fetching user data:', err);
          setUser(firebaseUser as AuthUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/auth?mode=signin`,
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
