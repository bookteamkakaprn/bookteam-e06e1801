import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { createFileRoute } from "@tanstack/react-router";

function PresencaPage() {
  const { user } = useAuth();

  const { data: inscricoes = [], isLoading } = useQuery({
    queryKey: ["inscricoes-presenca", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          `
          id,
          status,
          livro:livros (id, titulo),
          turma:turmas (id, data_inicio),
          presencas (id, presente)
        `
        )
        .eq("participante_id", user.id)
        .eq("status", "confirmada")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Presença</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe sua presença nos cursos
          </p>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inscricoes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Presença</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe sua presença nos cursos
          </p>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Você ainda não tem nenhum curso confirmado. Quando se inscrever e seu pagamento for aprovado, sua presença aparecerá aqui.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Presença</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe sua presença nos cursos confirmados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>📋 Sua Presença nos Cursos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            A presença é marcada pelo admin durante as aulas. Você pode acompanhar aqui.
          </p>

          <div className="space-y-3">
            {inscricoes.map((inscricao) => {
              const curso = inscricao.livro?.titulo || "Curso não informado";
              const turma = inscricao.turma as any;
              const data = turma?.data_inicio;
              const presencas = inscricao.presencas as any[];
              const presente = presencas?.[0]?.presente ?? null;

              return (
                <div
                  key={inscricao.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{curso}</p>
                    {data && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(data).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {presente === true ? (
                      <Badge className="gap-1 bg-green-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Presente
                      </Badge>
                    ) : presente === false ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Ausente
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Não marcado
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/presenca")({
  head: () => ({ meta: [{ title: "Presença — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: PresencaPage,
});
