import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import bookTeamLogo from '@/assets/book-team-logo.png';

export const Route = createFileRoute('/auth/action')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Redefinir senha — Ministério Book Team' },
      { name: 'description', content: 'Redefina sua senha com segurança no Ministério Book Team.' },
    ],
  }),
  component: AuthActionPage,
});

function AuthActionPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');

    if (mode !== 'resetPassword' || !oobCode) {
      setError('Este link de recuperação é inválido ou incompleto. Solicite uma nova recuperação de senha.');
      setLoading(false);
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((accountEmail) => {
        setCode(oobCode);
        setEmail(accountEmail);
      })
      .catch(() => {
        setError('Este link de recuperação expirou ou já foi utilizado. Solicite uma nova recuperação de senha.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code) return;
    if (newPassword.length < 8) {
      toast.error('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    try {
      setSaving(true);
      await confirmPasswordReset(auth, code, newPassword);
      setSuccess(true);
      toast.success('Senha alterada com sucesso!');
    } catch (err: any) {
      const message =
        err.code === 'auth/expired-action-code' || err.code === 'auth/invalid-action-code'
          ? 'Este link expirou ou já foi utilizado. Solicite uma nova recuperação de senha.'
          : err.code === 'auth/weak-password'
            ? 'Escolha uma senha mais forte, com pelo menos 8 caracteres.'
            : err.message || 'Não foi possível alterar sua senha.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <div className="mb-8 text-center">
            <img src={bookTeamLogo} alt="Ministério Book Team" className="mx-auto h-16 w-16 rounded-full object-contain" />
            <p className="mt-3 font-serif text-xl font-semibold">Ministério Book Team</p>
            <p className="mt-1 text-sm text-muted-foreground">ministeriobookteam.com.br</p>
          </div>

          {loading && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm text-muted-foreground">Validando seu link de recuperação...</p>
            </div>
          )}

          {!loading && success && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12" />
              <h1 className="mt-4 font-serif text-2xl font-semibold">Senha alterada!</h1>
              <p className="mt-2 text-sm text-muted-foreground">Sua nova senha foi salva com sucesso.</p>
              <Button className="mt-6 w-full" onClick={() => navigate({ to: '/auth', search: { mode: 'signin' } })}>
                Entrar no Ministério Book Team
              </Button>
            </div>
          )}

          {!loading && !success && error && (
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12" />
              <h1 className="mt-4 font-serif text-2xl font-semibold">Link indisponível</h1>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button className="mt-6 w-full" onClick={() => navigate({ to: '/auth', search: { mode: 'forgot' } })}>
                Solicitar novo link
              </Button>
            </div>
          )}

          {!loading && !success && !error && (
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <h1 className="font-serif text-2xl font-semibold">Criar nova senha</h1>
                <p className="mt-2 text-sm text-muted-foreground">Defina uma nova senha para sua conta.</p>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={email} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input id="new-password" type="password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input id="confirm-password" type="password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar nova senha
              </Button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Voltar ao site</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
