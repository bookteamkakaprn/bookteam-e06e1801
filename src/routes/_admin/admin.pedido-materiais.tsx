import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle2, Clock, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/pedido-materiais")({
  component: AdminPedidoMateriaisPage,
});

type Livro = { id: string; titulo: string };
type Aluno = { 
  id: string;
  nome: string;
  email: string;
  inscricao_id: string;
  inscricao_status: string;
};
type MaterialCompra = {
  id: string;
  livro_id: string;
  nome: string;
  descricao: string | null;
  quantidade: number;
};

function AdminPedidoMateriaisPage() {
  const qc = useQueryClient();
  const [filtroLivroId, setFiltroLivroId] = useState("");
  const [novoMaterialNome, setNovoMaterialNome] = useState("");
  const [novoMaterialDesc, setNovoMaterialDesc] = useState("");

  // Carregar livros/cursos
  const livrosQ = useQuery({
    queryKey: ["admin-pedidos-livros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("id, titulo")
        .eq("status", "ativo")
        .order("ordem");

      if (error) throw error;
      return (data || []) as Livro[];
    },
  });

  // Carregar alunos inscritos no curso selecionado
  const alunosQ = useQuery({
    queryKey: ["admin-pedidos-alunos", filtroLivroId],
    enabled: !!filtroLivroId,
    queryFn: async () => {
      if (!filtroLivroId) return [];

      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          `id, 
           participante_id,
           participantes(id, nome, email),
           status`
        )
        .eq("livro_id", filtroLivroId)
        .eq("status", "confirmada")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (
        data?.map((item: any) => ({
          id: item.participantes.id,
          nome: item.participantes.nome,
          email: item.participantes.email,
          inscricao_id: item.id,
          inscricao_status: item.status,
        })) || []
      );
    },
  });

  // Carregar materiais de compra do curso
  const materiaisQ = useQuery({
    queryKey: ["admin-pedidos-materiais", filtroLivroId],
    enabled: !!filtroLivroId,
    queryFn: async () => {
      if (!filtroLivroId) return [];

      const { data, error } = await supabase
        .from("materiais_compra")
        .select("id, livro_id, nome, descricao, quantidade")
        .eq("livro_id", filtroLivroId)
        .eq("ativo", true)
        .order("ordem");

      if (error) throw error;
      return (data || []) as MaterialCompra[];
    },
  });

  // Carregar pedidos dos alunos
  const pedidosQ = useQuery({
    queryKey: ["admin-pedidos-status", filtroLivroId],
    enabled: !!filtroLivroId,
    queryFn: async () => {
      if (!filtroLivroId) return [];

      const { data, error } = await supabase
        .from("pedidos_alunos")
        .select("id, inscricao_id, participante_id, status, data_entrega")
        .eq("livro_id", filtroLivroId);

      if (error) throw error;
      return data || [];
    },
  });

  // Adicionar novo material ao curso
  const adicionarMaterial = useMutation({
    mutationFn: async () => {
      if (!filtroLivroId || !novoMaterialNome.trim()) {
        throw new Error("Selecione um curso e informe o nome do material");
      }

      const { error } = await supabase
        .from("materiais_compra")
        .insert({
          livro_id: filtroLivroId,
          nome: novoMaterialNome.trim(),
          descricao: novoMaterialDesc.trim() || null,
          quantidade: 1,
          ordem: (materiaisQ.data?.length || 0) + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Material adicionado!");
      setNovoMaterialNome("");
      setNovoMaterialDesc("");
      qc.invalidateQueries({
        queryKey: ["admin-pedidos-materiais", filtroLivroId],
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar material");
    },
  });

  // Criar pedido para aluno
  const criarPedido = useMutation({
    mutationFn: async (aluno: Aluno) => {
      // Verifica se já existe pedido
      const { data: existente } = await supabase
        .from("pedidos_alunos")
        .select("id")
        .eq("inscricao_id", aluno.inscricao_id)
        .eq("livro_id", filtroLivroId)
        .single();

      if (existente) {
        throw new Error("Pedido já existe para este aluno");
      }

      const { error } = await supabase
        .from("pedidos_alunos")
        .insert({
          inscricao_id: aluno.inscricao_id,
          participante_id: aluno.id,
          livro_id: filtroLivroId,
          status: "pendente",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["admin-pedidos-status", filtroLivroId],
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido");
    },
  });

  // Marcar como entregue
  const marcarEntregue = useMutation({
    mutationFn: async (pedidoId: string) => {
      const { error } = await supabase
        .from("pedidos_alunos")
        .update({ status: "entregue", data_entrega: new Date().toISOString() })
        .eq("id", pedidoId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["admin-pedidos-status", filtroLivroId],
      });
      toast.success("Marcado como entregue!");
    },
  });

  // Deletar material
  const deletarMaterial = useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase
        .from("materiais_compra")
        .delete()
        .eq("id", materialId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["admin-pedidos-materiais", filtroLivroId],
      });
      toast.success("Material removido!");
    },
  });

  const getPedido = (inscricaoId: string) => {
    return (pedidosQ.data || []).find((p: any) => p.inscricao_id === inscricaoId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedido de Materiais</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os materiais que os alunos precisam comprar (livros, agendas, etc)
        </p>
      </div>

      {/* FILTRO POR CURSO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecionar Curso</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={filtroLivroId} onValueChange={setFiltroLivroId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um curso..." />
            </SelectTrigger>
            <SelectContent>
              {(livrosQ.data || []).map((livro) => (
                <SelectItem key={livro.id} value={livro.id}>
                  {livro.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtroLivroId && (
        <>
          {/* ADICIONAR NOVO MATERIAL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Material ao Curso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome do material</Label>
                  <Input
                    placeholder="Ex: Livro do Consórcio"
                    value={novoMaterialNome}
                    onChange={(e) => setNovoMaterialNome(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: Edição 2025"
                    value={novoMaterialDesc}
                    onChange={(e) => setNovoMaterialDesc(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="mt-4 gap-2"
                onClick={() => adicionarMaterial.mutate()}
                disabled={adicionarMaterial.isPending || !novoMaterialNome}
              >
                {adicionarMaterial.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Adicionar Material
              </Button>
            </CardContent>
          </Card>

          {/* MATERIAIS DO CURSO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Materiais de Compra ({materiaisQ.data?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {materiaisQ.isLoading ? (
                <div className="flex gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando materiais...
                </div>
              ) : materiaisQ.data?.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Nenhum material cadastrado para este curso.
                </p>
              ) : (
                <div className="space-y-2">
                  {materiaisQ.data?.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{mat.nome}</p>
                        {mat.descricao && (
                          <p className="text-xs text-muted-foreground">{mat.descricao}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="mr-3">
                        Qtd: {mat.quantidade}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletarMaterial.mutate(mat.id)}
                        disabled={deletarMaterial.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ALUNOS E PEDIDOS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Alunos Inscritos ({alunosQ.data?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alunosQ.isLoading ? (
                <div className="flex gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando alunos...
                </div>
              ) : alunosQ.data?.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Nenhum aluno inscrito neste curso.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alunosQ.data?.map((aluno) => {
                        const pedido = getPedido(aluno.inscricao_id);
                        return (
                          <TableRow key={aluno.id}>
                            <TableCell className="font-medium text-sm">
                              {aluno.nome}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {aluno.email}
                            </TableCell>
                            <TableCell className="text-center">
                              {!pedido ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Package className="h-3 w-3" />
                                  Sem pedido
                                </Badge>
                              ) : pedido.status === "entregue" ? (
                                <Badge variant="default" className="gap-1 bg-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Entregue
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {!pedido ? (
                                  <Button
                                    size="sm"
                                    onClick={() => criarPedido.mutate(aluno)}
                                    disabled={criarPedido.isPending}
                                  >
                                    Criar Pedido
                                  </Button>
                                ) : pedido.status === "pendente" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => marcarEntregue.mutate(pedido.id)}
                                    disabled={marcarEntregue.isPending}
                                    className="gap-1"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Marcar Entregue
                                  </Button>
                                ) : (
                                  <Badge variant="default" className="bg-green-600">
                                    ✓ Entregue
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
