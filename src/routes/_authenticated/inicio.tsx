import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Meu painel — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: InicioPage,
});

type Insc = {
  id: string;
  status: string;
  created_at: string;
  evento: { id: string; titulo: string; data: string; hora: string | null; cidade: string | null; local: string | null } | null;
  pagamentos: { status: string; created_at: string }[] | null;
};

function statusMeta(i: Insc) {
  if (i.status === "confirmada") return { label: "Confirmada", Icon: CheckCircle2, variant: "default" as const };
  const p = [...(i.pagamentos ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (p?.status === "aguardando") return { label: "Em validação", Icon: Clock, variant: "secondary" as const };
  if (p?.status === "rejeitado") return { label: "Não validado", Icon: AlertCircle, variant: "destructive" as const };
  return { label: "Pendente pagamento", Icon: AlertCircle, variant: "outline" as const };
}

function InicioPage() {
  const { user } = useAuth();
  const nome = (user?.user_metadata?.nome as string | undefined) ?? user?.email;

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["minhas-inscricoes", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("inscricoes")
        .select(
          "id, status, created_at, evento:eventos(id, titulo, data, hora, cidade, local), pagamentos(status, created_at)"
        )
        .eq("participante_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Insc[];
    },
  });

  const inscricoes = data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="font-serif text-3xl font-bold">{nome}</h1>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">Minhas inscrições</h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/eventos">Ver encontros</Link>
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && inscricoes.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Você ainda não se inscreveu em nenhum encontro.{" "}
                <Button asChild variant="link" className="ml-1 px-0">
                  <Link to="/eventos">Ver encontros disponíveis</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {inscricoes.map((i) => {
            const meta = statusMeta(i);
            const Icon = meta.Icon;
            const ev = i.evento;
            if (!ev) return null;
            return (
              <Card key={i.id}>
                <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-serif text-lg font-semibold">{ev.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      <Calendar className="mr-1 inline h-3.5 w-3.5" />
                      {new Date(ev.data + "T00:00:00").toLocaleDateString("pt-BR")} {ev.hora?.slice(0, 5)}
                      {(ev.local || ev.cidade) && ` — ${[ev.local, ev.cidade].filter(Boolean).join(", ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={meta.variant} className="inline-flex items-center gap-1">
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/inscricao/$eventoId" params={{ eventoId: ev.id }}>
                        Ver
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
