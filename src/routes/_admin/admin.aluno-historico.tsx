import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/aluno-historico")({
  validateSearch: (search: Record<string, unknown>) => ({
    alunoId: String(search.alunoId ?? ""),
  }),
  component: AdminAlunoHistorico,
});

type Registro = {
  id: string;
  data_conclusao: string;
  observacao: string | null;
  livro: { id: string; titulo: string; ordem: number } | null;
};

function AdminAlunoHistorico() {
  const { alunoId } = useSearch({ from: "/_admin/admin/aluno-historico" });
  const navigate = useNavigate();

  // Buscar dados do aluno
  const alunoQ = useQuery({
    queryKey: ["admin-aluno", alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participantes")
        .select("id, nome, email")
        .eq("id", alunoId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Buscar histórico do aluno
  const historicoQ = useQuery({
    queryKey: ["admin-aluno-historico", alunoId],
    enabled: Boolean(alunoId),
    queryFn: async () => {
      const { data: historico, error: historicoError } = await supabase
        .from("historico_livros")
        .select("id, data_conclusao, observacao, livro_id")
        .eq("participante_id", alunoId)
        .order("data_conclusao", { ascending: false });

      if (historicoError) throw historicoError;
      if (!historico?.length) return [] as Registro[];

      const livroIds = [...new Set(historico.map((r) => r.livro_id).filter(Boolean))];
      const { data: livros, error: livrosError } = await supabase
        .from("livros")
        .select("id, titulo, ordem")
        .in("id", livroIds);

      if (livrosError) throw livrosError;

      const porId = new Map((livros ?? []).map((livro) => [livro.id, livro]));
      return historico.map((r) => ({
        id: r.id,
        data_conclusao: r.data_conclusao,
        observacao: r.observacao,
        livro: r.livro_id ? (porId.get(r.livro_id) ?? null) : null,
      })) as Registro[];
    },
  });

  const aluno = alunoQ.data;
  const registros = historicoQ.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Histórico do Aluno</h1>
          {aluno && (
            <p className="text-muted-foreground">
              {aluno.nome} • {aluno.email}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/admin/participantes" })}
        >
          Voltar
        </Button>
      </div>

      <div className="space-y-3">
        {historicoQ.isLoading && (
          <p className="text-muted-foreground">Carregando...</p>
        )}

        {!historicoQ.isLoading && registros.length === 0 && (
          <p className="text-muted-foreground">Nenhum livro registrado.</p>
        )}

        {registros.map((r) => {
          const livro = r.livro as unknown as
            | { titulo: string; ordem: number }
            | null;
          return (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-serif text-lg font-semibold">
                    {livro ? `${livro.ordem}. ${livro.titulo}` : "Livro"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Concluído em{" "}
                    {new Date(r.data_conclusao + "T00:00:00").toLocaleDateString(
                      "pt-BR"
                    )}
                    {r.observacao ? ` — ${r.observacao}` : ""}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
