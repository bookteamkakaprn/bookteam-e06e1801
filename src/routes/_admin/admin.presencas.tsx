import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/presencas")({
  head: () => ({ meta: [{ title: "Lista de Presença — Admin" }, { name: "robots", content: "noindex" }] }),
  component: PresencaPage,
});

type Inscricao = {
  id: string;
  status: string;
  participante: { id: string; nome: string | null; email: string | null } | null;
  livro: { id: string; titulo: string | null } | null;
  turma: { id: string; nome: string | null; data_inicio: string | null } | null;
};

type Presenca = {
  id: string;
  inscricao_id: string;
  presente: boolean;
  horario_checkin: string | null;
};

function PresencaPage() {
  const qc = useQueryClient();
  const [filtroLivro, setFiltroLivro] = useState<string>("");
  const [filtroTurma, setFiltroTurma] = useState<string>("");

  // Buscar inscrições aprovadas (confirmada)
  const inscricoesQ = useQuery({
    queryKey: ["admin-presenca-inscricoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          `id, status,
           participante:participantes(id, nome, email),
           livro:livros(id, titulo),
           turma:turmas(id, nome, data_inicio)`
        )
        .eq("status", "confirmada")
        .order("participante_id", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Inscricao[];
    },
  });

  // Buscar presenças registradas
  const presencasQ = useQuery({
    queryKey: ["admin-presenca-registros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("presencas").select("*");
      if (error) throw error;
      return (data ?? []) as Presenca[];
    },
  });

  // Registrar presença
  const registrarPresenca = useMutation({
    mutationFn: async ({
      inscricaoId,
      presente,
    }: {
      inscricaoId: string;
      presente: boolean;
    }) => {
      // Verificar se já existe presença
      const { data: existente } = await supabase
        .from("presencas")
        .select("id")
        .eq("inscricao_id", inscricaoId)
        .maybeSingle();

      if (existente) {
        // Atualizar
        const { error } = await supabase
          .from("presencas")
          .update({ presente, horario_checkin: new Date().toISOString() })
          .eq("inscricao_id", inscricaoId);
        if (error) throw error;
      } else {
        // Inserir nova
        const { error } = await supabase.from("presencas").insert({
          inscricao_id: inscricaoId,
          presente,
          horario_checkin: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Presença registrada!");
      qc.invalidateQueries({ queryKey: ["admin-presenca-registros"] });
    },
    onError: (e) => {
      toast.error(`Erro ao registrar presença: ${e instanceof Error ? e.message : "Desconhecido"}`);
    },
  });

  const inscricoes = inscricoesQ.data ?? [];
  const presencas = presencasQ.data ?? [];

  // Agrupar por livro
  const livrosUnicos = [...new Set(inscricoes.map((i) => i.livro?.id))].filter(Boolean);
  const livroLabels: Record<string, string> = {};
  inscricoes.forEach((i) => {
    if (i.livro?.id) livroLabels[i.livro.id] = i.livro.titulo || "Sem título";
  });

  // Agrupar por turma
  const turmasUnicas = [...new Set(inscricoes.map((i) => i.turma?.id))].filter(Boolean);
  const turmaLabels: Record<string, string> = {};
  inscricoes.forEach((i) => {
    if (i.turma?.id) turmaLabels[i.turma.id] = i.turma.nome || "Sem turma";
  });

  // Filtrar
  const inscricoesFiltradas = inscricoes.filter((i) => {
    const matchLivro = !filtroLivro || i.livro?.id === filtroLivro;
    const matchTurma = !filtroTurma || i.turma?.id === filtroTurma;
    return matchLivro && matchTurma;
  });

  const getPresenca = (inscricaoId: string) => {
    return presencas.find((p) => p.inscricao_id === inscricaoId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Lista de Presença</h1>
        <p className="text-sm text-muted-foreground">
          Registre a presença dos alunos inscritos
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="text-sm font-medium">Curso</label>
          <select
            value={filtroLivro}
            onChange={(e) => setFiltroLivro(e.target.value)}
            className="mt-1 px-3 py-2 bg-card border border-border/40 rounded-md text-sm"
          >
            <option value="">Todos os cursos</option>
            {livrosUnicos.map((livroId) => (
              <option key={livroId} value={livroId}>
                {livroLabels[livroId]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Turma</label>
          <select
            value={filtroTurma}
            onChange={(e) => setFiltroTurma(e.target.value)}
            className="mt-1 px-3 py-2 bg-card border border-border/40 rounded-md text-sm"
          >
            <option value="">Todas as turmas</option>
            {turmasUnicas.map((turmaId) => (
              <option key={turmaId} value={turmaId}>
                {turmaLabels[turmaId]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {inscricoesQ.isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {!inscricoesQ.isLoading && inscricoesFiltradas.length === 0 && (
        <p className="text-muted-foreground">Nenhuma inscrição aprovada encontrada.</p>
      )}

      {!inscricoesQ.isLoading && inscricoesFiltradas.length > 0 && (
        <div className="border border-border/40 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-card/30">
                <th className="px-4 py-3 text-left font-medium">Aluno</th>
                <th className="px-4 py-3 text-left font-medium">Curso</th>
                <th className="px-4 py-3 text-left font-medium">Turma</th>
                <th className="px-4 py-3 text-center font-medium">Presença</th>
              </tr>
            </thead>
            <tbody>
              {inscricoesFiltradas.map((inscricao) => {
                const presenca = getPresenca(inscricao.id);
                return (
                  <tr key={inscricao.id} className="border-b border-border/20 hover:bg-card/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{inscricao.participante?.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {inscricao.participante?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">{inscricao.livro?.titulo}</td>
                    <td className="px-4 py-3">{inscricao.turma?.nome}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant={presenca?.presente ? "default" : "outline"}
                          className={
                            presenca?.presente
                              ? "bg-green-600 hover:bg-green-700"
                              : ""
                          }
                          onClick={() =>
                            registrarPresenca.mutate({
                              inscricaoId: inscricao.id,
                              presente: true,
                            })
                          }
                          disabled={registrarPresenca.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Presente
                        </Button>

                        <Button
                          size="sm"
                          variant={
                            presenca && !presenca.presente
                              ? "destructive"
                              : "outline"
                          }
                          onClick={() =>
                            registrarPresenca.mutate({
                              inscricaoId: inscricao.id,
                              presente: false,
                            })
                          }
                          disabled={registrarPresenca.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Ausente
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Estatísticas */}
      {inscricoesFiltradas.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card/30 rounded-lg p-4 border border-border/40">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{inscricoesFiltradas.length}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
            <p className="text-sm text-muted-foreground">Presentes</p>
            <p className="text-2xl font-bold text-green-600">
              {presencas.filter((p) => p.presente && 
                inscricoesFiltradas.some(i => i.id === p.inscricao_id)
              ).length}
            </p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <p className="text-sm text-muted-foreground">Ausentes</p>
            <p className="text-2xl font-bold text-red-600">
              {presencas.filter((p) => !p.presente && 
                inscricoesFiltradas.some(i => i.id === p.inscricao_id)
              ).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
