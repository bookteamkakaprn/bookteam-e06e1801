import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CreditCard, DollarSign, CheckCircle2, Clock, BookOpen, GraduationCap, UserPlus, ClipboardCheck, Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_admin/admin")({ head: () => ({ meta: [{ title: "Área administrativa — Book Clube" }, { name: "robots", content: "noindex" }] }), component: AdminDashboard });

function AdminDashboard() {
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [participantes, eventosFuturos, eventosPassados, pagPend, pagAprov, turmas, livros] = await Promise.all([
      supabase.from("participantes").select("id", { count: "exact", head: true }),
      supabase.from("eventos").select("id", { count: "exact", head: true }).gte("data", today),
      supabase.from("eventos").select("id", { count: "exact", head: true }).lt("data", today),
      supabase.from("pagamentos").select("id", { count: "exact", head: true }).eq("status", "aguardando"),
      supabase.from("pagamentos").select("valor").eq("status", "aprovado"),
      supabase.from("turmas").select("id", { count: "exact", head: true }),
      supabase.from("livros").select("id", { count: "exact", head: true }),
    ]);
    const receita = (pagAprov.data ?? []).reduce((s, p) => s + Number(p.valor ?? 0), 0);
    return { participantes: participantes.count ?? 0, eventosFuturos: eventosFuturos.count ?? 0, eventosPassados: eventosPassados.count ?? 0, pagPend: pagPend.count ?? 0, pagAprov: pagAprov.data?.length ?? 0, receita, turmas: turmas.count ?? 0, livros: livros.count ?? 0 };
  }});
  const cards = [
    { title: "Alunos", value: stats?.participantes ?? "—", icon: Users, href: "/admin/participantes" },
    { title: "Turmas", value: stats?.turmas ?? "—", icon: GraduationCap, href: "/admin/turmas" },
    { title: "Livros e cursos", value: stats?.livros ?? "—", icon: BookOpen, href: "/admin/cadastrar-livro" },
    { title: "Eventos futuros", value: stats?.eventosFuturos ?? "—", icon: Calendar, href: "/admin/eventos" },
    { title: "Pagamentos pendentes", value: stats?.pagPend ?? "—", icon: Clock, href: "/admin/pagamentos" },
    { title: "Pagamentos aprovados", value: stats?.pagAprov ?? "—", icon: CreditCard, href: "/admin/pagamentos" },
    { title: "Eventos realizados", value: stats?.eventosPassados ?? "—", icon: CheckCircle2, href: "/admin/eventos" },
    { title: "Receita total", value: stats ? stats.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—", icon: DollarSign, href: "/admin/pagamentos" },
  ];
  const actions = [
    { to: "/admin/participantes", label: "Alunos", icon: Users, desc: "Consultar alunos, inscrições e dados cadastrais." },
    { to: "/admin/participantes", label: "Cadastrar aluno", icon: UserPlus, desc: "Acessar a gestão de alunos e inscrições." },
    { to: "/admin/participantes", label: "Aprovar inscrições", icon: ClipboardCheck, desc: "Consultar inscrições e confirmar matrículas." },
    { to: "/admin/pagamentos", label: "Aprovar pagamentos", icon: CreditCard, desc: "Validar comprovantes e aprovar pagamentos." },
    { to: "/admin/cadastrar-livro", label: "Cadastrar livro / curso", icon: Plus, desc: "Adicionar novos livros, cursos e capas que aparecerão na Home." },
    { to: "/admin/eventos", label: "Cadastrar evento", icon: Calendar, desc: "Criar e organizar os eventos e encontros." },
  ];
  return <div className="w-full min-w-0 space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Book Team</p><h1 className="break-words font-serif text-2xl font-bold sm:text-3xl">Área administrativa</h1><p className="text-sm text-muted-foreground">Administre alunos, livros, cursos, turmas, eventos, inscrições e pagamentos.</p></div>
    <section><h2 className="font-serif text-xl font-semibold">Funções administrativas</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actions.map(({ to, label, icon: Icon, desc }) => <Card key={`${to}-${label}`} className="min-w-0 transition-colors hover:border-primary/50"><CardContent className="p-4"><Link to={to} className="flex min-w-0 items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="rounded-md bg-secondary p-2"><Icon className="h-5 w-5 text-primary" /></div><div className="min-w-0"><p className="font-medium break-words text-foreground">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /></Link></CardContent></Card>)}</div></section>
    <section><h2 className="font-serif text-xl font-semibold">Resumo</h2><div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({ title, value, icon: Icon, href }) => <Card key={title} className="min-w-0 transition-colors hover:border-primary/50"><Link to={href} className="block"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="font-serif text-2xl font-bold break-words">{value}</p></CardContent></Link></Card>)}</div></section>
  </div>;
}
