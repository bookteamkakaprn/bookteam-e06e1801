import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Book Clube" },
      { name: "description", content: "Acesse sua conta ou cadastre-se no Book Clube." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/inicio" });
  },
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const tab = mode ?? "signin";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        <aside className="hidden gradient-hero flex-col justify-between p-12 lg:flex">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-semibold">Book Clube</span>
          </Link>
          <div>
            <h2 className="font-serif text-4xl font-bold leading-tight">
              Área administrativa
            </h2>
            <p className="mt-4 text-muted-foreground">
              Acompanhe e gerencie os alunos do Book Team Amor.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Book Clube</p>
        </aside>

        <main className="flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden">
              <BookOpen className="h-4 w-4" /> Book Clube
            </Link>
            <Tabs value={tab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" asChild>
                  <Link to="/auth" search={{ mode: "signin" }}>Entrar</Link>
                </TabsTrigger>
                <TabsTrigger value="signup" asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="signin"><SignInForm /></TabsContent>
              <TabsContent value="signup"><SignUpForm /></TabsContent>
              <TabsContent value="forgot"><ForgotForm /></TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/inicio" });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Entrar</h1>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </div>
      <div className="flex items-center justify-between">
        <Link to="/auth" search={{ mode: "forgot" }} className="text-sm text-muted-foreground hover:text-foreground">
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}

const signUpSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().email("Email inválido"),
  cpf: z.string().trim().min(11, "CPF inválido").max(14),
  telefone: z.string().trim().min(8, "Telefone inválido"),
  cidade: z.string().trim().min(2, "Informe sua cidade"),
  estado: z.string().trim().length(2, "UF com 2 letras"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  aceite_lgpd: z.literal(true, { errorMap: () => ({ message: "É necessário aceitar" }) }),
});

function SignUpForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "", email: "", cpf: "", telefone: "", cidade: "", estado: "", password: "",
  });
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ ...form, aceite_lgpd: aceite });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Confira os campos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/inicio`,
        data: {
          nome: form.nome, cpf: form.cpf, telefone: form.telefone,
          cidade: form.cidade, estado: form.estado.toUpperCase(),
          aceite_lgpd: true,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Bem-vindo ao Book Clube.");
    navigate({ to: "/inicio" });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Criar conta</h1>
      <div className="space-y-2">
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" required value={form.cpf} onChange={(e) => set("cpf", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" required value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_100px] gap-3">
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" required value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">UF</Label>
          <Input id="estado" required maxLength={2} value={form.estado} onChange={(e) => set("estado", e.target.value.toUpperCase())} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Senha</Label>
        <Input id="signup-password" type="password" required value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={aceite} onCheckedChange={(v) => setAceite(v === true)} className="mt-0.5" />
        <span className="text-muted-foreground">
          Li e aceito os termos de uso e a política de privacidade (LGPD).
        </span>
      </label>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar minha conta
      </Button>
    </form>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Enviamos o link para o seu email.");
  }

  if (sent) {
    return (
      <div className="mt-6 space-y-4">
        <h1 className="font-serif text-2xl font-semibold">Verifique seu email</h1>
        <p className="text-sm text-muted-foreground">
          Enviamos um link para <strong>{email}</strong>. Abra-o para redefinir sua senha.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link to="/auth" search={{ mode: "signin" }}>Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Recuperar senha</h1>
      <p className="text-sm text-muted-foreground">
        Informe seu email e enviaremos um link para redefinir a senha.
      </p>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar link
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link to="/auth" search={{ mode: "signin" }}>Cancelar</Link>
      </Button>
    </form>
  );
}
