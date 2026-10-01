import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, UserRound } from "lucide-react";

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
};
type Inscricao = {
  id: string;
  status: string;
  livro_disponibilizado: boolean;
  participante: { id: string; nome: string; email: string; telefone: string | null } | null;
};

function AdminVisualizacaoTurmasPage() {
  const [turmaId, setTurmaId] = useState("");

  const turmasQ = useQuery({
    queryKey: ["admin-visualizacao-turmas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id,nome,livro_id,data_inicio,data_fim,horario,sala,vagas_max,inscritos,livro:livros(titulo)")
        .order("data_inicio", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const inscricoesQ = useQuery({
    enabled: !!turmaId,
    queryKey: ["admin-visualizacao-inscritos", turmaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("id,status,livro_disponibilizado,participante:participantes(id,nome,email,telefone)")
        .eq("turma_id", turmaId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
    },
  });

  const turma = (turmasQ.data ?? []).find((t) => t.id === turmaId);
  const confirmados = (inscricoesQ.data ?? []).filter((i) => i.status === "confirmada");

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
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Alunos inscritos ({confirmados.length})</CardTitle></CardHeader>
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
                  <Badge variant={i.livro_disponibilizado ? "default" : "outline"}>
                    {i.livro_disponibilizado ? "Livro disponibilizado" : "Livro pendente"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
