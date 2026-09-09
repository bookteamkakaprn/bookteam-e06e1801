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
  inscricao: {
    id: string;
    status: string;
    participante: {
      id: string;
      nome: string | null;
      email: string | null;
    } | null;
    livro: { titulo: string | null; autor: string | null } | null;
    turma: {
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
  participante: {
    id: string;
    nome: string | null;
    email: string | null;
    status: string;
  } | null;
  livro: { titulo: string | null; autor: string | null } | null;
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

function AdminAprovacoes() {
  const qc = useQueryClient();
  const [aba, setAba] = useState<Aba>("pagamentos");
  const [filtroPagamento, setFiltroPagamento] = useState<StatusPagamento>("aguardando");
  const [recusandoPagamento, setRecusandoPagamento] = useState<Pagamento | null>(null);
  const [motivoPagamento, setMotivoPagamento] = useState("");
  const [recusandoInscricao, setRecusandoInscricao] = useState<Inscricao | null>(null);
  const [motivoInscricao, setMotivoInscricao] = useState("");

  const pagamentosQ = useQuery({
    queryKey: ["admin-aprovacoes-pagamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select(`id,status,valor,comprovante_url,observacao,created_at,
          inscricao:inscricoes(
            id,status,
            participante:participantes(id,nome,email),
            livro:livros(titulo,autor),
            turma:turmas(nome,data_inicio,data_fim,vagas_max,vagas_restantes)
          )`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Pagamento[];
    },
  });

  const inscricoesQ = useQuery({
    queryKey: ["admin-aprovacoes-inscricoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(`id,status,created_at,
          participante:participantes(id,nome,email,status),
          livro:livros(titulo,autor),
          turma:turmas(id,nome,data_inicio,data_fim,vagas_max,vagas_restantes),
          pagamentos(id,status,valor,observacao)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
    },
  });

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

      const participanteId = pagamento.inscricao?.participante?.id;
      if (participanteId) {
        const curso = pagamento.inscricao?.livro?.titulo ?? "Book Team";
        const mensagem =
          status === "aprovado"
            ? `Seu pagamento foi aprovado para ${curso}. Sua inscrição agora aguarda a confirmação da vaga pela equipe.`
            : `Seu pagamento não foi aprovado para ${curso}. Motivo: ${observacao || "Comprovante não validado."} Acesse sua área do aluno para regularizar.`;
        const emailRes = await supabase.functions.invoke("bookteam-send-notification-email", {
          body: {
            participante_id: participanteId,
            assunto: status === "aprovado" ? "Pagamento aprovado — Book Team" : "Pagamento não aprovado — Book Team",
            mensagem,
          },
        });
        if (emailRes.error) console.warn("E-mail de status não enviado:", emailRes.error.message);
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
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-pagamentos"] });
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["meus-pagamentos"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o pagamento."),
  });

  const excluirAprovacaoPagamento = useMutation({
    mutationFn: async (pagamento: Pagamento) => {
      if (!window.confirm(`Excluir a aprovação do pagamento de "${pagamento.inscricao?.participante?.nome ?? "Aluno"}"?\n\nO pagamento voltará para Pendentes.`)) {
        return false;
      }
      const { error } = await supabase
        .from("pagamentos")
        .update({ status: "aguardando", aprovado_em: null, aprovado_por: null, observacao: null })
        .eq("id", pagamento.id);
      if (error) throw error;
      return true;
    },
    onSuccess: (alterado) => {
      if (!alterado) return;
      toast.success("Aprovação excluída. O pagamento voltou para Pendentes.");
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-pagamentos"] });
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir a aprovação."),
  });

  const aprovarInscricao = useMutation({
    mutationFn: async (inscricao: Inscricao) => {
      const pagamentoAprovado = inscricao.pagamentos?.some((p) => p.status === "aprovado");
      if (!pagamentoAprovado) {
        throw new Error("A inscrição só pode ser aprovada depois do pagamento aprovado.");
      }

      const vagasMax = inscricao.turma?.vagas_max ?? 0;
      const vagasRestantes = inscricao.turma?.vagas_restantes ?? 0;
      if (vagasMax > 0 && vagasRestantes <= 0) {
        throw new Error("Não há vagas disponíveis nesta turma. A inscrição não pode ser confirmada.");
      }

      const { error } = await supabase
        .from("inscricoes")
        .update({ status: "confirmada" })
        .eq("id", inscricao.id);
      if (error) throw error;

      const participanteId = inscricao.participante?.id;
      if (participanteId) {
        const curso = inscricao.livro?.titulo ?? "Book Team";
        const { error: notificacaoError } = await supabase.from("notificacoes").insert({
          participante_id: participanteId,
          titulo: "Inscrição aprovada — Book Team",
          mensagem: `Sua inscrição em ${curso} foi confirmada e a vaga foi reservada.`,
          lida: false,
        });
        if (notificacaoError) console.warn("Notificação não criada:", notificacaoError.message);
      }
    },
    onSuccess: () => {
      toast.success("Inscrição aprovada e confirmada.");
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-pagamentos"] });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
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

      const pagamento = inscricao.pagamentos?.[0];
      if (pagamento?.id) {
        const { error: pagamentoError } = await supabase
          .from("pagamentos")
          .update({ observacao: `Rejeição da inscrição: ${texto}` })
          .eq("id", pagamento.id);
        if (pagamentoError) throw pagamentoError;
      }

      const participanteId = inscricao.participante?.id;
      if (participanteId) {
        const curso = inscricao.livro?.titulo ?? "Book Team";
        const emailRes = await supabase.functions.invoke("bookteam-send-notification-email", {
          body: {
            participante_id: participanteId,
            assunto: "Inscrição não aprovada — Book Team",
            mensagem: `Sua inscrição em ${curso} não foi aprovada. Motivo: ${texto}. Acesse sua área do aluno para verificar a situação.`,
          },
        });
        if (emailRes.error) console.warn("E-mail de rejeição não enviado:", emailRes.error.message);
      }
    },
    onSuccess: () => {
      toast.success("Inscrição rejeitada. O motivo foi registrado.");
      setRecusandoInscricao(null);
      setMotivoInscricao("");
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-pagamentos"] });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
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

      const curso = inscricao.livro?.titulo ?? "Book Team";
      const { error: notificacaoError } = await supabase.from("notificacoes").insert({
        participante_id: participanteId,
        titulo: "Você pode iniciar sua jornada!",
        mensagem: `Sua inscrição em ${curso} está confirmada e você já pode iniciar sua jornada.`,
        lida: false,
      });
      if (notificacaoError) console.warn("Notificação de liberação não criada:", notificacaoError.message);
    },
    onSuccess: () => {
      toast.success("Aluno liberado para iniciar.");
      qc.invalidateQueries({ queryKey: ["admin-aprovacoes-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível liberar o início."),
  });

  async function abrirComprovante(url: string) {
    const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(url, 300);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível abrir o comprovante.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const pagamentos = pagamentosQ.data ?? [];
  const pagamentosFiltrados = pagamentos.filter((p) => p.status === filtroPagamento);

  const inscricoes = inscricoesQ.data ?? [];
  const inscricoesPendentes = inscricoes.filter((i) => {
    const pagamentoAprovado = i.pagamentos?.some((p) => p.status === "aprovado");
    return pagamentoAprovado && i.status !== "confirmada" && i.status !== "cancelada";
  });
  const inscricoesAprovadas = inscricoes.filter((i) => i.status === "confirmada");
  const inscricoesRejeitadas = inscricoes.filter((i) => i.status === "cancelada");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold">Aprovar inscrições e pagamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Primeiro aprove o pagamento. Depois confirme a inscrição conforme a disponibilidade de vagas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={aba === "pagamentos" ? "default" : "outline"} onClick={() => setAba("pagamentos")} className="gap-2">
          <CreditCard className="h-4 w-4" />
          Aprovar pagamentos
        </Button>
        <Button size="sm" variant={aba === "inscricoes" ? "default" : "outline"} onClick={() => setAba("inscricoes")} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Aprovar inscrições
          {inscricoesPendentes.length > 0 ? ` (${inscricoesPendentes.length})` : ""}
        </Button>
      </div>

      {aba === "pagamentos" && (
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

          {pagamentosQ.isLoading && (
            <p className="text-sm text-muted-foreground">
              <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Carregando pagamentos…
            </p>
          )}
          {pagamentosQ.isError && (
            <p className="text-sm text-destructive">Não foi possível carregar os pagamentos.</p>
          )}
          {!pagamentosQ.isLoading && !pagamentosQ.isError && !pagamentosFiltrados.length && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum pagamento nesta situação.
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {pagamentosFiltrados.map((pagamento) => {
              const aluno = pagamento.inscricao?.participante;
              const turma = pagamento.inscricao?.turma;
              const recusando = recusandoPagamento?.id === pagamento.id;

              return (
                <Card key={pagamento.id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-serif text-lg font-semibold">{aluno?.nome ?? "Aluno"}</p>
                        <p className="text-sm">{pagamento.inscricao?.livro?.titulo ?? "Curso não informado"}</p>
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

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="font-serif text-lg">{moeda(pagamento.valor)}</span>
                        <Badge
                          variant={pagamento.status === "aprovado" ? "default" : pagamento.status === "rejeitado" ? "destructive" : "secondary"}
                          className="inline-flex items-center gap-1"
                        >
                          {pagamento.status === "aprovado" ? <CheckCircle2 className="h-3 w-3" /> : pagamento.status === "rejeitado" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {pagamento.status === "aprovado" ? "Aprovado" : pagamento.status === "rejeitado" ? "Recusado" : "Pendente"}
                        </Badge>

                        {pagamento.comprovante_url && (
                          <Button size="sm" variant="outline" onClick={() => abrirComprovante(pagamento.comprovante_url!)}>
                            <ExternalLink className="mr-1 h-4 w-4" />Comprovante
                          </Button>
                        )}

                        {pagamento.status === "aguardando" && (
                          <>
                            <Button
                              size="sm"
                              disabled={decidirPagamento.isPending}
                              onClick={() => decidirPagamento.mutate({ pagamento, status: "aprovado", observacao: null })}
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
                        <Label htmlFor={`motivo-pagamento-${pagamento.id}`} className="text-sm font-semibold">
                          Motivo da recusa
                        </Label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <Input
                            id={`motivo-pagamento-${pagamento.id}`}
                            placeholder="Ex.: comprovante ilegível, valor divergente..."
                            value={motivoPagamento}
                            onChange={(e) => setMotivoPagamento(e.target.value)}
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
                          <Button type="button" variant="ghost" onClick={() => {
                            setRecusandoPagamento(null);
                            setMotivoPagamento("");
                          }}>
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

      {aba === "inscricoes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Pendentes: {inscricoesPendentes.length}</Badge>
            <Badge variant="secondary">Aprovadas: {inscricoesAprovadas.length}</Badge>
            <Badge variant="secondary">Rejeitadas: {inscricoesRejeitadas.length}</Badge>
          </div>

          {inscricoesQ.isLoading && (
            <p className="text-sm text-muted-foreground">
              <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Carregando inscrições…
            </p>
          )}
          {inscricoesQ.isError && (
            <p className="text-sm text-destructive">Não foi possível carregar as inscrições.</p>
          )}

          {!inscricoesQ.isLoading && !inscricoesQ.isError && inscricoesPendentes.length === 0 && (
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
              const semVaga = !!turma?.vagas_max && vagasRestantes <= 0;

              return (
                <Card key={inscricao.id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-serif text-lg font-semibold">{inscricao.participante?.nome ?? "Aluno"}</p>
                        <p className="text-sm">{inscricao.livro?.titulo ?? "Curso não informado"}</p>
                        <p className="text-xs text-muted-foreground">
                          {turma?.nome ?? "Turma não informada"}
                          {turma?.data_inicio ? ` • ${dataBR(turma.data_inicio)}` : ""}
                          {turma?.data_fim ? ` até ${dataBR(turma.data_fim)}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{inscricao.participante?.email ?? ""}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Pagamento aprovado</Badge>
                          <Badge variant={semVaga ? "destructive" : "secondary"}>
                            {semVaga ? "Sem vagas" : `${vagasRestantes} vaga${vagasRestantes === 1 ? "" : "s"} restante${vagasRestantes === 1 ? "" : "s"}`}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Button
                          disabled={aprovarInscricao.isPending || semVaga}
                          onClick={() => aprovarInscricao.mutate(inscricao)}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />Aprovar inscrição
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={recusarInscricao.isPending}
                          onClick={() => {
                            setRecusandoInscricao(inscricao);
                            setMotivoInscricao("");
                          }}
                        >
                          <XCircle className="mr-1 h-4 w-4" />Recusar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {inscricoesAprovadas.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold">Inscrições aprovadas</h2>
                  <p className="text-xs text-muted-foreground">Estas inscrições já têm a vaga confirmada.</p>
                </div>
                {inscricoesAprovadas.map((inscricao) => (
                  <div key={inscricao.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                    <div>
                      <p className="font-semibold">{inscricao.participante?.nome ?? "Aluno"}</p>
                      <p className="text-xs text-muted-foreground">
                        {inscricao.livro?.titulo ?? "Curso não informado"}
                        {inscricao.turma?.nome ? ` · ${inscricao.turma.nome}` : ""}
                      </p>
                    </div>
                    <Button size="sm" disabled={liberarInicio.isPending} onClick={() => liberarInicio.mutate(inscricao)}>
                      <PlayCircle className="mr-1 h-4 w-4" />Liberar início
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
                  const pagamento = inscricao.pagamentos?.[0];
                  return (
                    <div key={inscricao.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <p className="font-semibold">{inscricao.participante?.nome ?? "Aluno"}</p>
                      <p className="text-xs text-muted-foreground">{inscricao.livro?.titulo ?? "Curso não informado"}</p>
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
                <p className="font-medium">{recusandoInscricao.participante?.nome ?? "Aluno"}</p>
                <p className="text-xs text-muted-foreground">{recusandoInscricao.livro?.titulo ?? "Curso não informado"}</p>
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
                <Button type="button" variant="outline" onClick={() => {
                  setRecusandoInscricao(null);
                  setMotivoInscricao("");
                }}>
                  Cancelar
                </Button>
                <Button type="submit" variant="destructive" disabled={recusarInscricao.isPending || !motivoInscricao.trim()}>
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
