import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Download, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/pedido-materiais")({
  component: AdminPedidoMateriaisPage,
});

type Livro = { id: string; titulo: string };
type Turma = {
  id: string;
  nome: string;
  livro_id: string;
  data_inicio: string | null;
  data_fim: string | null;
};
type Material = {
  id: string;
  livro_id: string;
  modulo: number;
  titulo: string;
  descricao: string | null;
  arquivo_nome: string | null;
};

function AdminPedidoMateriaisPage() {
  const [livroId, setLivroId] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const livrosQ = useQuery({
    queryKey: ["admin-pedido-materiais-livros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("id, titulo")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Livro[];
    },
  });

  const turmasQ = useQuery({
    queryKey: ["admin-pedido-materiais-turmas", livroId],
    enabled: !!livroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, livro_id, data_inicio, data_fim")
        .eq("livro_id", livroId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Turma[];
    },
  });

  const turmaSelecionada = useMemo(
    () => (turmasQ.data ?? []).find((turma) => turma.id === turmaId) ?? null,
    [turmasQ.data, turmaId],
  );

  const alunosQ = useQuery({
    queryKey: ["admin-pedido-materiais-alunos", turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("id,livro_disponibilizado")
        .eq("turma_id", turmaId)
        .eq("status", "confirmada");
      if (error) throw error;
      return data ?? [];
    },
  });

  const materiaisQ = useQuery({
    queryKey: ["admin-pedido-materiais-materiais", livroId],
    enabled: !!livroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materiais")
        .select("id, livro_id, modulo, titulo, descricao, arquivo_nome")
        .eq("livro_id", livroId)
        .order("modulo", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });

  const quantidadeAlunos = alunosQ.data?.length ?? 0;
  const quantidadePendentesLivro =
    alunosQ.data?.filter((item) => item.livro_disponibilizado !== true).length ?? 0;

  const baixarEstoque = useMutation({
    mutationFn: async () => {
      if (!turmaSelecionada || !livroId) throw new Error("Selecione a turma.");
      if (quantidadePendentesLivro === 0) {
        throw new Error("Todos os livros desta turma já foram disponibilizados.");
      }

      const { data, error } = await supabase.rpc("baixar_estoque_livraria" as never, {
        p_livro_id: livroId,
        p_turma_id: turmaId,
        p_quantidade: quantidadePendentesLivro,
        p_observacao: `Disponibilização manual de livros — ${turmaSelecionada.nome}`,
      } as never);

      if (error) throw error;
      return Number(data ?? quantidadePendentesLivro);
    },
    onSuccess: (total) => {
      toast.success(`${total} livro(s) baixado(s) do estoque e marcado(s) como disponibilizado(s).`);
      alunosQ.refetch();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível baixar o estoque."),
  });

  const gerarPedido = () => {
    if (!turmaSelecionada) {
      toast.error("Selecione uma turma.");
      return;
    }

    if (quantidadeAlunos === 0) {
      toast.error("Esta turma não possui alunos confirmados.");
      return;
    }

    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">Pedido de Materiais</h1>
        <p className="text-sm text-muted-foreground">
          Gere a quantidade de materiais necessária para cada turma com base nos alunos confirmados.
        </p>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Selecionar turma</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Curso / Livro</Label>
            <Select
              value={livroId}
              onValueChange={(value) => {
                setLivroId(value);
                setTurmaId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o curso..." />
              </SelectTrigger>
              <SelectContent>
                {(livrosQ.data ?? []).map((livro) => (
                  <SelectItem key={livro.id} value={livro.id}>
                    {livro.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Turma</Label>
            <Select
              value={turmaId}
              onValueChange={setTurmaId}
              disabled={!livroId || turmasQ.isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    turmasQ.isLoading
                      ? "Carregando turmas..."
                      : "Selecione a turma..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(turmasQ.data ?? []).map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {turmaSelecionada && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Pedido — {turmaSelecionada.nome}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Curso</p>
                  <p className="mt-1 font-medium">
                    {livrosQ.data?.find((l) => l.id === livroId)?.titulo ?? "Curso"}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Alunos confirmados
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {alunosQ.isLoading ? "..." : quantidadeAlunos}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Materiais cadastrados
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {materiaisQ.isLoading ? "..." : materiaisQ.data?.length ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Baixa manual do estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Alunos confirmados</p>
                  <p className="mt-1 text-2xl font-bold">{quantidadeAlunos}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Livros pendentes</p>
                  <p className="mt-1 text-2xl font-bold">{quantidadePendentesLivro}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Ação</p>
                  <p className="mt-1 text-sm font-medium">Somente manual</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                A entrada do aluno na turma não baixa o estoque automaticamente. A baixa acontece somente quando o ADM clicar abaixo.
              </p>
              <Button
                onClick={() => {
                  if (window.confirm(`Baixar ${quantidadePendentesLivro} livro(s) do estoque e marcar como disponibilizados para esta turma?`)) {
                    baixarEstoque.mutate();
                  }
                }}
                disabled={baixarEstoque.isPending || quantidadePendentesLivro === 0}
                className="gap-2"
              >
                {baixarEstoque.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                {baixarEstoque.isPending ? "Baixando..." : `Baixar ${quantidadePendentesLivro} livro(s) do estoque`}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Quantidade para compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alunosQ.isLoading || materiaisQ.isLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculando quantidade...
                </div>
              ) : materiaisQ.data?.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum material cadastrado para este curso.
                </div>
              ) : quantidadeAlunos === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Esta turma ainda não possui alunos com inscrição confirmada.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left">Material</th>
                          <th className="px-4 py-3 text-left">Descrição</th>
                          <th className="px-4 py-3 text-center">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(materiaisQ.data ?? []).map((material) => (
                          <tr key={material.id} className="border-t">
                            <td className="px-4 py-3 font-medium">
                              {material.titulo}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {material.descricao || material.arquivo_nome || "—"}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">
                              {quantidadeAlunos}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">Total de materiais</p>
                      <p className="text-sm text-muted-foreground">
                        {materiaisQ.data?.length ?? 0} tipos × {quantidadeAlunos} alunos
                      </p>
                    </div>
                    <p className="text-xl font-bold">
                      {(materiaisQ.data?.length ?? 0) * quantidadeAlunos} unidades
                    </p>
                  </div>

                  <div className="flex justify-end print:hidden">
                    <Button onClick={gerarPedido} className="gap-2">
                      <Download className="h-4 w-4" />
                      Gerar / Imprimir pedido
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="hidden print:block">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Pedido de Materiais</h1>
              <p className="mt-1">
                {livrosQ.data?.find((l) => l.id === livroId)?.titulo ?? "Curso"}
                {" — "}
                {turmaSelecionada.nome}
              </p>
              <p className="mt-1">
                Alunos confirmados: <strong>{quantidadeAlunos}</strong>
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="border px-3 py-2 text-left">Material</th>
                  <th className="border px-3 py-2 text-left">Descrição</th>
                  <th className="border px-3 py-2 text-center">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {(materiaisQ.data ?? []).map((material) => (
                  <tr key={material.id}>
                    <td className="border px-3 py-2">{material.titulo}</td>
                    <td className="border px-3 py-2">
                      {material.descricao || material.arquivo_nome || "—"}
                    </td>
                    <td className="border px-3 py-2 text-center font-bold">
                      {quantidadeAlunos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!turmaId && (
        <Card className="print:hidden">
          <CardContent className="flex min-h-40 flex-col items-center justify-center text-center">
            <Package className="mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-medium">Selecione o curso e a turma</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A quantidade será calculada automaticamente pelos alunos confirmados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
