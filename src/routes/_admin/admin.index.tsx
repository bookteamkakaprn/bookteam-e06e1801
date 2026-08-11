import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, CreditCard, DollarSign, CheckCircle2, Clock, BookOpen, GraduationCap, Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Admin — Book Clube" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
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
      return {
        participantes: participantes.count ?? 0,
        eventosFuturos: eventosFuturos.count ?? 0,
        eventosPassados: eventosPassados.count ?? 0,
        pagPend: pagPend.count ?? 0,
        pagAprov: pagAprov.data?.length ?? 0,
        receita,
        turmas: turmas.count ?? 0,
        livros: livros.count ?? 0,
      };
    },
  });

  const cards = [
    { title: "Participantes", value: stats?.participantes ?? "—", icon: Users, href: "/admin/participantes" },
    { title: "Turmas ativas", value: stats?.turmas ?? "—", icon: GraduationCap, href: "/admin/turmas" },
    { title: "Livros na grade", value: stats?.livros ?? "—", icon: BookOpen, href: "/admin/livros" },
    { title: "Encontros futuros", value: stats?.eventosFuturos ?? "—", icon: Calendar, href: "/admin/eventos" },
    { title: "Pagamentos pendentes", value: stats?.pagPend ?? "—", icon: Clock, href: "/admin/pagamentos" },
    { title: "Pagamentos aprovados", value: stats?.pagAprov ?? "—", icon: CreditCard, href: "/admin/pagamentos" },
    { title: "Encontros realizados", value: stats?.eventosPassados ?? "—", icon: CheckCircle2, href: "/admin/eventos" },
    { title: "Receita total", value: stats ? stats.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—", icon: DollarSign, href: "/admin/pagamentos" },
  ];

  const actions = [
    { to: "/admin/turmas", label: "Aprovar turmas", icon: GraduationCap, desc: "Criar, editar e gerenciar vagas de turmas por livro." },
    { to: "/admin/participantes", label: "Aprovar alunos", icon: Users, desc: "Visualizar inscrições, dados dos alunos e confirmar matrículas." },
    { to: "/admin/pagamentos", label: "Aprovar pagamentos", icon: CreditCard, desc: "Validar comprovantes, aprovar, recusar ou solicitar novo envio." },
    { to: "/admin/livros", label: "Incluir novos cursos", icon: Plus, desc: "Adicionar ou editar livros e trilhas na grade de cursos." },
    { to: "/admin/eventos", label: "Gerenciar encontros", icon: Calendar, desc: "Organizar datas, locais e calendário de encontros." },
    { to: "/admin/conta", label: "Dados da conta PIX", icon: DollarSign, desc: "Configurar chave PIX, QR Code e instruções de pagamento." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Painel administrativo</h1>
        <p className="text-muted-foreground">Aprove turmas, alunos e pagamentos, e inclua novos cursos na grade.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ title, value, icon: Icon, href }) => (
          <Card key={title} className="transition-colors hover:border-primary/50">
            <Link to={href} className="block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="font-serif text-2xl font-bold">{value}</p>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="font-serif text-xl font-semibold">Ações rápidas</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map(({ to, label, icon: Icon, desc }) => (
            <Card key={to} className="transition-colors hover:border-primary/50">
              <CardContent className="p-4">
                <Link to={to} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-secondary p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        CRM, presença, certificados e relatórios avançados estarão disponíveis nas próximas fases.
      </div>
    </div>
  );
}
