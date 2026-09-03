import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { auth, db } from '@/integrations/supabase/client';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
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

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore
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

  // Signup
  const signup = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Create Firebase Auth user
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create Firestore document
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, {
        email,
        ...userData,
        role: 'participante',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Create participant document
      const participantRef = doc(db, 'participants', firebaseUser.uid);
      await setDoc(participantRef, {
        user_id: firebaseUser.uid,
        nome: userData.nome,
        email,
        telefone: userData.telefone,
        cpf: userData.cpf,
        cidade: userData.cidade,
        estado: userData.estado,
        aceite_lgpd: userData.aceite_lgpd,
        status: 'lead',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast.success('Conta criada com sucesso!');
      navigate({ to: '/inicio' });
      
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

  // Login
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { user: firebaseUser } = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      toast.success('Login realizado com sucesso!');
      navigate({ to: '/inicio' });
      
      return { success: true, user: firebaseUser };
    } catch (err: any) {
      const errorMessage = 
        err.code === 'auth/user-not-found' 
          ? 'Email não encontrado'
          : err.code === 'auth/wrong-password'
          ? 'Senha incorreta'
          : err.message || 'Erro ao fazer login';
      
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout
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
    logout,
    isAuthenticated: !!user,
  };
}
