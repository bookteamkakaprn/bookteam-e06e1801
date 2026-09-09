import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type StatusPagamento = "aguardando" | "aprovado" | "rejeitado";
type Aba = "pagamentos" | "inscricoes";

type Pagamento = {
  id: string;
  status: StatusPagamento;
  valor: number;
  comprovante_url: string | null;
  comprovante_enviado_em: string | null;
  observacao: string | null;
  created_at: string;
  inscricao: {
    id: string;
    status: string;
    participante: {
      id: string;
      nome: string | null;
      email: string | null;
      status: string | null;
    } | null;
    livro: {
      id: string;
      titulo: string | null;
      autor: string | null;
    } | null;
    turma: {
      id: string;
      nome: string | null;
      data_inicio: string | null;
      data_fim: string | null;
      vagas_max: number | null;
      vagas_restantes: number | null;
    } | null;
  } | null;
};

type Inscricao = {
  id: string;
  status: string;
  created_at: string;
  motivo_rejeicao: string | null;
  motivo_cancelamento: string | null;
  cancelado_em: string | null;
  participante: {
    id: string;
    nome: string | null;
    email: string | null;
    status: string | null;
  } | null;
  livro: {
    id: string;
    titulo: string | null;
    autor: string | null;
  } | null;
  turma: {
    id: string;
    nome: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    vagas_max: number | null;
    vagas_restantes: number | null;
  } | null;
  pagamentos: {
    id: string;
    status: StatusPagamento;
    valor: number;
    comprovante_url: string | null;
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
  return v
    ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR")
    : "—";
}

function erroTexto(e: unknown) {
  if (!e) return "";
  if (typeof e === "string") return e;

  const erro = e as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return [
    erro.code,
    erro.message,
    erro.details,
    erro.hint,
  ]
    .filter(Boolean)
    .join(" | ");
}

function AdminAprovacoes() {
  const qc = useQueryClient();

  const [aba, setAba] = useState<Aba>("pagamentos");
  const [filtroPagamento, setFiltroPagamento] =
    useState<StatusPagamento>("aguardando");

  const [recusandoPagamento, setRecusandoPagamento] =
    useState<Pagamento | null>(null);
  const [motivoPagamento, setMotivoPagamento] = useState("");

  const [recusandoInscricao, setRecusandoInscricao] =
    useState<Inscricao | null>(null);
  const [motivoInscricao, setMotivoInscricao] = useState("");

  // Estados para edição
  const [editandoPagamento, setEditandoPagamento] =
    useState<Pagamento | null>(null);
  const [novoStatusPagamento, setNovoStatusPagamento] =
    useState<StatusPagamento>("aguardando");
  const [motivoEdicaoPagamento, setMotivoEdicaoPagamento] = useState("");

  const [editandoInscricao, setEditandoInscricao] =
    useState<Inscricao | null>(null);
  const [novoStatusInscricao, setNovoStatusInscricao] = useState("");
  const [motivoEdicaoInscricao, setMotivoEdicaoInscricao] = useState("");

  const pagamentosQ = useQuery({
    queryKey: ["admin-aprovacoes-pagamentos-final"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select(
          `id,status,valor,comprovante_url,comprovante_enviado_em,observacao,created_at,
           inscricao:inscricoes(
             id,status,
             participante:participantes(id,nome,email,status),
             livro:livros(id,titulo,autor),
             turma:turmas(
               id,nome,data_inicio,data_fim,vagas_max,vagas_restantes
             )
           )`,
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`PAGAMENTOS: ${erroTexto(error)}`);
      }

      return (data ?? []) as unknown as Pagamento[];
    },
  });

  const inscricoesQ = useQuery({
    queryKey: ["admin-aprovacoes-inscricoes-final"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          `id,status,created_at,motivo_rejeicao,motivo_cancelamento,cancelado_em,
           participante:participantes(id,nome,email,status),
           livro:livros(id,titulo,autor),
           turma:turmas(
             id,nome,data_inicio,data_fim,vagas_max,vagas_restantes
           ),
           pagamentos(
             id,status,valor,comprovante_url,observacao
           )`,
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`INSCRICOES: ${erroTexto(error)}`);
      }

      return (data ?? []) as unknown as Inscricao[];
    },
  });

  const pagamentos = pagamentosQ.data ?? [];
  const inscricoes = inscricoesQ.data ?? [];

  const pagamentosFiltrados = pagamentos.filter(
    (pagamento) => pagamento.status === filtroPagamento,
  );

  const inscricoesPendentes = inscricoes.filter((inscricao) => {
    const pagamentoAprovado = inscricao.pagamentos.some(
      (pagamento) => pagamento.status === "aprovado",
    );

    return (
      pagamentoAprovado &&
      inscricao.status !== "confirmada" &&
      inscricao.status !== "cancelada"
    );
  });

  const inscricoesAprovadas = inscricoes.filter(
    (inscricao) => inscricao.status === "confirmada",
  );

  const inscricoesRejeitadas = inscricoes.filter(
    (inscricao) => inscricao.status === "cancelada",
  );

  const aprovarPagamento = useMutation({
    mutationFn: async (pagamento: Pagamento) => {
      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "aprovado",
          pago_em: new Date().toISOString(),
          observacao: null,
        })
        .eq("id", pagamento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento aprovado.");
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-final"],
      });
      qc.invalidateQueries({
        queryKey: ["meus-pagamentos"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        erroTexto(e) || "Não foi possível aprovar o pagamento.",
      ),
  });

  const recusarPagamento = useMutation({
    mutationFn: async ({
      pagamento,
      motivo,
    }: {
      pagamento: Pagamento;
      motivo: string;
    }) => {
      const texto = motivo.trim();

      if (!texto) {
        throw new Error("Informe o motivo da recusa.");
      }

      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "rejeitado",
          pago_em: null,
          observacao: texto,
        })
        .eq("id", pagamento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento recusado.");
      setRecusandoPagamento(null);
      setMotivoPagamento("");

      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-final"],
      });
      qc.invalidateQueries({
        queryKey: ["meus-pagamentos"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        erroTexto(e) || "Não foi possível recusar o pagamento.",
      ),
  });

  const excluirAprovacao = useMutation({
    mutationFn: async (pagamento: Pagamento) => {
      if (
        !window.confirm(
          "Excluir a aprovação deste pagamento? Ele voltará para Pendentes.",
        )
      ) {
        return false;
      }

      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "aguardando",
          pago_em: null,
          observacao: null,
        })
        .eq("id", pagamento.id);

      if (error) throw error;

      return true;
    },
    onSuccess: (ok) => {
      if (!ok) return;

      toast.success("Aprovação excluída.");

      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-final"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        erroTexto(e) || "Não foi possível excluir a aprovação.",
      ),
  });

  const editarPagamento = useMutation({
    mutationFn: async ({
      pagamento,
      novoStatus,
      motivo,
    }: {
      pagamento: Pagamento;
      novoStatus: StatusPagamento;
      motivo: string;
    }) => {
      // Validação
      if (novoStatus === "rejeitado" && !motivo.trim()) {
        throw new Error("Informe o motivo da recusa.");
      }

      const updateData: Record<string, unknown> = {
        status: novoStatus,
      };

      if (novoStatus === "aprovado") {
        updateData.pago_em = new Date().toISOString();
      } else if (novoStatus === "aguardando") {
        updateData.pago_em = null;
      } else if (novoStatus === "rejeitado") {
        updateData.observacao = motivo;
      }

      const { error } = await supabase
        .from("pagamentos")
        .update(updateData)
        .eq("id", pagamento.id);

      if (error) throw error;

      // Registrar auditoria
      await supabase.from("audit_log").insert({
        tabela: "pagamentos",
        registro_id: pagamento.id,
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
        status_anterior: pagamento.status,
        status_novo: novoStatus,
        motivo: motivo || null,
        dados_anteriores: { status: pagamento.status },
        dados_novos: { status: novoStatus },
      });
    },
    onSuccess: () => {
      toast.success("Pagamento atualizado com sucesso.");
      setEditandoPagamento(null);
      setNovoStatusPagamento("aguardando");
      setMotivoEdicaoPagamento("");

      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-final"],
      });
      qc.invalidateQueries({
        queryKey: ["meus-pagamentos"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        erroTexto(e) || "Não foi possível atualizar o pagamento.",
      ),
  });

  const aprovarInscricao = useMutation({
    mutationFn: async (inscricao: Inscricao) => {
      const pagamentoAprovado = inscricao.pagamentos.some(
        (pagamento) => pagamento.status === "aprovado",
      );

      if (!pagamentoAprovado) {
        throw new Error("O pagamento ainda não foi aprovado.");
      }

      const vagasMax = inscricao.turma?.vagas_max ?? 0;
      const vagasRestantes = inscricao.turma?.vagas_restantes ?? 0;

      if (vagasMax > 0 && vagasRestantes <= 0) {
        throw new Error(
          "Não há vagas disponíveis nesta turma.",
        );
      }

      const { error } = await supabase
        .from("inscricoes")
        .update({ status: "confirmada" })
        .eq("id", inscricao.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição aprovada. A vaga foi confirmada.");

      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-inscricoes"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        erroTexto(e) || "Não foi possível aprovar a inscrição.",
      ),
  });

  const recusarInscricao = useMutation({
    mutationFn: async ({
      inscricao,
      motivo,
    }: {
      inscricao: Inscricao;
      motivo: string;
    }) => {
      const texto = motivo.trim();

      if (!texto) {
        throw new Error("Informe o motivo da rejeição.");
      }

      const { error } = await supabase
        .from("inscricoes")
        .update({ status: "cancelada" })
        .eq("id", inscricao.id);

      if (error) throw error;

      const pagamento = inscricao.pagamentos[0];

      if (pagamento?.id) {
        const { error: pagamentoError } = await supabase
          .from("pagamentos")
          .update({
            observacao: `Rejeição da inscrição: ${texto}`,
          })
          .eq("id", pagamento.id);

        if (pagamentoError) throw pagamentoError;
      }
    },
    onSuccess: () => {
      toast.success("Inscrição rejeitada.");
      setRecusandoInscricao(null);
      setMotivoInscricao("");

      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-inscricoes"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        erroTexto(e) || "Não foi possível rejeitar a inscrição.",
      ),
  });

  const liberarInicio = useMutation({
    mutationFn: async (inscricao: Inscricao) => {
      const participanteId = inscricao.participante?.id;

      if (!participanteId) {
        throw new Error("Aluno não encontrado.");
      }

      const { error } = await supabase
        .from("participantes")
        .update({ status: "participando" })
        .eq("id", participanteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aluno liberado para iniciar.");

      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-alunos"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        erroTexto(e) || "Não foi possível liberar o início.",
      ),
  });

  const editarInscricao = useMutation({
    mutationFn: async ({
      inscricao,
      novoStatus,
      motivo,
    }: {
      inscricao: Inscricao;
      novoStatus: string;
      motivo: string;
    }) => {
      // Validações
      if (
        novoStatus === "cancelada" &&
        !motivo.trim()
      ) {
        throw new Error(
          "Informe o motivo do cancelamento/rejeição.",
        );
      }

      if (
        novoStatus === "confirmada" &&
        !inscricao.pagamentos.some((p) => p.status === "aprovado")
      ) {
        throw new Error("O pagamento ainda não foi aprovado.");
      }

      if (novoStatus === "confirmada") {
        const vagasMax = inscricao.turma?.vagas_max ?? 0;
        const vagasRestantes = inscricao.turma?.vagas_restantes ?? 0;

        if (vagasMax > 0 && vagasRestantes <= 0) {
          throw new Error("Não há vagas disponíveis nesta turma.");
        }
      }

      const updateData: Record<string, unknown> = {
        status: novoStatus,
      };

      if (novoStatus === "cancelada") {
        updateData.motivo_rejeicao = motivo;
        updateData.cancelado_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from("inscricoes")
        .update(updateData)
        .eq("id", inscricao.id);

      if (error) throw error;

      // Registrar auditoria
      await supabase.from("audit_log").insert({
        tabela: "inscricoes",
        registro_id: inscricao.id,
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
        status_anterior: inscricao.status,
        status_novo: novoStatus,
        motivo: motivo || null,
        dados_anteriores: { status: inscricao.status },
        dados_novos: { status: novoStatus },
      });
    },
    onSuccess: () => {
      toast.success("Inscrição atualizada com sucesso.");
      setEditandoInscricao(null);
      setNovoStatusInscricao("");
      setMotivoEdicaoInscricao("");

      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-final"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-final"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        erroTexto(e) || "Não foi possível atualizar a inscrição.",
      ),
  });

  async function abrirComprovante(url: string) {
    const { data, error } = await supabase.storage
      .from("comprovantes")
      .createSignedUrl(url, 300);

    if (error || !data?.signedUrl) {
      toast.error(
        erroTexto(error) ||
          "Não foi possível abrir o comprovante.",
      );
      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const carregando =
    pagamentosQ.isLoading || inscricoesQ.isLoading;

  const erro = pagamentosQ.error || inscricoesQ.error;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold">
          Aprovar inscrições e pagamentos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Primeiro aprove o pagamento. Depois confirme a inscrição
          conforme a disponibilidade de vagas.
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
          {inscricoesPendentes.length > 0
            ? ` (${inscricoesPendentes.length})`
            : ""}
        </Button>
      </div>

      {carregando && (
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
          Carregando…
        </p>
      )}

      {erro && (
        <Card>
          <CardContent className="p-5">
            <p className="font-semibold text-destructive">
              Erro ao carregar
            </p>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {erroTexto(erro)}
            </p>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && aba === "pagamentos" && (
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
                variant={
                  filtroPagamento === value
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  setFiltroPagamento(
                    value as StatusPagamento,
                  )
                }
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
              const inscricao = pagamento.inscricao;
              const aluno = inscricao?.participante;
              const livro = inscricao?.livro;
              const turma = inscricao?.turma;
              const recusando =
                recusandoPagamento?.id === pagamento.id;

              return (
                <Card key={pagamento.id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-serif text-lg font-semibold">
                          {aluno?.nome ?? "Aluno"}
                        </p>

                        <p className="text-sm">
                          {livro?.titulo ?? "Curso não informado"}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {turma?.nome ?? "Turma não informada"}
                          {turma?.data_inicio
                            ? ` • ${dataBR(turma.data_inicio)}`
                            : ""}
                          {turma?.data_fim
                            ? ` até ${dataBR(turma.data_fim)}`
                            : ""}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {aluno?.email ?? ""}
                        </p>

                        {pagamento.status === "rejeitado" &&
                          pagamento.observacao && (
                            <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                              <strong>Motivo:</strong>{" "}
                              {pagamento.observacao}
                            </p>
                          )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-lg">
                          {moeda(pagamento.valor)}
                        </span>

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
                          <div className="flex flex-col items-start gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                abrirComprovante(
                                  pagamento.comprovante_url!,
                                )
                              }
                            >
                              <ExternalLink className="mr-1 h-4 w-4" />
                              Comprovante
                            </Button>
                            {pagamento.comprovante_enviado_em && (
                              <p className="text-xs text-muted-foreground">
                                Enviado em{" "}
                                {new Date(
                                  pagamento.comprovante_enviado_em
                                ).toLocaleString("pt-BR")}
                              </p>
                            )}
                          </div>
                        )}

                        {pagamento.status === "aguardando" && (
                          <>
                            <Button
                              size="sm"
                              disabled={aprovarPagamento.isPending}
                              onClick={() =>
                                aprovarPagamento.mutate(pagamento)
                              }
                            >
                              Aprovar pagamento
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={recusarPagamento.isPending}
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
                            disabled={excluirAprovacao.isPending}
                            onClick={() =>
                              excluirAprovacao.mutate(pagamento)
                            }
                          >
                            Excluir aprovação
                          </Button>
                        )}
                      </div>
                    </div>

                    {recusando && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <Label
                          htmlFor={`motivo-pagamento-${pagamento.id}`}
                        >
                          Motivo da recusa
                        </Label>

                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <Input
                            id={`motivo-pagamento-${pagamento.id}`}
                            value={motivoPagamento}
                            onChange={(e) =>
                              setMotivoPagamento(e.target.value)
                            }
                            placeholder="Ex.: comprovante ilegível, valor divergente..."
                          />

                          <Button
                            type="button"
                            variant="destructive"
                            disabled={recusarPagamento.isPending}
                            onClick={() =>
                              recusarPagamento.mutate({
                                pagamento,
                                motivo: motivoPagamento,
                              })
                            }
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

      {!carregando && !erro && aba === "inscricoes" && (
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
              const turma = inscricao.turma;
              const vagas = turma?.vagas_restantes ?? 0;
              const semVaga =
                (turma?.vagas_max ?? 0) > 0 && vagas <= 0;

              return (
                <Card key={inscricao.id}>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-serif text-lg font-semibold">
                        {inscricao.participante?.nome ?? "Aluno"}
                      </p>

                      <p className="text-sm">
                        {inscricao.livro?.titulo ??
                          "Curso não informado"}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {turma?.nome ?? "Turma não informada"}
                        {turma?.data_inicio
                          ? ` • ${dataBR(turma.data_inicio)}`
                          : ""}
                        {turma?.data_fim
                          ? ` até ${dataBR(turma.data_fim)}`
                          : ""}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Pagamento aprovado
                        </Badge>

                        <Badge
                          variant={
                            semVaga ? "destructive" : "secondary"
                          }
                        >
                          {semVaga
                            ? "Sem vagas"
                            : `${vagas} vaga${
                                vagas === 1 ? "" : "s"
                              } disponível${
                                vagas === 1 ? "" : "is"
                              }`}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={
                          aprovarInscricao.isPending || semVaga
                        }
                        onClick={() =>
                          aprovarInscricao.mutate(inscricao)
                        }
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
                <h2 className="font-serif text-lg font-semibold">
                  Inscrições aprovadas
                </h2>

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
                        {inscricao.livro?.titulo ??
                          "Curso não informado"}
                        {inscricao.turma?.nome
                          ? ` · ${inscricao.turma.nome}`
                          : ""}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      disabled={liberarInicio.isPending}
                      onClick={() =>
                        liberarInicio.mutate(inscricao)
                      }
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
                <h2 className="font-serif text-lg font-semibold">
                  Inscrições rejeitadas
                </h2>

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
                        {inscricao.livro?.titulo ??
                          "Curso não informado"}
                      </p>

                      {pagamento?.observacao && (
                        <p className="mt-1 text-xs text-destructive">
                          <strong>Motivo:</strong>{" "}
                          {pagamento.observacao}
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
        onOpenChange={(open) => {
          if (!open) {
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
                  {recusandoInscricao.participante?.nome ??
                    "Aluno"}
                </p>

                <p className="text-sm text-muted-foreground">
                  {recusandoInscricao.livro?.titulo ??
                    "Curso não informado"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motivo-inscricao">
                  Justificativa da rejeição
                </Label>

                <Input
                  id="motivo-inscricao"
                  placeholder="Digite o motivo da rejeição..."
                  value={motivoInscricao}
                  onChange={(e) =>
                    setMotivoInscricao(e.target.value)
                  }
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
                  disabled={
                    recusarInscricao.isPending ||
                    !motivoInscricao.trim()
                  }
                >
                  {recusarInscricao.isPending
                    ? "Salvando..."
                    : "Confirmar rejeição"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
