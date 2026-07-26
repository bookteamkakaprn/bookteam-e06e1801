import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { conclusaoValida, LIMITE_MESES } from "@/lib/prerequisito";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Meu histórico — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [livroId, setLivroId] = useState("");
  const [data, setData] = useState("");
  const [obs, setObs] = useState("");

  const hoje = new Date().toISOString().slice(0, 10);

  const livrosQ = useQuery({
    queryKey: ["livros-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livros").select("id, titulo, ordem").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  const histQ = useQuery({
    enabled: !!user,
    queryKey: ["meu-historico", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_livros")
        .select("id, data_conclusao, observacao, livro:livros(id, titulo, ordem)")
        .eq("participante_id", user!.id)
        .order("data_conclusao", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!livroId) throw new Error("Selecione o livro.");
      if (!data) throw new Error("Informe a data de conclusão.");
      if (data > hoje) throw new Error("A data precisa ser retroativa.");
      const { error } = await supabase.from("historico_livros").insert({
        participante_id: user!.id,
        livro_id: livroId,
        data_conclusao: data,
        observacao: obs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Livro registrado no seu histórico.");
      setLivroId("");
      setData("");
      setObs("");
      qc.invalidateQueries({ queryKey: ["meu-historico"] });
      qc.invalidateQueries({ queryKey: ["livro"] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("duplicate") ? "Este livro já está no seu histórico." : e.message),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("historico_livros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido.");
      qc.invalidateQueries({ queryKey: ["meu-historico"] });
      qc.invalidateQueries({ queryKey: ["livro"] });
    },
  });

  const registros = histQ.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Meu histórico</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Já leu um livro da trilha antes? Registre aqui com a data em que concluiu. A conclusão libera o próximo livro
          apenas se tiver ocorrido nos últimos {LIMITE_MESES / 12} ano. Depois desse prazo é necessário recomeçar a trilha.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Livro concluído</Label>
            <Select value={livroId} onValueChange={setLivroId}>
              <SelectTrigger><SelectValue placeholder="Selecione o livro" /></SelectTrigger>
              <SelectContent>
                {(livrosQ.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.ordem}. {l.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="data">Data de conclusão</Label>
            <Input id="data" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="obs">Observação (opcional)</Label>
            <Textarea id="obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Turma, professor, local…" />
          </div>
          <div className="md:col-span-2">
            <Button
              className="bg-gold text-primary-foreground hover:bg-gold/90"
              disabled={criar.isPending}
              onClick={() => criar.mutate()}
            >
              {criar.isPending ? "Salvando…" : "Registrar conclusão"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Livros registrados</h2>
        {histQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!histQ.isLoading && registros.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum livro registrado ainda.</p>
        )}
        {registros.map((r) => {
          const valido = conclusaoValida(r.data_conclusao);
          const livro = r.livro as unknown as { titulo: string; ordem: number } | null;
          return (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="font-serif text-lg font-semibold">
                    {livro ? `${livro.ordem}. ${livro.titulo}` : "Livro"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Concluído em {new Date(r.data_conclusao + "T00:00:00").toLocaleDateString("pt-BR")}
                    {r.observacao ? ` — ${r.observacao}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={valido ? "default" : "destructive"} className="inline-flex items-center gap-1">
                    {valido ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {valido ? "Válido" : "Vencido — refazer"}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={() => remover.mutate(r.id)} aria-label="Remover registro">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
