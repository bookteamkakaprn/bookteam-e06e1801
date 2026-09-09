import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

type StatusPagamento = "aguardando" | "aprovado" | "rejeitado";
type Aba = "pagamentos" | "inscricoes";

type PagamentoRow = {
  id: string;
  inscricao_id: string;
  status: StatusPagamento;
  valor: number;
  comprovante_url: string | null;
  observacao: string | null;
  created_at: string;
};

type InscricaoRow = {
  id: string;
  status: string;
  created_at: string;
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

function moeda(v: number) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(v: string | null) {
  return v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

function AdminAprovacoes() {
  const qc = useQueryClient();
  const [aba, setAba] = useState<Aba>("pagamentos");
  const [filtroPagamento, setFiltroPagamento] =
    useState<StatusPagamento>("aguardando");
  const [recusandoPagamento, setRecusandoPagamento] =
    useState<PagamentoRow | null>(null);
  const [motivoPagamento, setMotivoPagamento] = useState("");
  const [recusandoInscricao, setRecusandoInscricao] =
    useState<InscricaoRow | null>(null);
  const [motivoInscricao, setMotivoInscricao] = useState("");

  const pagamentosQ = useQuery({
    queryKey: ["admin-aprovacoes-pagamentos-v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id,inscricao_id,status,valor,comprovante_url,observacao,created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as PagamentoRow[];
    },
  });

  const inscricoesQ = useQuery({
    queryKey: ["admin-aprovacoes-inscricoes-v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("id,status,created_at,participante_id,livro_id,turma_id")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as InscricaoRow[];
    },
  });

  const participantesQ = useQuery({
    queryKey: ["admin-aprovacoes-participantes-v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participantes")
        .select("id,nome,email,status")
        .order("nome");

      if (error) throw error;
      return (data ?? []) as Participante[];
    },
  });

  const livrosQ = useQuery({
    queryKey: ["admin-aprovacoes-livros-v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("id,titulo,autor")
        .order("ordem");

      if (error) throw error;
      return (data ?? []) as Livro[];
    },
  });

  const turmasQ = useQuery({
    queryKey: ["admin-aprovacoes-turmas-v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id,nome,data_inicio,data_fim,vagas_max,vagas_restantes")
        .order("data_inicio");

      if (error) throw error;
      return (data ?? []) as Turma[];
    },
  });

  const pagamentos = pagamentosQ.data ?? [];
  const inscricoes = inscricoesQ.data ?? [];
  const participantes = participantesQ.data ?? [];
  const livros = livrosQ.data ?? [];
  const turmas = turmasQ.data ?? [];

  const participantesMap = useMemo(
    () => new Map(participantes.map((item) => [item.id, item])),
    [participantes],
  );
  const livrosMap = useMemo(
    () => new Map(livros.map((item) => [item.id, item])),
    [livros],
  );
  const turmasMap = useMemo(
    () => new Map(turmas.map((item) => [item.id, item])),
    [turmas],
  );
  const inscricoesMap = useMemo(
    () => new Map(inscricoes.map((item) => [item.id, item])),
    [inscricoes],
  );

  const pagamentosFiltrados = pagamentos.filter(
    (item) => item.status === filtroPagamento,
  );

  const inscricoesComDados = useMemo(
    () =>
      inscricoes.map((inscricao) => ({
        ...inscricao,
        participante: inscricao.participante_id
          ? participantesMap.get(inscricao.participante_id) ?? null
          : null,
        livro: inscricao.livro_id
          ? livrosMap.get(inscricao.livro_id) ?? null
          : null,
        turma: inscricao.turma_id
          ? turmasMap.get(inscricao.turma_id) ?? null
          : null,
        pagamentos: pagamentos.filter(
          (pagamento) => pagamento.inscricao_id === inscricao.id,
        ),
      })),
    [inscricoes, participantesMap, livrosMap, turmasMap, pagamentos],
  );

  const inscricoesPendentes = inscricoesComDados.filter((inscricao) => {
    const pagamentoAprovado = inscricao.pagamentos.some(
      (pagamento) => pagamento.status === "aprovado",
    );

    return (
      pagamentoAprovado &&
      inscricao.status !== "confirmada" &&
      inscricao.status !== "cancelada"
    );
  });

  const inscricoesAprovadas = inscricoesComDados.filter(
    (inscricao) => inscricao.status === "confirmada",
  );

  const inscricoesRejeitadas = inscricoesComDados.filter(
    (inscricao) => inscricao.status === "cancelada",
  );

  const aprovarPagamento = useMutation({
    mutationFn: async (pagamento: PagamentoRow) => {
      const { data: usuario } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "aprovado",
          pago_em: new Date().toISOString(),
          aprovado_em: new Date().toISOString(),
          aprovado_por: usuario.user?.id ?? null,
          observacao: null,
        })
        .eq("id", pagamento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento aprovado.");
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-v3"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-v3"],
      });
      qc.invalidateQueries({ queryKey: ["meus-pagamentos"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível aprovar o pagamento.",
      ),
  });

  const recusarPagamento = useMutation({
    mutationFn: async ({
      pagamento,
      motivo,
    }: {
      pagamento: PagamentoRow;
      motivo: string;
    }) => {
      const texto = motivo.trim();

      if (!texto) throw new Error("Informe o motivo da recusa.");

      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "rejeitado",
          pago_em: null,
          aprovado_em: null,
          aprovado_por: null,
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
        queryKey: ["admin-aprovacoes-pagamentos-v3"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-v3"],
      });
      qc.invalidateQueries({ queryKey: ["meus-pagamentos"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível recusar o pagamento.",
      ),
  });

  const excluirAprovacao = useMutation({
    mutationFn: async (pagamento: PagamentoRow) => {
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
          aprovado_em: null,
          aprovado_por: null,
        })
        .eq("id", pagamento.id);

      if (error) throw error;
      return true;
    },
    onSuccess: (ok) => {
      if (!ok) return;

      toast.success("Aprovação excluída.");
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-v3"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-v3"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível excluir a aprovação.",
      ),
  });

  const aprovarInscricao = useMutation({
    mutationFn: async (inscricaoId: string) => {
      const inscricao = inscricoesComDados.find(
        (item) => item.id === inscricaoId,
      );

      if (!inscricao) throw new Error("Inscrição não encontrada.");

      const pagamentoAprovado = inscricao.pagamentos.some(
        (pagamento) => pagamento.status === "aprovado",
      );

      if (!pagamentoAprovado) {
        throw new Error(
          "A inscrição só pode ser aprovada depois do pagamento aprovado.",
        );
      }

      const vagasMax = inscricao.turma?.vagas_max ?? 0;
      const vagasRestantes = inscricao.turma?.vagas_restantes ?? 0;

      if (vagasMax > 0 && vagasRestantes <= 0) {
        throw new Error("Não há vagas disponíveis nesta turma.");
      }

      const { error } = await supabase
        .from("inscricoes")
        .update({ status: "confirmada" })
        .eq("id", inscricaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição aprovada.");
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-v3"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-v3"],
      });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível aprovar a inscrição.",
      ),
  });

  const recusarInscricao = useMutation({
    mutationFn: async ({
      inscricao,
      motivo,
    }: {
      inscricao: InscricaoRow;
      motivo: string;
    }) => {
      const texto = motivo.trim();

      if (!texto) throw new Error("Informe o motivo da rejeição.");

      const { error } = await supabase
        .from("inscricoes")
        .update({ status: "cancelada" })
        .eq("id", inscricao.id);

      if (error) throw error;

      const pagamento = pagamentos.find(
        (item) => item.inscricao_id === inscricao.id,
      );

      if (pagamento) {
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
        queryKey: ["admin-aprovacoes-inscricoes-v3"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-pagamentos-v3"],
      });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível rejeitar a inscrição.",
      ),
  });

  const liberarInicio = useMutation({
    mutationFn: async (inscricaoId: string) => {
      const inscricao = inscricoesComDados.find(
        (item) => item.id === inscricaoId,
      );

      if (!inscricao) throw new Error("Inscrição não encontrada.");

      const participanteId = inscricao.participante?.id;

      if (!participanteId) throw new Error("Aluno não encontrado.");

      const { error } = await supabase
        .from("participantes")
        .update({ status: "participando" })
        .eq("id", participanteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aluno liberado para iniciar.");
      qc.invalidateQueries({
        queryKey: ["admin-aprovacoes-inscricoes-v3"],
      });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível liberar o início.",
      ),
  });

  const carregando =
    pagamentosQ.isLoading ||
    inscricoesQ.isLoading ||
    participantesQ.isLoading ||
    livrosQ.isLoading ||
    turmasQ.isLoading;

  const erro =
    pagamentosQ.error ||
    inscricoesQ.error ||
    participantesQ.error ||
    livrosQ.error ||
    turmasQ.error;

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
          <CardContent className="space-y-2 p-5">
            <p className="font-semibold text-destructive">
              Não foi possível carregar os dados.
            </p>
            <p className="text-sm text-muted-foreground">
              {erro instanceof Error
                ? erro.message
                : "Verifique o acesso às tabelas do Supabase."}
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
                  filtroPagamento === value ? "default" : "outline"
                }
                onClick={() =>
                  setFiltroPagamento(value as StatusPagamento)
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
              const inscricao = inscricoesMap.get(pagamento.inscricao_id);
              const aluno = inscricao?.participante_id
                ? participantesMap.get(inscricao.participante_id)
                : null;
              const livro = inscricao?.livro_id
                ? livrosMap.get(inscricao.livro_id)
                : null;
              const turma = inscricao?.turma_id
                ? turmasMap.get(inscricao.turma_id)
                : null;
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
                        >
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
                            onClick={() =>
                              abrirComprovante(
                                pagamento.comprovante_url!,
                              )
                            }
                          >
                            <ExternalLink className="mr-1 h-4 w-4" />
                            Comprovante
                          </Button>
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
              const vagasRestantes = turma?.vagas_restantes ?? 0;
              const semVaga =
                (turma?.vagas_max ?? 0) > 0 && vagasRestantes <= 0;

              return (
                <Card key={inscricao.id}>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-serif text-lg font-semibold">
                        {inscricao.participante?.nome ?? "Aluno"}
                      </p>
                      <p className="text-sm">
                        {inscricao.livro?.titulo ?? "Curso não informado"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inscricao.turma?.nome ?? "Turma não informada"}
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
                          variant={semVaga ? "destructive" : "secondary"}
                        >
                          {semVaga
                            ? "Sem vagas"
                            : `${vagasRestantes} vaga${
                                vagasRestantes === 1 ? "" : "s"
                              } restante${
                                vagasRestantes === 1 ? "" : "s"
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
                          aprovarInscricao.mutate(inscricao.id)
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
                        {inscricao.livro?.titulo ?? "Curso não informado"}
                        {inscricao.turma?.nome
                          ? ` · ${inscricao.turma.nome}`
                          : ""}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      disabled={liberarInicio.isPending}
                      onClick={() =>
                        liberarInicio.mutate(inscricao.id)
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
                <p className="font-medium">Aluno</p>
                <p className="text-sm text-muted-foreground">
                  {inscricoesComDados.find(
                    (item) => item.id === recusandoInscricao.id,
                  )?.participante?.nome ?? "Aluno"}
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
                  disabled={
                    recusarInscricao.isPending || !motivoInscricao.trim()
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
