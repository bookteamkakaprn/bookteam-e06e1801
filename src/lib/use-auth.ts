import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";

export type AppRole = "admin" | "participante";

export interface AuthState {
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      setUser(firebaseUser);

      if (!firebaseUser) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        const role = userSnap.exists() ? userSnap.data().role : undefined;
        setRoles(
          role === "admin" || role === "admin_master" || role === "admin_suporte"
            ? ["admin"]
            : ["participante"]
        );
      } catch (error) {
        console.error("Erro ao carregar perfil de autenticação:", error);
        setRoles(["participante"]);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {
    user,
    roles,
    loading,
    isAdmin: roles.includes("admin"),
  };
}
