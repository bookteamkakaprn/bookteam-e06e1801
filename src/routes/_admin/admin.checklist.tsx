import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Info } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/checklist")({
  component: AdminChecklistPage,
});

type Turma = {
  id: string;
  nome: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  valor: number | null;
  vagas_max: number | null;
  livro_id: string | null;
  livro: { titulo: string | null } | null;
};

type Inscricao = {
  id: string;
  status: string;
  livro_disponibilizado: boolean | null;
  participante: { nome: string | null } | null;
};

type Passo = { texto: string; feito: boolean | null; ajuda?: string };
// feito: true/false = verificado no sistema; null = manual (orientação)

function Lista({ passos }: { passos: Passo[] }) {
  return (
    <ol className="space-y-2">
      {passos.map((p, i) => (
        <li key={i} className="flex items-start gap-3 rounded-md border border-border p-3">
          {p.feito === true && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />}
          {p.feito === false && <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
          {p.feito === null && <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{p.texto}</p>
            {p.ajuda && <p className="text-xs text-muted-foreground">{p.ajuda}</p>}
          </div>
          {p.feito === true && <Badge variant="default">Feito</Badge>}
          {p.feito === false && <Badge variant="outline">Pendente</Badge>}
          {p.feito === null && <Badge variant="outline">Manual</Badge>}
        </li>
      ))}
    </ol>
  );
}

function AdminChecklistPage() {
  const [turmaId, setTurmaId] = useState<string>("");

  const { data: turmas = [] } = useQuery({
    queryKey: ["checklist-turmas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("turmas")
        .select("id,nome,data_inicio,data_fim,valor,vagas_max,livro_id,livro:livros(titulo)")
        .is("excluida_em", null)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Turma[];
    },
  });

  const turma = turmas.find((t) => t.id === turmaId) ?? null;

  const { data: estrutura } = useQuery({
    queryKey: ["checklist-estrutura", turma?.livro_id],
    enabled: !!turma?.livro_id,
    queryFn: async () => {
      const livroId = turma!.livro_id!;
      const [mat, tar] = await Promise.all([
        supabase.from("materiais").select("id", { count: "exact", head: true }).eq("livro_id", livroId),
        (supabase as any).from("tarefas").select("id", { count: "exact", head: true }).eq("livro_id", livroId),
      ]);
      return { materiais: mat.count ?? 0, tarefas: tar.count ?? 0 };
    },
  });

  const { data: inscricoes = [] } = useQuery({
    queryKey: ["checklist-inscricoes", turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inscricoes")
        .select("id,status,livro_disponibilizado,participante:participantes(nome)")
        .eq("turma_id", turmaId)
        .in("status", ["aguardando_pagamento", "confirmada", "lista_espera"])
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Inscricao[];
    },
  });

  const ids = inscricoes.map((i) => i.id);

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["checklist-pagamentos", turmaId, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pagamentos")
        .select("inscricao_id,status")
        .in("inscricao_id", ids);
      if (error) throw error;
      return (data ?? []) as { inscricao_id: string; status: string }[];
    },
  });

  const { data: presencas = [] } = useQuery({
    queryKey: ["checklist-presencas", turmaId, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("presencas")
        .select("inscricao_id")
        .in("inscricao_id", ids);
      if (error) throw error;
      return (data ?? []) as { inscricao_id: string }[];
    },
  });

  const passosTurma = useMemo<Passo[]>(() => {
    if (!turma) return [];
    const hoje = new Date().toISOString().slice(0, 10);
    return [
      { texto: "Criar a turma", feito: true, ajuda: "A turma já existe no sistema." },
      { texto: "Informar data de início e fim", feito: !!(turma.data_inicio && turma.data_fim) },
      { texto: "Informar o valor", feito: Number(turma.valor ?? 0) > 0 },
      { texto: "Informar as vagas", feito: Number(turma.vagas_max ?? 0) > 0 },
      {
        texto: "Subir o material do curso",
        feito: (estrutura?.materiais ?? 0) > 0,
        ajuda: "Em Materiais de aula, no curso desta turma.",
      },
      {
        texto: "Cadastrar as tarefas",
        feito: (estrutura?.tarefas ?? 0) > 0,
        ajuda: "Em Tarefas, no curso desta turma.",
      },
      { texto: "Preparar o teste", feito: null, ajuda: "O teste não fica registrado no sistema; confirme por fora." },
      {
        texto: "Ao encerrar a turma, baixar os comprovantes (Drive ou e-mail)",
        feito: null,
        ajuda: turma.data_fim && turma.data_fim < hoje ? "A turma já encerrou." : "Faça depois que a turma terminar.",
      },
    ];
  }, [turma, estrutura]);

  const alunos = useMemo(() => {
    return inscricoes.map((ins) => {
      const pag = pagamentos.find((p) => p.inscricao_id === ins.id);
      const temPresenca = presencas.some((p) => p.inscricao_id === ins.id);
      const passos: Passo[] = [
        { texto: "Aluno se inscreveu", feito: true },
        { texto: "Pagamento aprovado", feito: pag?.status === "aprovado" },
        { texto: "Inscrição aprovada", feito: ins.status === "confirmada" },
        { texto: "Livro entregue", feito: !!ins.livro_disponibilizado },
        { texto: "Presença marcada na turma", feito: temPresenca },
        { texto: "Informado sobre materiais e tarefas", feito: null, ajuda: "Oriente o aluno sobre onde ver o material e as tarefas." },
      ];
      return { ins, passos };
    });
  }, [inscricoes, pagamentos, presencas]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Turmas e aulas</p>
        <h1 className="font-serif text-2xl font-semibold">Checklist</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Acompanhe o passo a passo da turma e de cada aluno. Os itens marcados com ✓ são verificados
          automaticamente no sistema; os itens "Manual" são orientações para você confirmar por fora.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <label htmlFor="checklist-turma" className="mb-1.5 block text-sm font-medium">Turma</label>
          <select
            id="checklist-turma"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md"
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
          >
            <option value="">Selecione uma turma...</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {(t.livro?.titulo ? t.livro.titulo + " — " : "") + (t.nome || "Turma sem nome")}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {turma && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Checklist da turma</CardTitle>
            </CardHeader>
            <CardContent>
              <Lista passos={passosTurma} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Checklist por aluno ({alunos.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {alunos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum aluno inscrito nesta turma ainda.</p>
              )}
              {alunos.map(({ ins, passos }) => (
                <div key={ins.id} className="space-y-2">
                  <p className="font-medium">{ins.participante?.nome ?? "Aluno"}</p>
                  <Lista passos={passos} />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
