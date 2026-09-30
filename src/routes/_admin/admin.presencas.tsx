import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/presencas")({
  head: () => ({
    meta: [
      { title: "Lista de Presença — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PresencaPage,
});

type Turma = {
  id: string;
  nome: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  dia_semana: string | null;
};

type Inscricao = {
  id: string;
  status: string;
  participante: { id: string; nome: string | null; email: string | null } | null;
  livro: { id: string; titulo: string | null } | null;
  turma: Turma | null;
};

type Presenca = {
  id: string;
  inscricao_id: string;
  participante_id: string;
  data_aula: string;
  presente: boolean;
  horario_checkin: string | null;
};

const DIAS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function dataISO(date: Date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataLocal(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function formatarData(iso: string) {
  return dataLocal(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function gerarDiasAula(turma: Turma | null) {
  if (!turma?.data_inicio || !turma?.data_fim || turma.dia_semana === null || turma.dia_semana === "") {
    return [];
  }

  const inicio = dataLocal(turma.data_inicio);
  const fim = dataLocal(turma.data_fim);
  const diaSemana = Number(turma.dia_semana);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || Number.isNaN(diaSemana)) {
    return [];
  }

  const dias: string[] = [];
  const cursor = new Date(inicio);

  while (cursor <= fim) {
    if (cursor.getDay() === diaSemana) {
      dias.push(dataISO(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dias;
}

function PresencaPage() {
  const qc = useQueryClient();
  const [filtroLivro, setFiltroLivro] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState("");

  const inscricoesQ = useQuery({
    queryKey: ["admin-presenca-inscricoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          `id, status,
           participante:participantes(id, nome, email),
           livro:livros(id, titulo),
           turma:turmas(id, nome, data_inicio, data_fim, dia_semana)`
        )
        .eq("status", "confirmada")
        .order("participante_id", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
    },
  });

  const presencasQ = useQuery({
    queryKey: ["admin-presenca-registros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presencas")
        .select("id, inscricao_id, participante_id, data_aula, presente, horario_checkin");
      if (error) throw error;
      return (data ?? []) as Presenca[];
    },
  });

  const registrarPresenca = useMutation({
    mutationFn: async ({
      inscricaoId,
      participanteId,
      dataAula,
      presente,
    }: {
      inscricaoId: string;
      participanteId: string;
      dataAula: string;
      presente: boolean;
    }) => {
      const { data: existente, error: buscaError } = await supabase
        .from("presencas")
        .select("id")
        .eq("inscricao_id", inscricaoId)
        .eq("data_aula", dataAula)
        .maybeSingle();

      if (buscaError) throw buscaError;

      const payload = {
        inscricao_id: inscricaoId,
        participante_id: participanteId,
        data_aula: dataAula,
        presente,
        horario_checkin: presente ? new Date().toISOString() : null,
      };

      if (existente) {
        const { error } = await supabase
          .from("presencas")
          .update(payload as never)
          .eq("id", existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("presencas").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Presença registrada!");
      qc.invalidateQueries({ queryKey: ["admin-presenca-registros"] });
    },
    onError: (e) => {
      toast.error(
        `Erro ao registrar presença: ${e instanceof Error ? e.message : "Desconhecido"}`
      );
    },
  });

  const inscricoes = inscricoesQ.data ?? [];
  const presencas = presencasQ.data ?? [];

  const livrosUnicos = [...new Set(inscricoes.map((i) => i.livro?.id))].filter(Boolean) as string[];
  const livroLabels: Record<string, string> = {};
  inscricoes.forEach((i) => {
    if (i.livro?.id) livroLabels[i.livro.id] = i.livro.titulo || "Sem título";
  });

  const turmasUnicas = [...new Set(inscricoes.map((i) => i.turma?.id))].filter(Boolean) as string[];
  const turmaLabels: Record<string, string> = {};
  const turmaPorId = new Map<string, Turma>();
  inscricoes.forEach((i) => {
    if (i.turma?.id) {
      turmaLabels[i.turma.id] = i.turma.nome || "Sem turma";
      turmaPorId.set(i.turma.id, i.turma);
    }
  });

  const inscricoesFiltradas = inscricoes.filter((i) => {
    const matchLivro = !filtroLivro || i.livro?.id === filtroLivro;
    const matchTurma = !filtroTurma || i.turma?.id === filtroTurma;
    return matchLivro && matchTurma;
  });

  const turmaSelecionada = useMemo(
    () => (filtroTurma ? turmaPorId.get(filtroTurma) ?? null : null),
    [filtroTurma, inscricoes]
  );

  const diasAula = useMemo(
    () => gerarDiasAula(turmaSelecionada),
    [turmaSelecionada]
  );

  const dataAtual = dataSelecionada && diasAula.includes(dataSelecionada)
    ? dataSelecionada
    : diasAula[0] ?? "";

  const getPresenca = (inscricaoId: string, dataAula: string) =>
    presencas.find(
      (p) => p.inscricao_id === inscricaoId && p.data_aula === dataAula
    );

  const presentesNoDia = inscricoesFiltradas.filter(
    (i) => dataAtual && getPresenca(i.id, dataAtual)?.presente
  ).length;

  const ausentesNoDia = inscricoesFiltradas.filter(
    (i) => dataAtual && getPresenca(i.id, dataAtual) && !getPresenca(i.id, dataAtual)?.presente
  ).length;

  const selecionarTurma = (id: string) => {
    setFiltroTurma(id);
    setDataSelecionada("");
  };

  const indiceData = Math.max(0, diasAula.indexOf(dataAtual));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Lista de Presença</h1>
        <p className="text-sm text-muted-foreground">
          Registre a presença dos alunos em cada encontro da turma.
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="text-sm font-medium">Curso</label>
          <select
            value={filtroLivro}
            onChange={(e) => {
              setFiltroLivro(e.target.value);
              setFiltroTurma("");
              setDataSelecionada("");
            }}
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
            onChange={(e) => selecionarTurma(e.target.value)}
            className="mt-1 px-3 py-2 bg-card border border-border/40 rounded-md text-sm"
          >
            <option value="">Selecione uma turma</option>
            {turmasUnicas
              .filter((id) => !filtroLivro || inscricoes.some((i) => i.turma?.id === id && i.livro?.id === filtroLivro))
              .map((turmaId) => (
                <option key={turmaId} value={turmaId}>
                  {turmaLabels[turmaId]}
                </option>
              ))}
          </select>
        </div>
      </div>

      {filtroTurma && turmaSelecionada && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 text-gold" />
            <div>
              <p className="font-semibold">{turmaSelecionada.nome}</p>
              <p className="text-sm text-muted-foreground">
                {turmaSelecionada.data_inicio
                  ? dataLocal(turmaSelecionada.data_inicio).toLocaleDateString("pt-BR")
                  : "—"}
                {" até "}
                {turmaSelecionada.data_fim
                  ? dataLocal(turmaSelecionada.data_fim).toLocaleDateString("pt-BR")
                  : "—"}
                {" · "}
                {turmaSelecionada.dia_semana !== null && turmaSelecionada.dia_semana !== ""
                  ? DIAS[Number(turmaSelecionada.dia_semana)]
                  : "dia da semana não configurado"}
              </p>
            </div>
          </div>
        </div>
      )}

      {filtroTurma && diasAula.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold">Dias do curso</p>
              <p className="text-xs text-muted-foreground">
                {diasAula.length} encontro(s) entre as datas da turma
              </p>
            </div>
            <Badge variant="secondary">
              {formatarData(dataAtual)}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              disabled={indiceData <= 0}
              onClick={() => setDataSelecionada(diasAula[indiceData - 1])}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {diasAula.map((dia, index) => (
                  <Button
                    key={dia}
                    size="sm"
                    variant={dia === dataAtual ? "default" : "outline"}
                    onClick={() => setDataSelecionada(dia)}
                  >
                    {index + 1}. {formatarData(dia)}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              size="icon"
              variant="outline"
              disabled={indiceData >= diasAula.length - 1}
              onClick={() => setDataSelecionada(diasAula[indiceData + 1])}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {filtroTurma && turmaSelecionada && diasAula.length === 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm">
          <p className="font-semibold">Configure o dia da semana da turma.</p>
          <p className="mt-1 text-muted-foreground">
            A lista usa a data de início, a data de fim e o dia da semana cadastrado em Turmas
            para gerar automaticamente cada encontro.
          </p>
        </div>
      )}

      {!filtroTurma && (
        <p className="text-sm text-muted-foreground">
          Selecione uma turma para visualizar os dias do curso e registrar as presenças.
        </p>
      )}

      {filtroTurma && dataAtual && !inscricoesQ.isLoading && inscricoesFiltradas.length > 0 && (
        <div className="border border-border/40 rounded-lg overflow-hidden">
          <div className="border-b border-border/40 bg-card/30 px-4 py-3">
            <p className="font-semibold">Presença — {formatarData(dataAtual)}</p>
            <p className="text-xs text-muted-foreground">
              Toque em Presente ou Ausente para cada aluno.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
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
                  const presenca = getPresenca(inscricao.id, dataAtual);
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
                            className={presenca?.presente ? "bg-green-600 hover:bg-green-700" : ""}
                            onClick={() =>
                              registrarPresenca.mutate({
                                inscricaoId: inscricao.id,
                                participanteId: inscricao.participante?.id ?? "",
                                dataAula: dataAtual,
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
                            variant={presenca && !presenca.presente ? "destructive" : "outline"}
                            onClick={() =>
                              registrarPresenca.mutate({
                                inscricaoId: inscricao.id,
                                participanteId: inscricao.participante?.id ?? "",
                                dataAula: dataAtual,
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
        </div>
      )}

      {filtroTurma && dataAtual && inscricoesFiltradas.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card/30 rounded-lg p-4 border border-border/40">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{inscricoesFiltradas.length}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
            <p className="text-sm text-muted-foreground">Presentes</p>
            <p className="text-2xl font-bold text-green-600">{presentesNoDia}</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <p className="text-sm text-muted-foreground">Ausentes</p>
            <p className="text-2xl font-bold text-red-600">{ausentesNoDia}</p>
          </div>
        </div>
      )}
    </div>
  );
}
