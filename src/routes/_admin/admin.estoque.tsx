import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/estoque")({
  component: AdminEstoquePage,
});

type Livro = { id: string; titulo: string; ordem: number };
type Estoque = { livro_id: string; quantidade: number; updated_at: string };
type Movimento = { id: string; livro_id: string; turma_id: string | null; quantidade: number; tipo: string; observacao: string | null; created_at: string };

function AdminEstoquePage() {
  const qc = useQueryClient();
  const [valores, setValores] = useState<Record<string, string>>({});

  const livrosQ = useQuery({
    queryKey: ["admin-estoque-livros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livros").select("id,titulo,ordem").order("ordem");
      if (error) throw error;
      return (data ?? []) as Livro[];
    },
  });

  const estoqueQ = useQuery({
    queryKey: ["admin-estoque"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("estoque_livraria").select("livro_id,quantidade,updated_at");
      if (error) throw error;
      return (data ?? []) as Estoque[];
    },
  });

  const movimentosQ = useQuery({
    queryKey: ["admin-movimentos-estoque"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("movimentos_estoque_livraria")
        .select("id,livro_id,turma_id,quantidade,tipo,observacao,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Movimento[];
    },
  });

  const salvar = useMutation({
    mutationFn: async ({ livroId, quantidade }: { livroId: string; quantidade: number }) => {
      if (!Number.isInteger(quantidade) || quantidade < 0) throw new Error("Informe uma quantidade inteira igual ou maior que zero.");
      const { error } = await (supabase as any).from("estoque_livraria").upsert(
        { livro_id: livroId, quantidade, updated_at: new Date().toISOString() },
        { onConflict: "livro_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estoque atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-estoque"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar estoque."),
  });

  const estoquePorLivro = new Map((estoqueQ.data ?? []).map((e) => [e.livro_id, e]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Estoque da livraria</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre e acompanhe a quantidade física disponível de cada livro. A baixa de entrega é feita manualmente em Pedido de materiais.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Estoque por curso / livro</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {livrosQ.isLoading && <div className="py-6 text-sm text-muted-foreground">Carregando livros...</div>}
          {(livrosQ.data ?? []).map((livro) => {
            const estoque = estoquePorLivro.get(livro.id);
            const valor = valores[livro.id] ?? String(estoque?.quantidade ?? 0);
            return (
              <div key={livro.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_150px_auto] sm:items-end">
                <div>
                  <p className="font-medium">{livro.ordem}. {livro.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    Atual: {estoque?.quantidade ?? 0} unidade(s)
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Quantidade física</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={valor}
                    onChange={(e) => setValores((v) => ({ ...v, [livro.id]: e.target.value }))}
                  />
                </div>
                <Button
                  className="gap-2"
                  onClick={() => salvar.mutate({ livroId: livro.id, quantidade: Number(valor) })}
                  disabled={salvar.isPending}
                >
                  {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Últimas baixas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(movimentosQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma baixa registrada.</p>}
          {(movimentosQ.data ?? []).map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{livrosQ.data?.find((l) => l.id === m.livro_id)?.titulo ?? "Livro"}</p>
                <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}{m.observacao ? ` · ${m.observacao}` : ""}</p>
              </div>
              <Badge variant="outline">-{m.quantidade} unidade(s)</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
