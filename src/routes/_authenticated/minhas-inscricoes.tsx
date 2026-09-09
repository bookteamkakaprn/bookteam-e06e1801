import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  Archive,
  Clock,
  Loader2,
} from "lucide-react";

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
  motivo_rejeicao?: string | null;
  motivo_cancelamento?: string | null;
  cancelado_em?: string | null;
  livro?: { titulo: string } | null;
  turma?: {
    nome: string;
    data_inicio: string;
    data_fim: string;
    horario: string;
  } | null;
  evento?: { titulo: string; data: string } | null;
  pagamentos?: Array<{
    id: string;
    status: string;
    valor: number;
    observacao?: string | null;
    comprovante_url?: string | null;
    comprovante_enviado_em?: string | null;
  }>;
};

function MinhasInscricoesPage() {
  const { user } = useAuth();
  const [abaInscricoes, setAbaInscricoes] = useState<string>("confirmadas");
  const [abaPagamentos, setAbaPagamentos] = useState<string>("aprovados");

  const { data: inscricoes = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["minhas-inscricoes", user?.id],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          "id, status, motivo_rejeicao, motivo_cancelamento, cancelado_em, livro:livros(titulo), turma:turmas(nome,data_inicio,data_fim,horario), evento:eventos(titulo,data), pagamentos(id,status,valor,observacao,comprovante_url,comprovante_enviado_em)"
        )
        .eq("participante_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
    },
  });

  const inscricoesConfirmadas = inscricoes.filter((i) => i.status === "confirmada");
  const inscricoesRejeitadas = inscricoes.filter((i) => i.status === "cancelada" && i.motivo_rejeicao);
  const inscricoesCanceladas = inscricoes.filter((i) => i.status === "cancelada" && i.motivo_cancelamento);

  const pagamentosAprovados = inscricoes
    .flatMap((i) => (i.pagamentos ?? []).map((p) => ({ ...p, inscricao: i })))
    .filter((p) => p.status === "aprovado");

  const pagamentosRejeitados = inscricoes
    .flatMap((i) => (i.pagamentos ?? []).map((p) => ({ ...p, inscricao: i })))
    .filter((p) => p.status === "rejeitado");

  const pagamentosEstorno = inscricoes
    .flatMap((i) => (i.pagamentos ?? []).map((p) => ({ ...p, inscricao: i })))
    .filter((p) => p.status === "estorno");

  const getNomeCurso = (insc: Inscricao) => {
    return insc.livro?.titulo || insc.evento?.titulo || insc.turma?.nome || "Curso desconhecido";
  };

  const getDataCurso = (insc: Inscricao) => {
    if (insc.evento?.data) return insc.evento.data;
    if (insc.turma?.data_inicio) return insc.turma.data_inicio;
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Minhas inscrições</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas inscrições em cursos, turmas e eventos.
        </p>
      </div>

      {/* ABAS DE INSCRIÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inscrições em cursos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={abaInscricoes} onValueChange={setAbaInscricoes}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="confirmadas">
                Confirmadas ({inscricoesConfirmadas.length})
              </TabsTrigger>
              <TabsTrigger value="rejeitadas">
                Rejeitadas ({inscricoesRejeitadas.length})
              </TabsTrigger>
              <TabsTrigger value="canceladas">
                Canceladas ({inscricoesCanceladas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="confirmadas" className="space-y-3 mt-4">
              {inscricoesConfirmadas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma inscrição confirmada.
                </p>
              )}
              {inscricoesConfirmadas.map((insc) => (
                <div
                  key={insc.id}
                  className="rounded-lg border border-border/60 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">{getNomeCurso(insc)}</p>
                      {getDataCurso(insc) && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(getDataCurso(insc) + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <Badge className="w-fit bg-green-500/20 text-green-700">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Confirmada
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="rejeitadas" className="space-y-3 mt-4">
              {inscricoesRejeitadas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma inscrição rejeitada.
                </p>
              )}
              {inscricoesRejeitadas.map((insc) => (
                <div
                  key={insc.id}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{getNomeCurso(insc)}</p>
                      {getDataCurso(insc) && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(getDataCurso(insc) + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <Badge variant="destructive" className="w-fit">
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Rejeitada
                    </Badge>
                  </div>
                  {insc.motivo_rejeicao && (
                    <div className="text-sm text-destructive">
                      <p className="font-semibold">Motivo:</p>
                      <p>{insc.motivo_rejeicao}</p>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="canceladas" className="space-y-3 mt-4">
              {inscricoesCanceladas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma inscrição cancelada.
                </p>
              )}
              {inscricoesCanceladas.map((insc) => (
                <div
                  key={insc.id}
                  className="rounded-lg border border-border/60 p-4 space-y-2"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{getNomeCurso(insc)}</p>
                      {getDataCurso(insc) && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(getDataCurso(insc) + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      <Archive className="mr-1 h-3.5 w-3.5" /> Cancelada
                    </Badge>
                  </div>
                  {insc.motivo_cancelamento && (
                    <div className="text-sm text-muted-foreground">
                      <p className="font-semibold">Motivo:</p>
                      <p>{insc.motivo_cancelamento}</p>
                    </div>
                  )}
                  {insc.cancelado_em && (
                    <p className="text-xs text-muted-foreground">
                      Cancelado em {new Date(insc.cancelado_em).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ABAS DE PAGAMENTOS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={abaPagamentos} onValueChange={setAbaPagamentos}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="aprovados">
                Aprovados ({pagamentosAprovados.length})
              </TabsTrigger>
              <TabsTrigger value="rejeitados">
                Rejeitados ({pagamentosRejeitados.length})
              </TabsTrigger>
              <TabsTrigger value="estornos">
                Estornos ({pagamentosEstorno.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="aprovados" className="space-y-3 mt-4">
              {pagamentosAprovados.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum pagamento aprovado.
                </p>
              )}
              {pagamentosAprovados.map((pag) => (
                <div
                  key={pag.id}
                  className="rounded-lg border border-green-500/30 bg-green-500/5 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">
                        {getNomeCurso(pag.inscricao)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Number(pag.valor).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                      {pag.comprovante_enviado_em && (
                        <p className="text-xs text-muted-foreground">
                          Enviado em{" "}
                          {new Date(pag.comprovante_enviado_em).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                      )}
                    </div>
                    <Badge className="w-fit bg-green-500/20 text-green-700">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovado
                    </Badge>
                  </div>
                  {pag.comprovante_url && (
                    <Button size="sm" variant="outline" className="mt-2">
                      <Archive className="mr-1 h-3.5 w-3.5" /> Arquivar
                      comprovante
                    </Button>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="rejeitados" className="space-y-3 mt-4">
              {pagamentosRejeitados.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum pagamento rejeitado.
                </p>
              )}
              {pagamentosRejeitados.map((pag) => (
                <div
                  key={pag.id}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">
                        {getNomeCurso(pag.inscricao)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Number(pag.valor).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                    <Badge variant="destructive" className="w-fit">
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Rejeitado
                    </Badge>
                  </div>
                  {pag.observacao && (
                    <div className="text-sm text-destructive">
                      <p className="font-semibold">Motivo:</p>
                      <p>{pag.observacao}</p>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="estornos" className="space-y-3 mt-4">
              {pagamentosEstorno.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum estorno.
                </p>
              )}
              {pagamentosEstorno.map((pag) => (
                <div
                  key={pag.id}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">
                        {getNomeCurso(pag.inscricao)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Number(pag.valor).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                    <Badge className="w-fit bg-blue-500/20 text-blue-700">
                      <Clock className="mr-1 h-3.5 w-3.5" /> Estorno
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
