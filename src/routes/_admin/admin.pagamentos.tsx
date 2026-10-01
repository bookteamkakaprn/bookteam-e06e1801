import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  CreditCard,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Controle de pagamentos — Admin — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminControlePagamentos,
});

type Pagamento = {
  id: string;
  valor: number;
  status: "aguardando" | "aprovado" | "rejeitado";
  created_at: string;
  evento_id: string | null;
  inscricao_id: string | null;
  inscricao?: {
    id: string;
    status: string;
    livro_id: string;
    livro?: { id: string; titulo: string | null } | null;
    participante?: { id: string; nome: string | null; email: string | null; data_nascimento: string | null } | null;
  } | null;
};

type Inscrito = {
  id: string;
  status: string;
  livro_id: string;
  participante_id: string;
  created_at: string;
  livro?: { id: string; titulo: string | null } | null;
  participante?: {
    id: string;
    nome: string | null;
    email: string | null;
    data_nascimento: string | null;
  } | null;
};

function moeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calcularIdade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null;
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade >= 0 ? idade : null;
}

function exportarParaExcel(dados: any[], nomeArquivo: string) {
  if (!dados.length) {
    toast.info("Não há dados para exportar.");
    return;
  }

  const csv = [
    Object.keys(dados[0]).join(","),
    ...dados.map((row) =>
      Object.values(row)
        .map((val) => `"${val}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${nomeArquivo}.csv`;
  link.click();
  toast.success("Exportado para Excel!");
}

function AdminControlePagamentos() {
  const [aba, setAba] = useState<"aprovados" | "rejeitados" | "estornados">("aprovados");
  const [cursoFilter, setCursoFilter] = useState("todos");
  const [buscaAluno, setBuscaAluno] = useState("");

  // Query Pagamentos
  // Usa o mesmo relacionamento já utilizado no módulo de aprovação,
  // garantindo que curso, aluno e valor do pagamento venham juntos.
  const pagamentosQ = useQuery({
    queryKey: ["admin-pagamentos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("admin_controle_pagamentos");

      if (error) {
        throw new Error(
          [error.code, error.message, error.details, error.hint]
            .filter(Boolean)
            .join(" | "),
        );
      }

      return ((data ?? []) as any[]).map((p) => ({
        id: p.id,
        valor: Number(p.valor ?? 0),
        status: p.status,
        created_at: p.created_at,
        evento_id: p.evento_id,
        inscricao_id: p.inscricao_id,
        inscricao: p.inscricao_id
          ? {
              id: p.inscricao_id,
              status: p.inscricao_status,
              livro_id: p.livro_id,
              livro: p.livro_id
                ? { id: p.livro_id, titulo: p.curso }
                : null,
              participante: p.participante_id
                ? {
                    id: p.participante_id,
                    nome: p.nome,
                    email: p.email,
                    data_nascimento: p.data_nascimento,
                  }
                : null,
            }
          : null,
      })) as Pagamento[];
    },
  });

  const pagamentos = pagamentosQ.data ?? [];

  // Filtrar pagamentos por status
  const pagamentosPorStatus = useMemo(() => {
    return {
      aprovados: pagamentos.filter((p) => p.status === "aprovado"),
      rejeitados: pagamentos.filter((p) => p.status === "rejeitado"),
      estornados: pagamentos.filter((p) => p.status === "aguardando"),
    };
  }, [pagamentos]);

  // Aplicar filtros
  const filtrados = useMemo(() => {
    let dados: any[] = [];

    if (aba === "aprovados") {
      dados = pagamentosPorStatus.aprovados;
    } else if (aba === "rejeitados") {
      dados = pagamentosPorStatus.rejeitados;
    } else if (aba === "estornados") {
      dados = pagamentosPorStatus.estornados;
    }

    return dados.filter((d) => {
      const curso = d.inscricao?.livro?.titulo;
      const nome = d.inscricao?.participante?.nome;

      const cursoOk = cursoFilter === "todos" || curso === cursoFilter;
      const buscaOk = !buscaAluno || nome?.toLowerCase().includes(buscaAluno.toLowerCase());

      return cursoOk && buscaOk;
    });
  }, [aba, pagamentosPorStatus, cursoFilter, buscaAluno]);

  // Opções de filtro
  const cursosOpcoes = useMemo(() => {
    const set = new Set<string>();
    pagamentos.forEach((p) => {
      const titulo = p.inscricao?.livro?.titulo;
      if (titulo) set.add(titulo);
    });
    return Array.from(set).sort();
  }, [pagamentos]);

  const resumo = useMemo(() => {
    const cursoSelecionado = cursoFilter !== "todos" ? cursoFilter : null;

    const pagamentosDoCurso = (lista: Pagamento[]) =>
      cursoSelecionado
        ? lista.filter((p) => p.inscricao?.livro?.titulo === cursoSelecionado)
        : lista;

    const aprovados = pagamentosDoCurso(pagamentosPorStatus.aprovados);
    const rejeitados = pagamentosDoCurso(pagamentosPorStatus.rejeitados);
    const estornados = pagamentosDoCurso(pagamentosPorStatus.estornados);
    return {
      aprovados: aprovados.reduce((s, p) => s + Number(p.valor ?? 0), 0),
      quantidadeAprovados: aprovados.length,
      rejeitados: rejeitados.length,
      estornados: estornados.length,
    };
  }, [pagamentosPorStatus, cursoFilter]);

  const handleExportar = () => {
    const dadosExportacao = filtrados.map((d) => ({
      Nome: d.inscricao?.participante?.nome,
      Email: d.inscricao?.participante?.email,
      Idade: calcularIdade(d.inscricao?.participante?.data_nascimento),
      Curso: d.inscricao?.livro?.titulo,
      Valor: moeda(Number(d.valor ?? 0)),
      Status: d.status,
      Data: new Date(d.created_at).toLocaleDateString("pt-BR"),
    }));

    exportarParaExcel(dadosExportacao, `${aba}-${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Controle de Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          Visualize pagamentos e exporte os dados financeiros
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Aprovados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{moeda(resumo.aprovados)}</p>
            <p className="text-xs text-muted-foreground">{resumo.quantidadeAprovados} pagamento(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Rejeitados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{resumo.rejeitados}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Estornados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{resumo.estornados}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pagamentos.length}</p>
            <p className="text-xs text-muted-foreground">registros no controle</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumo por curso */}
      {pagamentosPorStatus.aprovados.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total aprovado por curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(
              pagamentosPorStatus.aprovados.reduce((map, pagamento) => {
                const curso = pagamento.inscricao?.livro?.titulo || "Curso não identificado";
                map.set(curso, (map.get(curso) ?? 0) + Number(pagamento.valor ?? 0));
                return map;
              }, new Map<string, number>())
            )
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([curso, total]) => (
                <div key={curso} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{curso}</span>
                  <span className="font-semibold whitespace-nowrap">{moeda(total)}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Abas */}
      <Tabs value={aba} onValueChange={(v) => setAba(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
          <TabsTrigger value="rejeitados">Rejeitados</TabsTrigger>
          <TabsTrigger value="estornados">Estornados</TabsTrigger>
        </TabsList>

        {/* Filtros */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por nome do aluno..."
            value={buscaAluno}
            onChange={(e) => setBuscaAluno(e.target.value)}
            className="max-w-xs"
          />

          <Select value={cursoFilter} onValueChange={setCursoFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar por curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cursos</SelectItem>
              {cursosOpcoes.map((curso) => (
                <SelectItem key={curso} value={curso}>
                  {curso}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleExportar} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        {/* APROVADOS */}
        <TabsContent value="aprovados" className="space-y-4 mt-4">
          <div className="space-y-2">
            {filtrados.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  Nenhum pagamento aprovado
                </CardContent>
              </Card>
            ) : (
              filtrados.map((p: Pagamento) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">{p.inscricao?.participante?.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.inscricao?.participante?.email}
                        </p>
                        <p className="text-xs mt-1">
                          Idade: {calcularIdade(p.inscricao?.participante?.data_nascimento) ?? "N/A"}
                        </p>
                        <p className="text-sm mt-1 font-medium">{p.inscricao?.livro?.titulo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-500">{moeda(Number(p.valor ?? 0))}</p>
                        <Badge className="mt-2">Aprovado</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* REJEITADOS */}
        <TabsContent value="rejeitados" className="space-y-4 mt-4">
          <div className="space-y-2">
            {filtrados.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  Nenhum pagamento rejeitado
                </CardContent>
              </Card>
            ) : (
              filtrados.map((p: Pagamento) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">{p.inscricao?.participante?.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.inscricao?.participante?.email}
                        </p>
                        <p className="text-xs mt-1">
                          Idade: {calcularIdade(p.inscricao?.participante?.data_nascimento) ?? "N/A"}
                        </p>
                        <p className="text-sm mt-1 font-medium">{p.inscricao?.livro?.titulo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-500">{moeda(Number(p.valor ?? 0))}</p>
                        <Badge variant="destructive" className="mt-2">Rejeitado</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ESTORNADOS */}
        <TabsContent value="estornados" className="space-y-4 mt-4">
          <div className="space-y-2">
            {filtrados.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  Nenhum pagamento estornado
                </CardContent>
              </Card>
            ) : (
              filtrados.map((p: Pagamento) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">{p.inscricao?.participante?.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.inscricao?.participante?.email}
                        </p>
                        <p className="text-xs mt-1">
                          Idade: {calcularIdade(p.inscricao?.participante?.data_nascimento) ?? "N/A"}
                        </p>
                        <p className="text-sm mt-1 font-medium">{p.inscricao?.livro?.titulo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-yellow-500">{moeda(Number(p.valor ?? 0))}</p>
                        <Badge className="mt-2 bg-yellow-500">Estornado</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
