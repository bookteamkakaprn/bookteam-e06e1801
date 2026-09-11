import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle, CheckCircle2, XCircle, Archive, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/minhas-inscricoes")({
  head: () => ({
    meta: [
      { title: "Minhas inscrições — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MinhasInscricoesPage,
});

type Inscricao = {
  id: string;
  status: string;
  motivo_rejeicao: string | null;
  motivo_cancelamento: string | null;
  cancelado_em: string | null;
  livro?: { titulo: string | null } | null;
  turma?: { nome: string | null; data_inicio: string | null } | null;
  evento?: { titulo: string | null; data: string | null } | null;
  pagamentos?: Array<{
    id: string;
    status: string;
    valor: number;
    observacao: string | null;
    comprovante_url: string | null;
    created_at: string;
    arquivado?: boolean;
  }>;
};

function MinhasInscricoesPage() {
  const { user } = useAuth();
  const [abaSelecionada, setAbaSelecionada] = useState<
    "confirmadas" | "aguardando" | "rejeitadas" | "canceladas" | "presenca" | "certificado" | "pagamentos-aprovados" | "pagamentos-rejeitados"
  >("confirmadas");
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  const { data: inscricoes = [], isLoading: carregandoInscricoes, refetch } = useQuery({
    enabled: !!user,
    queryKey: ["minhas-inscricoes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          "id, status, motivo_rejeicao, motivo_cancelamento, cancelado_em, livro:livros(titulo), turma:turmas(nome, data_inicio), evento:eventos(titulo, data), pagamentos(*)"
        )
        .eq("participante_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
    },
  });

  const desinscrever = useMutation({
    mutationFn: async (inscricaoId: string) => {
      const { error } = await supabase
        .from("inscricoes")
        .update({ status: "cancelada", cancelado_em: new Date().toISOString() })
        .eq("id", inscricaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Você foi desinscrito do curso!");
      refetch();
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao desinscrever");
    },
  });

  const downloadComprovante = async (comprovantePath: string, nome: string) => {
    try {
      const { data: signedData, error } = await supabase.storage
        .from("comprovantes")
        .createSignedUrl(comprovantePath, 300);

      if (error) throw error;

      if (signedData?.signedUrl) {
        const link = document.createElement("a");
        link.href = signedData.signedUrl;
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Comprovante baixado!");
      }
    } catch (e) {
      toast.error("Erro ao baixar comprovante");
    }
  };

  const arquivarComprovante = async (pagamentoId: string, pagInscricaoId: string) => {
    try {
      const { error } = await supabase
        .from("pagamentos")
        .update({ arquivado: true })
        .eq("id", pagamentoId);

      if (error) throw error;
      toast.success("Comprovante arquivado!");
    } catch (e) {
      toast.error("Erro ao arquivar comprovante");
    }
  };

  // Filtrar inscrições por status
  const confirmadasFiltradas = inscricoes.filter((i) => i.status === "confirmada");
  const aguardandoFiltradas = inscricoes.filter((i) => i.status === "aguardando" || i.status === "aguardando_pagamento");
  const rejeitadasFiltradas = inscricoes.filter((i) => i.status === "cancelada" && i.motivo_rejeicao);
  const canceladasFiltradas = inscricoes.filter((i) => i.status === "cancelada" && !i.motivo_rejeicao);

  // Processar pagamentos
  const pagamentosAprovados: Inscricao[] = [];
  const pagamentosRejeitados: Inscricao[] = [];

  inscricoes.forEach((insc) => {
    insc.pagamentos?.forEach((pag) => {
      const isArquivado = pag.arquivado === true;
      const deveExibir = mostrarArquivados ? isArquivado : !isArquivado;

      if (deveExibir) {
        if (pag.status === "aprovado") {
          pagamentosAprovados.push({ ...insc, pagamentos: [pag] });
        } else if (pag.status === "rejeitado") {
          pagamentosRejeitados.push({ ...insc, pagamentos: [pag] });
        }
      }
    });
  });

  // Abas
  const abas = [
    { id: "confirmadas", label: "Confirmadas", count: confirmadasFiltradas.length },
    { id: "aguardando", label: "Aguardando", count: aguardandoFiltradas.length },
    { id: "presenca", label: "Presença", count: confirmadasFiltradas.length },
    { id: "certificado", label: "Certificados", count: 1 },
    { id: "rejeitadas", label: "Rejeitadas", count: rejeitadasFiltradas.length },
    { id: "canceladas", label: "Canceladas", count: canceladasFiltradas.length },
    { id: "pagamentos-aprovados", label: "Pagamentos Aprovados", count: pagamentosAprovados.length },
    { id: "pagamentos-rejeitados", label: "Pagamentos Rejeitados", count: pagamentosRejeitados.length },
  ] as const;

  const getDados = () => {
    switch (abaSelecionada) {
      case "confirmadas":
        return confirmadasFiltradas;
      case "aguardando":
        return aguardandoFiltradas;
      case "presenca":
        return confirmadasFiltradas; // Mostrar cursos confirmados para marcar presença
      case "certificado":
        return []; // Vai ser tratado de forma especial abaixo
      case "rejeitadas":
        return rejeitadasFiltradas;
      case "canceladas":
        return canceladasFiltradas;
      case "pagamentos-aprovados":
        return pagamentosAprovados;
      case "pagamentos-rejeitados":
        return pagamentosRejeitados;
      default:
        return [];
    }
  };

  const dados = getDados();
  const temPagamento = abaSelecionada.includes("pagamentos");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Minhas inscrições</h1>
        <p className="text-sm text-muted-foreground">
          Visualize seu histórico de inscrições, pagamentos e certificados.
        </p>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap gap-2">
        {abas.map(({ id, label, count }) => (
          <Button
            key={id}
            variant={abaSelecionada === id ? "default" : "outline"}
            onClick={() => setAbaSelecionada(id)}
            className="gap-2"
          >
            {label}
            <Badge variant="secondary" className="ml-1">
              {count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Filtro de arquivados */}
      {temPagamento && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mostrarArquivados ? "default" : "outline"}
            onClick={() => setMostrarArquivados(!mostrarArquivados)}
            className="gap-1"
          >
            <Archive className="h-3.5 w-3.5" />
            {mostrarArquivados ? "Mostrando arquivados" : "Mostrar arquivados"}
          </Button>
        </div>
      )}

      {/* Conteúdo */}
      {carregandoInscricoes && (
        <p className="text-sm text-muted-foreground">Carregando inscrições...</p>
      )}

      {abaSelecionada === "certificado" && !carregandoInscricoes && (
        <Card>
          <CardHeader>
            <CardTitle>Jornada Book Team — 10 Cursos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Progresso da Jornada</p>
                <p className="text-sm text-muted-foreground">{confirmadasFiltradas.length} de 10 cursos completos</p>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(confirmadasFiltradas.length / 10) * 100}%` }}
                />
              </div>
            </div>

            {confirmadasFiltradas.length === 10 && (
              <div className="rounded-lg bg-green-500/10 p-4 text-green-700">
                <p className="font-semibold">✅ Parabéns! Você completou a Jornada!</p>
                <p className="text-sm">Seu certificado está pronto para download.</p>
              </div>
            )}

            {confirmadasFiltradas.length < 10 && (
              <div className="rounded-lg bg-yellow-500/10 p-4 text-yellow-700">
                <p className="font-semibold">⏳ Faltam {10 - confirmadasFiltradas.length} cursos para completar a jornada</p>
                <p className="text-sm">O certificado será entregue após completar todos os 10 cursos.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {abaSelecionada === "presenca" && !carregandoInscricoes && confirmadasFiltradas.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Você ainda não tem nenhum curso confirmado. Quando confirmar, sua presença aparecerá aqui.
          </CardContent>
        </Card>
      )}

      {abaSelecionada !== "certificado" && !carregandoInscricoes && dados.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhuma inscrição nesta categoria.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {abaSelecionada === "presenca" && !carregandoInscricoes && confirmadasFiltradas.length > 0 && (
          <div className="rounded-lg bg-blue-500/10 p-4 text-blue-700">
            <p className="text-sm font-semibold">📋 Sua Presença nos Cursos</p>
            <p className="text-xs">A presença é marcada pelo admin durante as aulas. Você pode acompanhar aqui.</p>
          </div>
        )}
        {dados.map((inscricao) => {
          const pag = temPagamento ? inscricao.pagamentos?.[0] : null;
          const titulo = inscricao.evento?.titulo || inscricao.livro?.titulo || inscricao.turma?.nome || "Inscrição não informada";
          const data = inscricao.evento?.data || inscricao.turma?.data_inicio;

          return (
            <Card key={`${inscricao.id}-${temPagamento ? pag?.id : "insc"}`}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-serif text-lg font-semibold truncate">{titulo}</p>
                    {data && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(data).toLocaleDateString("pt-BR")}
                      </p>
                    )}

                    {/* Status com motivo */}
                    <div className="mt-2 flex items-center gap-2">
                      {temPagamento ? (
                        <>
                          {pag?.status === "aprovado" && (
                            <Badge className="gap-1 bg-green-500">
                              <CheckCircle2 className="h-3 w-3" />
                              Aprovado
                            </Badge>
                          )}
                          {pag?.status === "rejeitado" && (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Rejeitado
                            </Badge>
                          )}
                          {pag?.arquivado && (
                            <Badge variant="secondary" className="gap-1">
                              <Archive className="h-3 w-3" />
                              Arquivado
                            </Badge>
                          )}
                        </>
                      ) : (
                        <>
                          {inscricao.status === "confirmada" && (
                            <Badge className="gap-1 bg-green-500">
                              <CheckCircle2 className="h-3 w-3" />
                              Confirmada
                            </Badge>
                          )}
                          {(inscricao.status === "aguardando" || inscricao.status === "aguardando_pagamento") && (
                            <Badge className="gap-1 bg-yellow-500">
                              <AlertCircle className="h-3 w-3" />
                              Aguardando
                            </Badge>
                          )}
                          {inscricao.status === "cancelada" && inscricao.motivo_rejeicao && (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Rejeitada
                            </Badge>
                          )}
                          {inscricao.status === "cancelada" && !inscricao.motivo_rejeicao && (
                            <Badge variant="secondary">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Cancelada
                            </Badge>
                          )}
                        </>
                      )}
                    </div>

                    {/* Motivo */}
                    {inscricao.motivo_rejeicao && (
                      <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                        <p className="text-xs font-semibold text-destructive">Motivo da recusa:</p>
                        <p className="text-xs text-destructive">{inscricao.motivo_rejeicao}</p>
                      </div>
                    )}

                    {inscricao.motivo_cancelamento && (
                      <div className="mt-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2">
                        <p className="text-xs font-semibold text-yellow-600">Motivo do cancelamento:</p>
                        <p className="text-xs text-yellow-600">{inscricao.motivo_cancelamento}</p>
                      </div>
                    )}

                    {pag?.observacao && (
                      <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                        <p className="text-xs font-semibold text-destructive">Observação do admin:</p>
                        <p className="text-xs text-destructive">{pag.observacao}</p>
                      </div>
                    )}

                    {abaSelecionada === "presenca" && (
                      <div className="mt-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-2">
                        <p className="text-xs font-semibold text-blue-600">Presença:</p>
                        <p className="text-xs text-blue-600">✓ Você está inscrito neste curso. Presença marcada pelo admin.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {temPagamento && pag && (
                      <>
                        <span className="font-serif text-lg font-semibold">
                          {Number(pag.valor).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        {pag.comprovante_url && !pag.arquivado && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadComprovante(pag.comprovante_url!, "comprovante")}
                              className="gap-1"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Comprovante
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => arquivarComprovante(pag.id, inscricao.id)}
                              className="gap-1"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Arquivar
                            </Button>
                          </>
                        )}
                        {pag.comprovante_url && pag.arquivado && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadComprovante(pag.comprovante_url!, "comprovante")}
                            className="gap-1"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Comprovante
                          </Button>
                        )}
                      </>
                    )}
                    {!temPagamento && inscricao.status === "confirmada" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm("Tem certeza que deseja desinscrever deste curso?")) {
                            desinscrever.mutate(inscricao.id);
                          }
                        }}
                        disabled={desinscrever.isPending}
                        className="gap-1"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {desinscrever.isPending ? "Desinscrevi..." : "Desinscrever"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
