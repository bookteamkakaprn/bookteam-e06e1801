import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
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
  turma?: { nome: string | null; data: string | null } | null;
  pagamentos?: Array<{
    id: string;
    status: string;
    valor: number;
    observacao: string | null;
    comprovante_url: string | null;
    created_at: string;
  }>;
};

function MinhasInscricoesPage() {
  const { user } = useAuth();
  const [abaSelecionada, setAbaSelecionada] = useState<
    "confirmadas" | "rejeitadas" | "canceladas" | "pagamentos-aprovados" | "pagamentos-rejeitados" | "estornos"
  >("confirmadas");

  const { data: inscricoes = [], isLoading: carregandoInscricoes } = useQuery({
    enabled: !!user,
    queryKey: ["minhas-inscricoes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          "id, status, motivo_rejeicao, motivo_cancelamento, cancelado_em, livro:livros(titulo), turma:turmas(nome, data), pagamentos(*)"
        )
        .eq("participante_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
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

  // Filtrar inscrições por status
  const confirmadasFiltradas = inscricoes.filter((i) => i.status === "confirmada");
  const rejeitadasFiltradas = inscricoes.filter((i) => i.status === "cancelada" && i.motivo_rejeicao);
  const canceladasFiltradas = inscricoes.filter((i) => i.status === "cancelada" && !i.motivo_rejeicao);

  // Processar pagamentos
  const pagamentosAprovados: Inscricao[] = [];
  const pagamentosRejeitados: Inscricao[] = [];

  inscricoes.forEach((insc) => {
    insc.pagamentos?.forEach((pag) => {
      if (pag.status === "aprovado") {
        pagamentosAprovados.push({ ...insc, pagamentos: [pag] });
      } else if (pag.status === "rejeitado") {
        pagamentosRejeitados.push({ ...insc, pagamentos: [pag] });
      }
    });
  });

  // Abas
  const abas = [
    { id: "confirmadas", label: "Confirmadas", count: confirmadasFiltradas.length },
    { id: "rejeitadas", label: "Rejeitadas", count: rejeitadasFiltradas.length },
    { id: "canceladas", label: "Canceladas", count: canceladasFiltradas.length },
    { id: "pagamentos-aprovados", label: "Pagamentos Aprovados", count: pagamentosAprovados.length },
    { id: "pagamentos-rejeitados", label: "Pagamentos Rejeitados", count: pagamentosRejeitados.length },
  ] as const;

  const getDados = () => {
    switch (abaSelecionada) {
      case "confirmadas":
        return confirmadasFiltradas;
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

      {/* Conteúdo */}
      {carregandoInscricoes && (
        <p className="text-sm text-muted-foreground">Carregando inscrições…</p>
      )}

      {!carregandoInscricoes && dados.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhuma inscrição nesta categoria.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {dados.map((inscricao) => {
          const pag = temPagamento ? inscricao.pagamentos?.[0] : null;
          const titulo = inscricao.livro?.titulo || inscricao.turma?.nome || "Curso não informado";
          const data = inscricao.turma?.data;

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
                        </>
                      ) : (
                        <>
                          {inscricao.status === "confirmada" && (
                            <Badge className="gap-1 bg-green-500">
                              <CheckCircle2 className="h-3 w-3" />
                              Confirmada
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
                        {pag.comprovante_url && (
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
