import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
  PlayCircle,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_admin/admin/inscricoes")({
  head: () => ({
    meta: [
      { title: "Aprovar inscrições e pagamentos — Admin — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAprovacoes,
});

type Aba = "pagamentos" | "inscricoes";
type StatusPagamento = "aguardando" | "aprovado" | "rejeitado";

type Pagamento = {
  id: string;
  status: StatusPagamento;
  valor: number;
  comprovante_url: string | null;
  observacao: string | null;
  created_at: string;
  inscricao_id: string;
  inscricao: InscricaoBase | null;
};

type InscricaoBase = {
  id: string;
  status: string;
  participante_id: string | null;
  livro_id: string | null;
  turma_id: string | null;
};

type Participante = {
  id: string;
  nome: string | null;
  email: string | null;
  status: string | null;
};

type Livro = {
  id: string;
  titulo: string | null;
  autor: string | null;
};

type Turma = {
  id: string;
  nome: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  vagas_max: number | null;
  vagas_restantes: number | null;
};

type Inscricao = {
  id: string;
  status: string;
  created_at: string;
  participante: Participante | null;
  livro: Livro | null;
  turma: Turma | null;
  pagamentos: {
    id: string;
    status: StatusPagamento;
    valor: number;
    observacao: string | null;
  }[];
};

function moeda(v: number) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(v: string | null) {
  return v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

async function carregarRelacionamentos(
  inscricoesBase: InscricaoBase[],
) {
  const participanteIds = [...new Set(inscricoesBase.map((x) => x.participante_id).filter(Boolean))] as string[];
  const livroIds = [...new Set(inscricoesBase.map((x) => x.livro_id).filter(Boolean))] as string[];
  const turmaIds = [...new Set(inscricoesBase.map((x) => x.turma_id).filter(Boolean))] as string[];

  const [participantesQ, livrosQ, turmasQ] = await Promise.all([
    participanteIds.length
      ? supabase.from("participantes").select("id,nome,email,status").in("id", participanteIds)
      : Promise.resolve({ data: [], error: null }),
    livroIds.length
      ? supabase.from("livros").select("id,titulo,autor").in("id", livroIds)
      : Promise.resolve({ data: [], error: null }),
    turmaIds.length
      ? supabase.from("turmas").select("id,nome,data_inicio,data_fim,vagas_max,vagas_restantes").in("id", turmaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (participantesQ.error) throw participantesQ.error;
  if (livrosQ.error) throw livrosQ.error;
  if (turmasQ.error) throw turmasQ.error;

  const participantes = new Map(
    (participantesQ.data ?? []).map((x) => [x.id, x as Participante]),
  );
  const livros = new Map(
    (livrosQ.data ?? []).map((x) => [x.id, x as Livro]),
  );
  const turmas = new Map(
    (turmasQ.data ?? []).map((x) => [x.id, x as Turma]),
  );

  return { participantes, livros, turmas };
}

function AdminAprovacoes() {
  const qc = useQueryClient();

  const [aba, setAba] = useState<Aba>("pagamentos");
  const [filtroPagamento, setFiltroPagamento] = useState<StatusPagamento>("aguardando");
  const [recusandoPagamento, setRecusandoPagamento] = useState<Pagamento | null>(null);
  const [motivoPagamento, setMotivoPagamento] = useState("");
  const [recusandoInscricao, setRecusandoInscricao] = useState<Inscricao | null>(null);
  const [motivoInscricao, setMotivoInscricao] = useState("");

  const baseQ = useQuery({
    queryKey: ["admin-aprovacoes-base"],
    queryFn: async () => {
      const [{ data: pagamentosBase, error: pagamentosError }, { data: inscricoesBase, error: inscricoesError }] =
        await Promise.all([
          supabase
            .from("pagamentos")
            .select("id,status,valor,comprovante_url,observacao,created_at,inscricao_id")
            .order("created_at", { ascending: false }),
          supabase
            .from("inscricoes")
            .select("id,status,created_at,participante_id,livro_id,turma_id")
            .order("created_at", { ascending: false }),
        ]);

      if (pagamentosError) throw pagamentosError;
      if (inscricoesError) throw inscricoesError;

      const inscricoesRows = (inscricoesBase ?? []) as InscricaoBase[];
      const relacionamentos = await carregarRelacionamentos(inscricoesRows);

      const inscricoesMap = new Map(inscricoesRows.map((x) => [x.id, x]));

      const pagamentos = (pagamentosBase ?? []).map((p) => {
        const i = inscricoesMap.get(p.inscricao_id) ?? null;
        return {
          ...(p as Omit<Pagamento, "inscricao">),
          inscricao_id: p.inscricao_id,
          inscricao: i,
        } as Pagamento;
      });

      const pagamentosPorInscricao = new Map<string, Pagamento[]>();
      for (const pagamento of pagamentos) {
        const lista = pagamentosPorInscricao.get(pagamento.inscricao_id) ?? [];
        lista.push(pagamento);
        pagamentosPorInscricao.set(pagamento.inscricao_id, lista);
      }

      const inscricoes: Inscricao[] = inscricoesRows.map((i) => ({
        ...i,
        participante: i.participante_id ? relacionamentos.participantes.get(i.participante_id) ?? null : null,
        livro: i.livro_id ? relacionamentos.livros.get(i.livro_id) ?? null : null,
        turma: i.turma_id ? relacionamentos.turmas.get(i.turma_id) ?? null : null,
        pagamentos: (pagamentosPorInscricao.get(i.id) ?? []).map((p) => ({
          id: p.id,
          status: p.status,
          valor: p.valor,
          observacao: p.observacao,
        })),
      }));

      return { pagamentos, inscricoes };
    },
  });

  const dados = baseQ.data ?? { pagamentos: [], inscricoes: [] };

  const decidirPagamento = useMutation({
    mutationFn: async ({
      pagamento,
      status,
      observacao,
    }: {
      pagamento: Pagamento;
      status: "aprovado" | "rejeitado";
      observacao: string | null;
    }) => {
      const { data: usuario } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("pagamentos")
        .update({
          status,
          observacao,
          aprovado_em: status === "aprovado" ? new Date().toISOString() : null,
          aprovado_por: status === "aprovado" ? usuario.user?.id ?? null : null,
        })
        .eq("id", pagamento.id);

      if (error) throw error;

      const participanteId = pagamento.inscricao?.participante_id ?? pagamento.inscricao?.id
        ? dados.inscricoes.find((i) => i.id === pagamento.inscricao_id)?.participante?.id
        : null;

      if (participanteId) {
        const curso =
          pagamento.inscricao
            ? dados.inscricoes.find((i) => i.id === pagamento.inscricao_id)?.livro?.titulo
            : null;

        const mensagem =
          status === "aprovado"
            ? `Seu pagamento foi aprovado para ${curso ?? "seu curso"}. Sua inscrição agora aguarda a confirmação da vaga pela equipe.`
            : `Seu pagamento não foi aprovado para ${curso ?? "seu curso"}. Motivo: ${observacao || "Comprovante não validado."} Acesse sua área do aluno para regularizar.`;

        const emailRes = await supabase.functions.invoke(
          "bookteam-send-notification-email",
          {
            body: {
              participante_id: participanteId,
              assunto:
                status === "aprovado"
                  ? "Pagamento aprovado — Book Team"
                  : "Pagamento não aprovado — Book Team",
              mensagem,
            },
          },
        );

        if (emailRes.error) {
          console.warn("E-mail de status não enviado:", emailRes.error.message);
        }
      }
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.status === "aprovado"
          ? "Pagamento aprovado. Agora verifique a vaga na aba Aprovar inscrições."
          : "Pagamento recusado. O motivo foi registrado.",
      );
      setRecusandoPagamento(null);
      setMotivoPagamento("");
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-base"] });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["meus-pagamentos"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o pagamento."),
  });

  const excluirAprovacaoPagamento = useMutation({
    mutationFn: async (pagamento: Pagamento) => {
      if (!window.confirm(`Excluir a aprovação do pagamento? O pagamento voltará para Pendentes.`)) {
        return false;
      }

      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "aguardando",
          aprovado_em: null,
          aprovado_por: null,
        })
        .eq("id", pagamento.id);

      if (error) throw error;
      return true;
    },
    onSuccess: (alterado) => {
      if (!alterado) return;
      toast.success("Aprovação excluída. O pagamento voltou para Pendentes.");
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-base"] });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir a aprovação."),
  });

  const aprovarInscricao = useMutation({
    mutationFn: async (inscricao: Inscricao) => {
      const pagamentoAprovado = inscricao.pagamentos.some((p) => p.status === "aprovado");
      if (!pagamentoAprovado) throw new Error("A inscrição só pode ser aprovada depois do pagamento aprovado.");

      const vagasMax = inscricao.turma?.vagas_max ?? 0;
      const vagasRestantes = inscricao.turma?.vagas_restantes ?? 0;

      if (vagasMax > 0 && vagasRestantes <= 0) {
        throw new Error("Não há vagas disponíveis nesta turma.");
      }

      const { error } = await supabase
        .from("inscricoes")
        .update({ status: "confirmada" })
        .eq("id", inscricao.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição aprovada e confirmada.");
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-base"] });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível aprovar a inscrição."),
  });

  const recusarInscricao = useMutation({
    mutationFn: async ({ inscricao, motivo }: { inscricao: Inscricao; motivo: string }) => {
      const texto = motivo.trim();
      if (!texto) throw new Error("Informe o motivo da rejeição.");

      const { error } = await supabase
        .from("inscricoes")
        .update({ status: "cancelada" })
        .eq("id", inscricao.id);

      if (error) throw error;

      const pagamento = inscricao.pagamentos[0];
      if (pagamento?.id) {
        const { error: pagamentoError } = await supabase
          .from("pagamentos")
          .update({ observacao: `Rejeição da inscrição: ${texto}` })
          .eq("id", pagamento.id);

        if (pagamentoError) throw pagamentoError;
      }
    },
    onSuccess: () => {
      toast.success("Inscrição rejeitada. O motivo foi registrado.");
      setRecusandoInscricao(null);
      setMotivoInscricao("");
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-base"] });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível rejeitar a inscrição."),
  });

  const liberarInicio = useMutation({
    mutationFn: async (inscricao: Inscricao) => {
      const participanteId = inscricao.participante?.id;
      if (!participanteId) throw new Error("Aluno não encontrado.");
      if (inscricao.status !== "confirmada") throw new Error("A inscrição ainda não está confirmada.");

      const { error } = await supabase
        .from("participantes")
        .update({ status: "participando" })
        .eq("id", participanteId);

      if (error) throw error;
      toast.success("Aluno liberado para iniciar.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-aprovacoes-base"] }),
  });

  const pagamentosFiltrados = dados.pagamentos.filter(
    (p) => p.status === filtroPagamento,
  );

  const inscricoesPendentes = dados.inscricoes.filter((i) => {
    const pagamentoAprovado = i.pagamentos.some((p) => p.status === "aprovado");
    return pagamentoAprovado && i.status !== "confirmada" && i.status !== "cancelada";
  });

  const inscricoesAprovadas = dados.inscricoes.filter(
    (i) => i.status === "confirmada",
  );

  const inscricoesRejeitadas = dados.inscricoes.filter(
    (i) => i.status === "cancelada",
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold">
          Aprovar inscrições e pagamentos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Primeiro aprove o pagamento. Depois confirme a inscrição conforme a disponibilidade de vagas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={aba === "pagamentos" ? "default" : "outline"}
          onClick={() => setAba("pagamentos")}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Aprovar pagamentos
        </Button>

        <Button
          size="sm"
          variant={aba === "inscricoes" ? "default" : "outline"}
          onClick={() => setAba("inscricoes")}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Aprovar inscrições
          {inscricoesPendentes.length > 0 ? ` (${inscricoesPendentes.length})` : ""}
        </Button>
      </div>

      {baseQ.isLoading && (
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
          Carregando…
        </p>
      )}

      {baseQ.isError && (
        <p className="text-sm text-destructive">
          Erro ao carregar os dados de aprovação. Verifique os relacionamentos das tabelas no Supabase.
        </p>
      )}

      {!baseQ.isLoading && !baseQ.isError && aba === "pagamentos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1">
            {[
              ["aguardando", "Pendentes"],
              ["aprovado", "Aprovados"],
              ["rejeitado", "Recusados"],
            ].map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={filtroPagamento === value ? "default" : "outline"}
                onClick={() => setFiltroPagamento(value as StatusPagamento)}
              >
                {label}
              </Button>
            ))}
          </div>

          {!pagamentosFiltrados.length && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum pagamento nesta situação.
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {pagamentosFiltrados.map((pagamento) => {
              const inscricao = dados.inscricoes.find((i) => i.id === pagamento.inscricao_id);
              const aluno = inscricao?.participante;
              const turma = inscricao?.turma;
              const recusando = recusandoPagamento?.id === pagamento.id;

              return (
                <Card key={pagamento.id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-serif text-lg font-semibold">
                          {aluno?.nome ?? "Aluno"}
                        </p>
                        <p className="text-sm">
                          {inscricao?.livro?.titulo ?? "Curso não informado"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {turma?.nome ?? "Turma não informada"}
                          {turma?.data_inicio ? ` • ${dataBR(turma.data_inicio)}` : ""}
                          {turma?.data_fim ? ` até ${dataBR(turma.data_fim)}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{aluno?.email ?? ""}</p>
                        {pagamento.status === "rejeitado" && pagamento.observacao && (
                          <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                            <strong>Motivo:</strong> {pagamento.observacao}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-lg">{moeda(pagamento.valor)}</span>

                        <Badge
                          variant={
                            pagamento.status === "aprovado"
                              ? "default"
                              : pagamento.status === "rejeitado"
                                ? "destructive"
                                : "secondary"
                          }
                          className="gap-1"
                        >
                          {pagamento.status === "aprovado" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : pagamento.status === "rejeitado" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {pagamento.status === "aprovado"
                            ? "Aprovado"
                            : pagamento.status === "rejeitado"
                              ? "Recusado"
                              : "Pendente"}
                        </Badge>

                        {pagamento.comprovante_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirComprovante(pagamento.comprovante_url!)}
                          >
                            <ExternalLink className="mr-1 h-4 w-4" />
                            Comprovante
                          </Button>
                        )}

                        {pagamento.status === "aguardando" && (
                          <>
                            <Button
                              size="sm"
                              disabled={decidirPagamento.isPending}
                              onClick={() =>
                                decidirPagamento.mutate({
                                  pagamento,
                                  status: "aprovado",
                                  observacao: null,
                                })
                              }
                            >
                              Aprovar pagamento
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={decidirPagamento.isPending}
                              onClick={() => {
                                setRecusandoPagamento(pagamento);
                                setMotivoPagamento("");
                              }}
                            >
                              Recusar
                            </Button>
                          </>
                        )}

                        {pagamento.status === "aprovado" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={excluirAprovacaoPagamento.isPending}
                            onClick={() => excluirAprovacaoPagamento.mutate(pagamento)}
                          >
                            Excluir aprovação
                          </Button>
                        )}
                      </div>
                    </div>

                    {recusando && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <Label htmlFor={`motivo-pagamento-${pagamento.id}`}>
                          Motivo da recusa
                        </Label>

                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <Input
                            id={`motivo-pagamento-${pagamento.id}`}
                            value={motivoPagamento}
                            onChange={(e) => setMotivoPagamento(e.target.value)}
                            placeholder="Ex.: comprovante ilegível, valor divergente..."
                          />

                          <Button
                            type="button"
                            variant="destructive"
                            disabled={decidirPagamento.isPending}
                            onClick={() => {
                              const texto = motivoPagamento.trim();
                              if (!texto) {
                                toast.error("Informe o motivo da recusa.");
                                return;
                              }
                              decidirPagamento.mutate({
                                pagamento,
                                status: "rejeitado",
                                observacao: texto,
                              });
                            }}
                          >
                            Confirmar recusa
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setRecusandoPagamento(null);
                              setMotivoPagamento("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!baseQ.isLoading && !baseQ.isError && aba === "inscricoes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              Pendentes: {inscricoesPendentes.length}
            </Badge>
            <Badge variant="secondary">
              Aprovadas: {inscricoesAprovadas.length}
            </Badge>
            <Badge variant="secondary">
              Rejeitadas: {inscricoesRejeitadas.length}
            </Badge>
          </div>

          {!inscricoesPendentes.length && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhuma inscrição aguardando confirmação de vaga.
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {inscricoesPendentes.map((inscricao) => {
              const vagasRestantes = inscricao.turma?.vagas_restantes ?? 0;
              const semVaga =
                (inscricao.turma?.vagas_max ?? 0) > 0 && vagasRestantes <= 0;

              return (
                <Card key={inscricao.id}>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-serif text-lg font-semibold">
                        {inscricao.participante?.nome ?? "Aluno"}
                      </p>
                      <p className="text-sm">{inscricao.livro?.titulo ?? "Curso não informado"}</p>
                      <p className="text-xs text-muted-foreground">
                        {inscricao.turma?.nome ?? "Turma não informada"}
                        {inscricao.turma?.data_inicio
                          ? ` • ${dataBR(inscricao.turma.data_inicio)}`
                          : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Pagamento aprovado
                        </Badge>
                        <Badge variant={semVaga ? "destructive" : "secondary"}>
                          {semVaga ? "Sem vagas" : `${vagasRestantes} vagas restantes`}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={aprovarInscricao.isPending || semVaga}
                        onClick={() => aprovarInscricao.mutate(inscricao)}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Aprovar inscrição
                      </Button>

                      <Button
                        variant="destructive"
                        disabled={recusarInscricao.isPending}
                        onClick={() => {
                          setRecusandoInscricao(inscricao);
                          setMotivoInscricao("");
                        }}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Recusar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {inscricoesAprovadas.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="font-serif text-lg font-semibold">Inscrições aprovadas</h2>
                {inscricoesAprovadas.map((inscricao) => (
                  <div
                    key={inscricao.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {inscricao.participante?.nome ?? "Aluno"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inscricao.livro?.titulo ?? "Curso não informado"}
                        {inscricao.turma?.nome ? ` · ${inscricao.turma.nome}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={liberarInicio.isPending}
                      onClick={() => liberarInicio.mutate(inscricao)}
                    >
                      <PlayCircle className="mr-1 h-4 w-4" />
                      Liberar início
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {inscricoesRejeitadas.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="font-serif text-lg font-semibold">Inscrições rejeitadas</h2>
                {inscricoesRejeitadas.map((inscricao) => {
                  const pagamento = inscricao.pagamentos[0];

                  return (
                    <div
                      key={inscricao.id}
                      className="rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                    >
                      <p className="font-semibold">
                        {inscricao.participante?.nome ?? "Aluno"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inscricao.livro?.titulo ?? "Curso não informado"}
                      </p>
                      {pagamento?.observacao && (
                        <p className="mt-1 text-xs text-destructive">
                          <strong>Motivo:</strong> {pagamento.observacao}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog
        open={!!recusandoInscricao}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setRecusandoInscricao(null);
            setMotivoInscricao("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rejeitar inscrição</DialogTitle>
          </DialogHeader>

          {recusandoInscricao && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                recusarInscricao.mutate({
                  inscricao: recusandoInscricao,
                  motivo: motivoInscricao,
                });
              }}
            >
              <div>
                <p className="font-medium">
                  {recusandoInscricao.participante?.nome ?? "Aluno"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {recusandoInscricao.livro?.titulo ?? "Curso não informado"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motivo-inscricao">Justificativa da rejeição</Label>
                <Input
                  id="motivo-inscricao"
                  placeholder="Digite o motivo da rejeição..."
                  value={motivoInscricao}
                  onChange={(e) => setMotivoInscricao(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRecusandoInscricao(null);
                    setMotivoInscricao("");
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  variant="destructive"
                  disabled={recusarInscricao.isPending || !motivoInscricao.trim()}
                >
                  {recusarInscricao.isPending ? "Salvando..." : "Confirmar rejeição"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function abrirComprovante(url: string) {
  const { data, error } = await supabase.storage
    .from("comprovantes")
    .createSignedUrl(url, 300);

  if (error || !data?.signedUrl) {
    toast.error("Não foi possível abrir o comprovante.");
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
