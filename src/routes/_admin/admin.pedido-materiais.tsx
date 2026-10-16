import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
type AlunoConfirmado = { id: string; livro_disponibilizado: boolean | null };

function AdminPedidoMateriaisPage() {
  const qc = useQueryClient();
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
      return (data ?? []) as unknown as AlunoConfirmado[];
    },
  });

  // Estoque físico do livro do curso. Sem linha cadastrada, considera zero.
  const estoqueQ = useQuery({
    queryKey: ["admin-pedido-materiais-estoque", livroId],
    enabled: !!livroId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("estoque_livraria")
        .select("quantidade")
        .eq("livro_id", livroId)
        .maybeSingle();
      if (error) throw error;
      return (data?.quantidade ?? 0) as number;
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
      return (data ?? []) as unknown as Material[];
    },
  });

  // Regra: cada aluno confirmado precisa de 1 livro do curso.
  const totalAlunos = alunosQ.data?.length ?? 0;
  const jaEntregues = alunosQ.data?.filter((a) => a.livro_disponibilizado === true).length ?? 0;
  const pendentes = totalAlunos - jaEntregues;
  const estoque = estoqueQ.data ?? 0;
  const sairDoEstoque = Math.min(pendentes, estoque);
  const aPedir = pendentes - sairDoEstoque;

  const nomeCurso = livrosQ.data?.find((l) => l.id === livroId)?.titulo ?? "Curso";

  const baixarEstoque = useMutation({
    mutationFn: async () => {
      if (!turmaSelecionada || !livroId) throw new Error("Selecione a turma.");
      if (sairDoEstoque <= 0) throw new Error("Não há livros do estoque para baixar.");

      const { data, error } = await supabase.rpc("baixar_estoque_livraria" as never, {
        p_livro_id: livroId,
        p_turma_id: turmaId,
        p_quantidade: sairDoEstoque,
        p_observacao: `Disponibilização manual de livros — ${turmaSelecionada.nome}`,
      } as never);

      if (error) throw error;
      return Number(data ?? sairDoEstoque);
    },
    onSuccess: (total) => {
      toast.success(`${total} livro(s) saíram do estoque e foram marcados como disponibilizados.`);
      qc.invalidateQueries({ queryKey: ["admin-pedido-materiais-alunos", turmaId] });
      qc.invalidateQueries({ queryKey: ["admin-pedido-materiais-estoque", livroId] });
      qc.invalidateQueries({ queryKey: ["admin-estoque"] });
      qc.invalidateQueries({ queryKey: ["admin-movimentos-estoque"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível baixar o estoque."),
  });

  const gerarPedido = () => {
    if (!turmaSelecionada) {
      toast.error("Selecione uma turma.");
      return;
    }
    if (totalAlunos === 0) {
      toast.error("Esta turma não possui alunos confirmados.");
      return;
    }
    if (aPedir === 0) {
      toast.info("O estoque cobre todos os pendentes. Não há o que pedir.");
      return;
    }
    window.print();
  };

  const carregando = alunosQ.isLoading || estoqueQ.isLoading;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">Pedido de Materiais</h1>
        <p className="text-sm text-muted-foreground">
          Cada aluno confirmado precisa de 1 livro do curso. O que o estoque cobre sai do estoque; o restante entra no pedido.
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
                  placeholder={turmasQ.isLoading ? "Carregando turmas..." : "Selecione a turma..."}
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
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-base">
                Resumo — {nomeCurso} · {turmaSelecionada.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Alunos confirmados</p>
                  <p className="mt-1 text-2xl font-bold">{carregando ? "..." : totalAlunos}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Já entregues</p>
                  <p className="mt-1 text-2xl font-bold">{carregando ? "..." : jaEntregues}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Em estoque</p>
                  <p className="mt-1 text-2xl font-bold">{estoqueQ.isLoading ? "..." : estoque}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="mt-1 text-2xl font-bold">{carregando ? "..." : pendentes}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="font-semibold">Sai do estoque: {sairDoEstoque}</p>
                  <p className="text-sm text-muted-foreground">
                    Dá baixa no estoque e marca esses alunos como entregues.
                  </p>
                  <Button
                    className="mt-3 gap-2"
                    onClick={() => {
                      if (window.confirm(`Dar baixa de ${sairDoEstoque} livro(s) do estoque para esta turma?`)) {
                        baixarEstoque.mutate();
                      }
                    }}
                    disabled={baixarEstoque.isPending || sairDoEstoque <= 0}
                  >
                    {baixarEstoque.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    {baixarEstoque.isPending ? "Baixando..." : `Dar baixa de ${sairDoEstoque} do estoque`}
                  </Button>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="font-semibold">Vai para o pedido: {aPedir}</p>
                  <p className="text-sm text-muted-foreground">
                    Quantidade que o estoque não cobre.
                  </p>
                  <Button className="mt-3 gap-2" onClick={gerarPedido} disabled={carregando || aPedir === 0}>
                    <Download className="h-4 w-4" />
                    Gerar / Imprimir pedido
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-base">Pedido de livros</CardTitle>
            </CardHeader>
            <CardContent>
              {carregando ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculando pedido...
                </div>
              ) : totalAlunos === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Esta turma ainda não possui alunos com inscrição confirmada.
                </div>
              ) : aPedir === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  O estoque cobre todos os pendentes. Não há o que pedir.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left">Livro</th>
                        <th className="px-4 py-3 text-center">Pendentes</th>
                        <th className="px-4 py-3 text-center">Do estoque</th>
                        <th className="px-4 py-3 text-center">Pedir</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-4 py-3 font-medium">{nomeCurso}</td>
                        <td className="px-4 py-3 text-center">{pendentes}</td>
                        <td className="px-4 py-3 text-center">{sairDoEstoque}</td>
                        <td className="px-4 py-3 text-center font-bold">{aPedir}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-base">Materiais digitais do curso</CardTitle>
            </CardHeader>
            <CardContent>
              {materiaisQ.isLoading ? (
                <div className="py-4 text-sm text-muted-foreground">Carregando materiais...</div>
              ) : (materiaisQ.data ?? []).length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum material cadastrado para este curso.
                </div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(materiaisQ.data ?? []).map((material) => (
                    <li key={material.id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3">
                      <span className="font-medium">{material.titulo}</span>
                      <span className="text-muted-foreground">
                        Módulo {material.modulo}
                        {material.arquivo_nome ? ` · ${material.arquivo_nome}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Materiais digitais não entram no pedido de livros.
              </p>
            </CardContent>
          </Card>

          <div className="hidden print:block">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Pedido de Livros</h1>
              <p className="mt-1">
                {nomeCurso} — {turmaSelecionada.nome}
              </p>
              <p className="mt-1">
                Alunos pendentes: <strong>{pendentes}</strong> · Do estoque: <strong>{sairDoEstoque}</strong>
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="border px-3 py-2 text-left">Livro</th>
                  <th className="border px-3 py-2 text-center">Quantidade a pedir</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2">{nomeCurso}</td>
                  <td className="border px-3 py-2 text-center font-bold">{aPedir}</td>
                </tr>
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
              O pedido é calculado pelos alunos confirmados e pelo estoque do livro.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
