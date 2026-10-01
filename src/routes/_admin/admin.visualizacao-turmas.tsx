import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Loader2, UserRound, PackageCheck, LoaderCircle } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/visualizacao-turmas")({
  component: AdminVisualizacaoTurmasPage,
});

type Turma = {
  id: string;
  nome: string;
  livro_id: string;
  data_inicio: string | null;
  data_fim: string | null;
  horario: string | null;
  sala: string | null;
  vagas_max: number;
  inscritos: number;
  livro: { titulo: string | null } | null;
};
type Inscricao = {
  id: string;
  status: string;
  livro_disponibilizado: boolean;
  participante: { id: string; nome: string; email: string; telefone: string | null } | null;
};

type Estoque = { livro_id: string; quantidade: number };

function AdminVisualizacaoTurmasPage() {
  const [turmaId, setTurmaId] = useState("");
  const qc = useQueryClient();

  const turmasQ = useQuery({
    queryKey: ["admin-visualizacao-turmas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id,nome,livro_id,data_inicio,data_fim,horario,sala,vagas_max,inscritos")
        .order("data_inicio", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;

      const ids = [...new Set((data ?? []).map((t) => t.livro_id).filter(Boolean))];
      const { data: livros } = ids.length
        ? await supabase.from("livros").select("id,titulo").in("id", ids)
        : { data: [] as { id: string; titulo: string | null }[] };
      const mapa = new Map((livros ?? []).map((l) => [l.id, l]));
      return (data ?? []).map((t) => ({ ...t, livro: mapa.get(t.livro_id) ?? null })) as any[];
    },
  });

  const turmaSelecionada = (turmasQ.data ?? []).find((t) => t.id === turmaId);

  const estoqueQ = useQuery({
    enabled: !!turmaSelecionada?.livro_id,
    queryKey: ["admin-visualizacao-estoque", turmaSelecionada?.livro_id],
    queryFn: async () => {
      if (!turmaSelecionada?.livro_id) return 0;
      const { data, error } = await (supabase as any)
        .from("estoque_livraria")
        .select("livro_id,quantidade")
        .eq("livro_id", turmaSelecionada.livro_id)
        .maybeSingle();
      if (error) throw error;
      return Number((data as Estoque | null)?.quantidade ?? 0);
    },
  });

  const inscricoesQ = useQuery({
    enabled: !!turmaId,
    queryKey: ["admin-visualizacao-inscritos", turmaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("id,status,livro_disponibilizado,participante_id")
        .eq("turma_id", turmaId)
        .order("created_at");
      if (error) throw error;

      const ids = [...new Set((data ?? []).map((i: any) => i.participante_id).filter(Boolean))];
      const { data: participantes } = ids.length
        ? await supabase.from("participantes").select("id,nome,email,telefone").in("id", ids)
        : { data: [] as any[] };
      const mapa = new Map((participantes ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((i: any) => ({ ...i, participante: mapa.get(i.participante_id) ?? null })) as unknown as Inscricao[];
    },
  });

  const turma = turmaSelecionada;
  const confirmados = (inscricoesQ.data ?? []).filter((i) => i.status === "confirmada");
  const estoqueDisponivel = Number(estoqueQ.data ?? 0);

  const entregarLivro = useMutation({
    mutationFn: async (inscricaoId: string) => {
      const { data, error } = await (supabase as any).rpc("entregar_livro_inscricao", {
        p_inscricao_id: inscricaoId,
        p_observacao: turma ? `Entrega manual de livro — ${turma.nome}` : null,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: (total) => {
      if (total > 0) {
        toast.success("Livro marcado como entregue e baixa realizada no estoque.");
      } else {
        toast.info("Este livro já estava marcado como entregue.");
      }
      qc.invalidateQueries({ queryKey: ["admin-visualizacao-inscritos", turmaId] });
      qc.invalidateQueries({ queryKey: ["admin-estoque"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "Não foi possível registrar a entrega."),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Visualização de turma + inscritos</h1>
        <p className="text-sm text-muted-foreground">
          Selecione uma turma para ver os alunos inscritos e o status de disponibilização do livro.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Selecionar turma</CardTitle></CardHeader>
        <CardContent>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            <option value="">Selecione...</option>
            {(turmasQ.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} — {t.livro?.titulo ?? "Curso"}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {turmasQ.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando turmas...</div>}

      {turma && (
        <>
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">Curso</p><p className="font-medium">{turma.livro?.titulo ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Turma</p><p className="font-medium">{turma.nome}</p></div>
              <div><p className="text-xs text-muted-foreground">Período</p><p className="font-medium">{turma.data_inicio ? new Date(turma.data_inicio).toLocaleDateString("pt-BR") : "—"}{turma.data_fim ? ` a ${new Date(turma.data_fim).toLocaleDateString("pt-BR")}` : ""}</p></div>
              <div><p className="text-xs text-muted-foreground">Inscritos</p><p className="font-medium">{turma.inscritos}/{turma.vagas_max}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Alunos inscritos ({confirmados.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Estoque de <strong>{turma.livro?.titulo ?? "livro"}</strong>: {estoqueDisponivel} unidade(s) disponível(is).
                A entrega baixa automaticamente 1 unidade do estoque.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {inscricoesQ.isLoading && <div className="py-6 text-sm text-muted-foreground">Carregando inscritos...</div>}
              {!inscricoesQ.isLoading && confirmados.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nenhum aluno confirmado nesta turma.</p>}
              {confirmados.map((i, index) => (
                <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"><UserRound className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{index + 1}. {i.participante?.nome ?? "Aluno"}</p>
                    <p className="text-xs text-muted-foreground">{i.participante?.email ?? "—"}{i.participante?.telefone ? ` · ${i.participante.telefone}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={i.livro_disponibilizado ? "default" : "outline"}>
                      {i.livro_disponibilizado ? "Livro entregue" : "Livro pendente"}
                    </Badge>
                    {!i.livro_disponibilizado && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={entregarLivro.isPending || estoqueDisponivel < 1}
                        onClick={() => {
                          if (window.confirm(`Marcar o livro de ${i.participante?.nome ?? "este aluno"} como entregue? Isso fará a baixa de 1 unidade no estoque.`)) {
                            entregarLivro.mutate(i.id);
                          }
                        }}
                      >
                        {entregarLivro.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                        {estoqueDisponivel < 1 ? "Sem estoque" : "Entregar livro"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
