import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  CreditCard,
  FileText,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_admin/admin/pagamentos")({
  head: () => ({
    meta: [
      {
        title: "Controle de pagamentos — Admin — Book Team",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: AdminControlePagamentos,
});

type ControleStatus = "pago" | "cancelado" | "estornado";

type PagamentoControle = {
  id: string;
  valor: number;
  created_at: string;
  controle_status: ControleStatus | null;
  status: "aguardando" | "aprovado" | "rejeitado";
  inscricao: {
    id: string;
    status: string;
    livro: {
      id: string;
      titulo: string | null;
    } | null;
    participante: {
      nome: string | null;
      email: string | null;
    } | null;
  } | null;
};

function moeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarStatus(
  pagamento: PagamentoControle,
): ControleStatus | null {
  if (pagamento.controle_status) return pagamento.controle_status;

  if (pagamento.inscricao?.status === "cancelada") {
    return "cancelado";
  }

  if (pagamento.status === "aprovado") {
    return "pago";
  }

  return null;
}

function AdminControlePagamentos() {
  const [aba, setAba] = useState<"controle" | "relatorios">("controle");
  const [cursoId, setCursoId] = useState("todos");

  const pagamentosQ = useQuery({
    queryKey: ["admin-controle-pagamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select(
          `id,valor,created_at,status,controle_status,
           inscricao:inscricoes(
             id,status,
             livro:livros(id,titulo),
             participante:participantes(nome,email)
           )`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as PagamentoControle[];
    },
  });

  const pagamentos = pagamentosQ.data ?? [];

  const cursos = useMemo(() => {
    const map = new Map<string, string>();

    pagamentos.forEach((pagamento) => {
      const livro = pagamento.inscricao?.livro;
      if (livro?.id) {
        map.set(livro.id, livro.titulo ?? "Curso sem nome");
      }
    });

    return Array.from(map.entries())
      .map(([id, titulo]) => ({ id, titulo }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  }, [pagamentos]);

  const filtrados = useMemo(() => {
    return pagamentos.filter((pagamento) => {
      const status = normalizarStatus(pagamento);

      const cursoOk =
        cursoId === "todos" ||
        pagamento.inscricao?.livro?.id === cursoId;

      return cursoOk && status !== null;
    });
  }, [pagamentos, cursoId]);

  const resumo = useMemo(() => {
    const resultado = {
      pago: { quantidade: 0, valor: 0 },
      cancelado: { quantidade: 0, valor: 0 },
      estornado: { quantidade: 0, valor: 0 },
    };

    for (const pagamento of filtrados) {
      const status = normalizarStatus(pagamento);
      if (!status) continue;

      resultado[status].quantidade += 1;
      resultado[status].valor += Number(pagamento.valor ?? 0);
    }

    return resultado;
  }, [filtrados]);

  const resumoPorCurso = useMemo(() => {
    const map = new Map<
      string,
      {
        curso: string;
        pago: number;
        cancelado: number;
        estornado: number;
        total: number;
      }
    >();

    for (const pagamento of filtrados) {
      const cursoIdLocal =
        pagamento.inscricao?.livro?.id ?? "sem-curso";
      const curso =
        pagamento.inscricao?.livro?.titulo ?? "Curso não informado";
      const status = normalizarStatus(pagamento);

      if (!status) continue;

      const atual =
        map.get(cursoIdLocal) ?? {
          curso,
          pago: 0,
          cancelado: 0,
          estornado: 0,
          total: 0,
        };

      const valor = Number(pagamento.valor ?? 0);

      atual[status] += valor;
      atual.total += valor;

      map.set(cursoIdLocal, atual);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.curso.localeCompare(b.curso, "pt-BR"),
    );
  }, [filtrados]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Financeiro
          </p>
          <h1 className="font-serif text-3xl font-bold">
            Controle de pagamentos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe pagamentos pagos, cancelados e estornados por curso.
          </p>
        </div>

        <Button asChild variant="outline" className="gap-2">
          <Link to="/admin/conta">
            <Wallet className="h-4 w-4" />
            Conta PIX
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={aba === "controle" ? "default" : "outline"}
          onClick={() => setAba("controle")}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Controle
        </Button>

        <Button
          variant={aba === "relatorios" ? "default" : "outline"}
          onClick={() => setAba("relatorios")}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Relatórios
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="filtro-curso"
                className="text-sm font-medium"
              >
                Filtrar por curso
              </label>

              <select
                id="filtro-curso"
                className="h-10 min-w-[280px] rounded-md border border-input bg-background px-3 text-sm"
                value={cursoId}
                onChange={(e) => setCursoId(e.target.value)}
              >
                <option value="todos">Todos os cursos</option>
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.titulo}
                  </option>
                ))}
              </select>
            </div>

            <Badge variant="secondary" className="gap-1">
              <CreditCard className="h-3 w-3" />
              {filtrados.length} lançamentos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {pagamentosQ.isLoading && (
        <p className="text-sm text-muted-foreground">
          Carregando controle financeiro…
        </p>
      )}

      {pagamentosQ.isError && (
        <p className="text-sm text-destructive">
          Não foi possível carregar os pagamentos.
        </p>
      )}

      {!pagamentosQ.isLoading && !pagamentosQ.isError && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Pagos</p>
                <p className="mt-1 font-serif text-2xl font-bold">
                  {moeda(resumo.pago.valor)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {resumo.pago.quantidade} pagamentos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Cancelados</p>
                <p className="mt-1 font-serif text-2xl font-bold">
                  {moeda(resumo.cancelado.valor)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {resumo.cancelado.quantidade} pagamentos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Estornados</p>
                <p className="mt-1 font-serif text-2xl font-bold">
                  {moeda(resumo.estornado.valor)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {resumo.estornado.quantidade} pagamentos
                </p>
              </CardContent>
            </Card>
          </div>

          {aba === "controle" && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div>
                  <h2 className="font-serif text-xl font-semibold">
                    Resumo por curso
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Valores agrupados por situação financeira.
                  </p>
                </div>

                {resumoPorCurso.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum lançamento financeiro encontrado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {resumoPorCurso.map((linha) => (
                      <div
                        key={linha.curso}
                        className="grid gap-3 rounded-lg border border-border/60 p-3 md:grid-cols-[minmax(0,1.6fr)_repeat(4,1fr)] md:items-center"
                      >
                        <div>
                          <p className="font-semibold">{linha.curso}</p>
                        </div>

                        <div>
                          <p className="text-[11px] text-muted-foreground">
                            Pago
                          </p>
                          <p className="text-sm font-semibold">
                            {moeda(linha.pago)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] text-muted-foreground">
                            Cancelado
                          </p>
                          <p className="text-sm font-semibold">
                            {moeda(linha.cancelado)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] text-muted-foreground">
                            Estornado
                          </p>
                          <p className="text-sm font-semibold">
                            {moeda(linha.estornado)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] text-muted-foreground">
                            Total
                          </p>
                          <p className="text-sm font-semibold">
                            {moeda(linha.total)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {aba === "relatorios" && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div>
                  <h2 className="font-serif text-xl font-semibold">
                    Relatório financeiro
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Relatório dos pagamentos pagos, cancelados e estornados,
                    com filtro por curso.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="p-2">Curso</th>
                        <th className="p-2 text-right">Pagos</th>
                        <th className="p-2 text-right">Cancelados</th>
                        <th className="p-2 text-right">Estornados</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {resumoPorCurso.map((linha) => (
                        <tr
                          key={linha.curso}
                          className="border-b border-border/50"
                        >
                          <td className="p-2 font-medium">
                            {linha.curso}
                          </td>
                          <td className="p-2 text-right">
                            {moeda(linha.pago)}
                          </td>
                          <td className="p-2 text-right">
                            {moeda(linha.cancelado)}
                          </td>
                          <td className="p-2 text-right">
                            {moeda(linha.estornado)}
                          </td>
                          <td className="p-2 text-right font-semibold">
                            {moeda(linha.total)}
                          </td>
                        </tr>
                      ))}

                      {resumoPorCurso.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-4 text-center text-muted-foreground"
                          >
                            Nenhum dado para o relatório.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
