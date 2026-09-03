import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import bookTeamLogo from "@/assets/book-team-logo.png";

const searchSchema = z.object({ mode: z.enum(["signin", "signup", "forgot"]).optional(), area: z.enum(["aluno", "admin"]).optional() });
const signUpSchema = z.object({ nome: z.string().trim().min(2, "Informe seu nome"), email: z.string().trim().email("Email inválido"), cpf: z.string().trim().min(11, "CPF inválido").max(14), telefone: z.string().trim().min(8, "Telefone inválido"), cidade: z.string().trim().min(2, "Informe sua cidade"), estado: z.string().trim().length(2, "UF com 2 letras"), password: z.string().min(8, "Mínimo 8 caracteres"), aceite_lgpd: z.literal(true, { errorMap: () => ({ message: "É necessário aceitar" }) }) });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar ou criar conta — Book Team" }, { name: "description", content: "Acesse sua conta ou cadastre-se no Book Team Amor & Honra." }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, area } = Route.useSearch();
  const tab = mode ?? "signin";
  const isAdmin = area === "admin";
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return <div className="min-h-screen bg-background"><div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
    <aside className="hidden gradient-hero flex-col justify-between p-12 lg:flex">
      <div className="flex flex-col gap-2"><Link to="/" className="flex items-center gap-3"><img src={bookTeamLogo} alt="Book Team Amor & Honra" className="h-12 w-12 rounded-full object-contain" /><span className="font-serif text-xl font-semibold">Book Team</span></Link><Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Início</Link></div>
      <div><h2 className="font-serif text-4xl font-bold leading-tight">{isAdmin ? "Área administrativa" : "Área do aluno"}</h2><p className="mt-4 text-muted-foreground">{isAdmin ? "Acompanhe e gerencie alunos, turmas e pagamentos do Book Team Amor & Honra." : "Acompanhe suas trilhas, encontros, pagamentos e certificados do Book Team Amor & Honra."}</p></div>
      <p className="text-xs text-muted-foreground">© {year ?? "2026"} Book Team</p>
    </aside>
    <main className="flex items-center justify-center p-6 md:p-12"><div className="w-full max-w-md">
      <Link to="/" className="mb-8 inline-flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground lg:hidden"><img src={bookTeamLogo} alt="Book Team Amor & Honra" className="h-10 w-10 rounded-full object-contain" /><span>Book Team</span></Link>
      <div className="grid w-full grid-cols-2"><Link to="/auth" search={{ mode: "signin", ...(area ? { area } : {}) }} className={`flex h-10 items-center justify-center rounded-md text-sm font-medium ${tab === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Entrar</Link><Link to="/auth" search={{ mode: "signup", ...(area ? { area } : {}) }} className={`flex h-10 items-center justify-center rounded-md text-sm font-medium ${tab === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Criar conta</Link></div>
      {tab === "signin" && <SignInForm />}{tab === "signup" && <SignUpForm />}{tab === "forgot" && <ForgotForm />}
    </div></main>
  </div></div>;
}

function SignInForm() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  async function onSubmit(e: FormEvent) { e.preventDefault(); const parsed = z.object({ email: z.string().email("Email inválido"), password: z.string().min(1, "Senha obrigatória") }).safeParse({ email, password }); if (!parsed.success) { toast.error(parsed.error.errors[0]?.message ?? "Confira os campos"); return; } const result = await login(email, password); if (result.success) navigate({ to: "/inicio" }); }
  return <form onSubmit={onSubmit} className="mt-6 space-y-4"><h1 className="font-serif text-2xl font-semibold">Entrar</h1><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div><div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div><div className="flex items-center justify-between"><Link to="/auth" search={{ mode: "forgot" }} className="text-sm text-muted-foreground hover:text-foreground">Esqueci minha senha</Link></div><Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Entrar</Button></form>;
}

function SignUpForm() {
  const navigate = useNavigate(); const { signup, loading } = useAuth();
  const [form, setForm] = useState({ nome: "", email: "", cpf: "", telefone: "", cidade: "", estado: "", password: "" }); const [aceite, setAceite] = useState(false);
  function set<K extends keyof typeof form>(key: K, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  async function onSubmit(e: FormEvent) { e.preventDefault(); const parsed = signUpSchema.safeParse({ ...form, aceite_lgpd: aceite }); if (!parsed.success) { toast.error(parsed.error.errors[0]?.message ?? "Confira os campos"); return; } const result = await signup(form.email, form.password, { nome: form.nome, cpf: form.cpf, telefone: form.telefone, cidade: form.cidade, estado: form.estado.toUpperCase(), aceite_lgpd: true }); if (result.success) navigate({ to: "/inicio" }); }
  return <form onSubmit={onSubmit} className="mt-6 space-y-4"><h1 className="font-serif text-2xl font-semibold">Criar conta</h1><div className="space-y-2"><Label htmlFor="nome">Nome completo</Label><Input id="nome" required value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="cpf">CPF</Label><Input id="cpf" required value={form.cpf} onChange={(e) => set("cpf", e.target.value)} /></div><div className="space-y-2"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" required value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></div></div><div className="grid grid-cols-[1fr_100px] gap-3"><div className="space-y-2"><Label htmlFor="cidade">Cidade</Label><Input id="cidade" required value={form.cidade} onChange={(e) => set("cidade", e.target.value)} /></div><div className="space-y-2"><Label htmlFor="estado">UF</Label><Input id="estado" required maxLength={2} value={form.estado} onChange={(e) => set("estado", e.target.value.toUpperCase())} /></div></div><div className="space-y-2"><Label htmlFor="signup-email">Email</Label><Input id="signup-email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></div><div className="space-y-2"><Label htmlFor="signup-password">Senha</Label><Input id="signup-password" type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" /><p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p></div><label className="flex items-start gap-2 text-sm"><Checkbox checked={aceite} onCheckedChange={(value) => setAceite(value === true)} className="mt-0.5" /><span className="text-muted-foreground">Li e aceito os termos de uso e a política de privacidade (LGPD).</span></label><Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar minha conta</Button></form>;
}

function ForgotForm() {
  const { resetPassword, loading } = useAuth(); const [email, setEmail] = useState("");
  async function onSubmit(e: FormEvent) { e.preventDefault(); if (!z.string().email("Email inválido").safeParse(email).success) { toast.error("Informe um email válido"); return; } await resetPassword(email); }
  return <form onSubmit={onSubmit} className="mt-6 space-y-4"><h1 className="font-serif text-2xl font-semibold">Recuperar senha</h1><p className="text-sm text-muted-foreground">Informe seu email e enviaremos as instruções para criar uma nova senha.</p><div className="space-y-2"><Label htmlFor="forgot-email">Email</Label><Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div><Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar instruções</Button><Link to="/auth" search={{ mode: "signin" }} className="block text-center text-sm text-muted-foreground">Voltar para entrar</Link></form>;
}
