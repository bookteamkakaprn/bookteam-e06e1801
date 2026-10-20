import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, XCircle } from "lucide-react";
import { enviarEmail } from "@/lib/email-service";

export const Route = createFileRoute("/_admin/admin/troca-curso")({
  component: AdminTrocaCursoPage,
});

type Turma = {
  id: string;
  nome: string;
  valor: number | null;
  vagas_max: number;
  livro_id: string | null;
};
type Inscrito = {
  id: string;
  livro_disponibilizado: boolean;
  participante: { nome: string; email: string } | null;
};
type Solicitacao = {
  id: string;
  status: string;
  diferenca: number;
  expira_em: string;
  created_at: string;
  participante: { nome: string; email: string } | null;
  origem: { nome: string } | null;
  destino: { nome: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pendente_aluno: "Aguardando confirmação do aluno",
  aguardando_diferenca: "Aguardando pagamento da diferença",
  concluida: "Concluída",
  cancelada: "Cancelada",
  expirada: "Expirada",
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function erroTexto(e: unknown) {
  return e instanceof Error ? e.message : "Não foi possível concluir a ação.";
}

function AdminTrocaCursoPage() {
  const qc = useQueryClient();
  const [turmaOrigemId, setTurmaOrigemId] = useState("");
  const [inscricaoId, setInscricaoId] = useState("");
  const [turmaDestinoId, setTurmaDestinoId] = useState("");

  const turmasQ = useQuery({
    queryKey: ["troca-curso-turmas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("turmas")
        .select("id,nome,valor,vagas_max,livro_id")
        .is("arquivada_em", null)
        .is("excluida_em", null)
        .order("data_inicio", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Turma[];
    },
  });

  const inscritosQ = useQuery({
    enabled: !!turmaOrigemId,
    queryKey: ["troca-curso-inscritos", turmaOrigemId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inscricoes")
        .select("id,livro_disponibilizado,participante:participantes(nome,email)")
        .eq("turma_id", turmaOrigemId)
        .eq("status", "confirmada");
      if (error) throw error;
      return (data ?? []) as Inscrito[];
    },
  });

  const solicitacoesQ = useQuery({
    queryKey: ["troca-curso-solicitacoes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("solicitacoes_troca_curso")
        .select(
          "id,status,diferenca,expira_em,created_at,participante:participantes(nome,email),origem:turmas!turma_origem_id(nome),destino:turmas!turma_destino_id(nome)",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Solicitacao[];
    },
  });

  const turmas = turmasQ.data ?? [];
  const origem = turmas.find((t) => t.id === turmaOrigemId);
  const destino = turmas.find((t) => t.id === turmaDestinoId);
  const inscritos = inscritosQ.data ?? [];
  const inscritoSelecionado = inscritos.find((i) => i.id === inscricaoId);
  const diferenca =
    destino && origem ? Number(destino.valor ?? 0) - Number(origem.valor ?? 0) : null;

  const criar = useMutation({
    mutationFn: async () => {
      if (!inscricaoId || !turmaDestinoId)
        throw new Error("Selecione o aluno e a turma de destino.");
      const { data, error } = await (supabase as any).rpc("criar_solicitacao_troca_curso", {
        p_inscricao_id: inscricaoId,
        p_turma_destino_id: turmaDestinoId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async () => {
      const participante = inscritoSelecionado?.participante;
      if (participante?.email && destino) {
        try {
          await enviarEmail({
            to: participante.email,
            tipo: "customizado",
            nome: participante.nome,
            assunto: "Troca de curso: confirme sua solicitação",
            mensagem:
              `Solicitamos a troca da sua inscrição para o curso/turma "${destino.nome}".\n\n` +
              (diferenca && diferenca !== 0
                ? diferenca > 0
                  ? `Há uma diferença de ${moeda(diferenca)} a pagar. `
                  : `Há uma diferença de ${moeda(Math.abs(diferenca))} a ser devolvida. `
                : "Não há diferença de valor. ") +
              `\n\nPara confirmar, acesse ${window.location.origin}/minhas-inscricoes e clique em "Confirmar troca". ` +
              "A solicitação expira em 7 dias.",
          });
        } catch (e) {
          toast.warning(
            "Troca criada, mas o e-mail ao aluno não foi enviado. Avise-o pelo WhatsApp.",
          );
        }
      }
      toast.success("Solicitação de troca criada. O aluno precisa confirmar.");
      setInscricaoId("");
      setTurmaDestinoId("");
      qc.invalidateQueries({ queryKey: ["troca-curso-solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["troca-curso-inscritos", turmaOrigemId] });
    },
    onError: (e) => toast.error(erroTexto(e)),
  });

  const cancelar = useMutation({
    mutationFn: async (solicitacaoId: string) => {
      const { error } = await (supabase as any).rpc("cancelar_solicitacao_troca_curso", {
        p_solicitacao_id: solicitacaoId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação cancelada.");
      qc.invalidateQueries({ queryKey: ["troca-curso-solicitacoes"] });
    },
    onError: (e) => toast.error(erroTexto(e)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Troca de curso</h1>
        <p className="text-sm text-muted-foreground">
          Troque a turma de um aluno com inscrição confirmada. A troca só é permitida antes da
          entrega do livro e da primeira presença, e se houver vaga na turma de destino. O aluno
          confirma pelo link recebido por e-mail.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" /> Nova solicitação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Turma atual</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={turmaOrigemId}
                onChange={(e) => {
                  setTurmaOrigemId(e.target.value);
                  setInscricaoId("");
                }}
              >
                <option value="">Selecione...</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Aluno (inscrição confirmada)</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={inscricaoId}
                disabled={!turmaOrigemId}
                onChange={(e) => setInscricaoId(e.target.value)}
              >
                <option value="">
                  {turmaOrigemId ? "Selecione..." : "Escolha a turma atual primeiro"}
                </option>
                {inscritos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.participante?.nome ?? "Aluno"}
                    {i.livro_disponibilizado ? " (livro já entregue)" : ""}
                  </option>
                ))}
              </select>
              {turmaOrigemId && !inscritosQ.isLoading && inscritos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum aluno com inscrição confirmada nesta turma.
                </p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">Turma de destino</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={turmaDestinoId}
                onChange={(e) => setTurmaDestinoId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {turmas
                  .filter((t) => t.id !== turmaOrigemId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} — {moeda(Number(t.valor ?? 0))}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {diferenca !== null && (
            <p className="rounded-md border bg-muted/40 p-3 text-sm">
              {diferenca === 0
                ? "Sem diferença de valor. A troca conclui quando o aluno confirmar."
                : diferenca > 0
                  ? `Diferença a receber do aluno: ${moeda(diferenca)}. A troca só conclui depois do pagamento.`
                  : `Diferença a devolver ao aluno: ${moeda(Math.abs(diferenca))}. A troca conclui quando o aluno confirmar.`}
            </p>
          )}

          <Button
            type="button"
            disabled={!inscricaoId || !turmaDestinoId || criar.isPending}
            onClick={() => criar.mutate()}
            className="gap-2"
          >
            {criar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar solicitação e avisar o aluno
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {solicitacoesQ.isLoading && (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
          {!solicitacoesQ.isLoading && (solicitacoesQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação de troca.</p>
          )}
          {(solicitacoesQ.data ?? []).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.participante?.nome ?? "Aluno"}</p>
                <p className="text-xs text-muted-foreground">
                  {s.origem?.nome ?? "—"} → {s.destino?.nome ?? "—"}
                  {s.diferenca > 0 ? ` · a pagar ${moeda(Number(s.diferenca))}` : ""}
                  {s.diferenca < 0 ? ` · a devolver ${moeda(Math.abs(Number(s.diferenca)))}` : ""}
                </p>
                {s.status === "pendente_aluno" && (
                  <p className="text-xs text-muted-foreground">
                    Expira em {new Date(s.expira_em).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              <Badge variant="outline">{STATUS_LABEL[s.status] ?? s.status}</Badge>
              {s.status === "pendente_aluno" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={cancelar.isPending}
                  onClick={() => {
                    if (window.confirm("Cancelar esta solicitação de troca?"))
                      cancelar.mutate(s.id);
                  }}
                >
                  <XCircle className="h-4 w-4" /> Cancelar
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
