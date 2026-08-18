import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [validRecovery, setValidRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      // Primeiro verifica se já existe uma sessão válida
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && mounted) {
        setValidRecovery(true);
        setCheckingSession(false);
      }
    }

    checkRecoverySession();

    // Detecta quando o link de recuperação cria a sessão
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setValidRecovery(true);
        setCheckingSession(false);
      }
    });

    // Evita deixar a tela presa
    const timeout = window.setTimeout(() => {
      if (mounted) {
        setCheckingSession(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validRecovery) {
      toast.error(
        "O link de recuperação é inválido ou expirou. Solicite um novo link."
      );
      return;
    }

    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Senha atualizada com sucesso!");

    await supabase.auth.signOut();

    navigate({
      to: "/auth",
      search: {
        mode: "signin",
      },
    });
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Validando seu link de recuperação...
        </div>
      </div>
    );
  }

  if (!validRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8">
          <h1 className="font-serif text-2xl font-semibold">
            Link inválido
          </h1>

          <p className="text-sm text-muted-foreground">
            Este link de recuperação é inválido, expirou ou já foi utilizado.
          </p>

          <Button
            type="button"
            className="w-full"
            onClick={() =>
              navigate({
                to: "/auth",
                search: {
                  mode: "forgot",
                },
              })
            }
          >
            Solicitar novo link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8"
      >
        <div>
          <h1 className="font-serif text-2xl font-semibold">
            Criar nova senha
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Digite sua nova senha para acessar o Book Team.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">
            Nova senha
          </Label>

          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">
            Confirmar nova senha
          </Label>

          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Digite novamente"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}

          Atualizar senha
        </Button>
      </form>
    </div>
  );
}
