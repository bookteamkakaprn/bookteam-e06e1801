import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CreditCard, DollarSign, CheckCircle2, Clock, BookOpen, GraduationCap, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_admin/admin")({ head: () => ({ meta: [{ title: "Área administrativa — Book Clube" }, { name: "robots", content: "noindex" }] }), component: AdminDashboard });
function AdminDashboard() {
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [participantes, eventosFuturos, eventosPassados, pagPend, pagAprov, turmas, livros, inscricoes] = await Promise.all([
      supabase.from("participantes").select("id", { count: "exact", head: true }),
      supabase.from("eventos").select("id", { count: "exact", head: true }).gte("data_evento", today),
      supabase.from("eventos").select("id", { count: "exact", head: true }).lt("data_evento", today),
      supabase.from("pagamentos").select("id", { count: "exact", head: true }).eq("status", "aguardando"),
      supabase.from("pagamentos").select("valor").eq("status", "aprovado"),
      supabase.from("turmas").select("id", { count: "exact", head: true }),
      supabase.from("livros").select("id", { count: "exact", head: true }),
      supabase.from("inscricoes").select("id", { count: "exact", head: true }).eq("status", "confirmada"),
    ]);
    const receita = (pagAprov.data ?? []).reduce((s, p) => s + Number(p.valor ?? 0), 0);
    return { participantes: participantes.count ?? 0, eventosFuturos: eventosFuturos.count ?? 0, eventosPassados: eventosPassados.count ?? 0, pagPend: pagPend.count ?? 0, pagAprov: pagAprov.data?.length ?? 0, receita, turmas: turmas.count ?? 0, livros: livros.count ?? 0, inscricoes: inscricoes.count ?? 0 };
  } });
  const cards = [
    { title: "Alunos", value: stats?.participantes ?? "—", icon: Users, href: "/admin/participantes" },
    { title: "Turmas", value: stats?.turmas ?? "—", icon: GraduationCap, href: "/admin/turmas" },
    { title: "Livros e cursos", value: stats?.livros ?? "—", icon: BookOpen, href: "/admin/livros" },
    { title: "Eventos futuros", value: stats?.eventosFuturos ?? "—", icon: Calendar, href: "/admin/eventos" },
    { title: "Pagamentos pendentes", value: stats?.pagPend ?? "—", icon: Clock, href: "/admin/pagamentos" },
    { title: "Pagamentos aprovados", value: stats?.pagAprov ?? "—", icon: CreditCard, href: "/admin/pagamentos" },
    { title: "Inscrições para liberar", value: stats?.inscricoes ?? "—", icon: ClipboardCheck, href: "/admin/inscricoes" },
    { title: "Eventos realizados", value: stats?.eventosPassados ?? "—", icon: CheckCircle2, href: "/admin/eventos" },
    { title: "Receita total", value: stats ? stats.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—", icon: DollarSign, href: "/admin/pagamentos" },
  ];
  return <div className="w-full min-w-0 space-y-6"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Book Team</p><h1 className="break-words font-serif text-2xl font-bold sm:text-3xl">Área administrativa</h1><p className="text-sm text-muted-foreground">Visão geral do Book Team.</p></div><section><h2 className="font-serif text-xl font-semibold">Resumo</h2><div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({ title, value, icon: Icon, href }) => <Card key={title} className="min-w-0 transition-colors hover:border-primary/50"><Link to={href} className="block"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="break-words font-serif text-2xl font-bold">{value}</p></CardContent></Link></Card>)}</div></section></div>;
}
