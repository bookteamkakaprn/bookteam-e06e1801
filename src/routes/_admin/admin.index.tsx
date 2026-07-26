import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CreditCard, DollarSign, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Admin — Book Clube" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [participantes, eventosFuturos, eventosPassados, pagPend, pagAprov] = await Promise.all([
        supabase.from("participantes").select("id", { count: "exact", head: true }),
        supabase.from("eventos").select("id", { count: "exact", head: true }).gte("data", today),
        supabase.from("eventos").select("id", { count: "exact", head: true }).lt("data", today),
        supabase.from("pagamentos").select("id", { count: "exact", head: true }).eq("status", "aguardando"),
        supabase.from("pagamentos").select("valor").eq("status", "aprovado"),
      ]);
      const receita = (pagAprov.data ?? []).reduce((s, p) => s + Number(p.valor ?? 0), 0);
      return {
        participantes: participantes.count ?? 0,
        eventosFuturos: eventosFuturos.count ?? 0,
        eventosPassados: eventosPassados.count ?? 0,
        pagPend: pagPend.count ?? 0,
        pagAprov: pagAprov.data?.length ?? 0,
        receita,
      };
    },
  });

  const cards = [
    { title: "Participantes", value: stats?.participantes ?? "—", icon: Users },
    { title: "Encontros futuros", value: stats?.eventosFuturos ?? "—", icon: Calendar },
    { title: "Encontros realizados", value: stats?.eventosPassados ?? "—", icon: CheckCircle2 },
    { title: "Pagamentos pendentes", value: stats?.pagPend ?? "—", icon: Clock },
    { title: "Pagamentos aprovados", value: stats?.pagAprov ?? "—", icon: CreditCard },
    { title: "Receita total", value: stats ? stats.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—", icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do Book Clube.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-serif text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        Gráficos, CRM, aprovação de pagamentos, presença e emissão de certificados estarão disponíveis nas próximas fases.
      </div>
    </div>
  );
}
