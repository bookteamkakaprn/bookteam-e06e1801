import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: PagPage,
});

type PagRow = {
  id: string;
  status: string;
  valor: number;
  observacao: string | null;
  created_at: string;
  evento: { id: string; titulo: string; data: string } | null;
};

function PagPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["meus-pagamentos", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pagamentos")
        .select("id, status, valor, observacao, created_at, evento:eventos(id, titulo, data)")
        .eq("participante_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as PagRow[];
    },
  });

  const badge = (s: string) => {
    if (s === "aprovado") return { Icon: CheckCircle2, variant: "default" as const, label: "Aprovado" };
    if (s === "rejeitado") return { Icon: XCircle, variant: "destructive" as const, label: "Rejeitado" };
    return { Icon: Clock, variant: "secondary" as const, label: "Aguardando" };
  };

  const pagamentos = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold">Pagamentos</h1>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && pagamentos.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Nenhum pagamento enviado ainda.</CardContent>
        </Card>
      )}
      {pagamentos.map((p) => {
        const b = badge(p.status);
        const Icon = b.Icon;
        return (
          <Card key={p.id}>
            <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-serif text-lg font-semibold">{p.evento?.titulo ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Enviado em {new Date(p.created_at).toLocaleString("pt-BR")}</p>
                {p.observacao && <p className="text-xs text-muted-foreground">Obs: {p.observacao}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-serif text-lg">
                  {Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <Badge variant={b.variant} className="inline-flex items-center gap-1">
                  <Icon className="h-3 w-3" /> {b.label}
                </Badge>
                {p.evento?.id && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/inscricao/$eventoId" params={{ eventoId: p.evento.id }}>Ver</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
