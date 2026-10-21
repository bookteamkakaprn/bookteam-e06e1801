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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CORTE_DECLARACAO, DATA_MAXIMA_DECLARACAO, PERCENTUAL_CONCLUSAO } from "@/lib/prerequisito";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Meu histórico — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [livroId, setLivroId] = useState("");
  const [data, setData] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const dataMax = hoje < DATA_MAXIMA_DECLARACAO ? hoje : DATA_MAXIMA_DECLARACAO;

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
        .select("id, data_conclusao, origem, livro_id")
        .eq("participante_id", user!.id)
        .order("data_conclusao", { ascending: false });
      
      if (error) throw error;
      
      // Buscar dados dos livros separadamente
      if (data && data.length > 0) {
        const livroIds = [...new Set(data.map(h => h.livro_id))];
        const { data: livros } = await supabase
          .from("livros")
          .select("id, titulo, ordem")
          .in("id", livroIds);
        
        return data.map(h => ({
          ...h,
          livro: livros?.find(l => l.id === h.livro_id)
        }));
      }
      
      return data ?? [];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!livroId) throw new Error("Selecione o livro.");
      if (!data) throw new Error("Informe a data de conclusão.");
      if (data > dataMax) {
        throw new Error(`Só é possível declarar conclusões até ${new Date(DATA_MAXIMA_DECLARACAO + "T00:00:00").toLocaleDateString("pt-BR")}.`);
      }
      const { error } = await supabase.from("historico_livros").insert({
        participante_id: user!.id,
        livro_id: livroId,
        data_conclusao: data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Livro registrado no seu histórico.");
      setLivroId("");
      setData("");
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
          Registre aqui os livros da Jornada que você já concluiu, informando a data e o nome do curso. Cada curso só
          libera o próximo depois de concluído. Conclusões a partir de{" "}
          {new Date(CORTE_DECLARACAO + "T00:00:00").toLocaleDateString("pt-BR")} são registradas automaticamente quando
          a presença chegar a {PERCENTUAL_CONCLUSAO}% dos encontros da turma.
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
            <Input id="data" type="date" max={dataMax} value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button
              className="bg-gold text-primary-foreground hover:bg-gold/90"
              disabled={criar.isPending}
              onClick={() => criar.mutate()}
            >
              {criar.isPending ? "Salvando..." : "Registrar conclusão"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Livros registrados</h2>
        {histQ.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!histQ.isLoading && registros.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum livro registrado ainda.</p>
        )}
        {registros.map((r) => {
          const porPresenca = (r as { origem?: string }).origem === "presenca";
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
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {porPresenca ? "Por presença" : "Declarado"}
                  </Badge>
                  {!porPresenca && (
                    <Button size="icon" variant="ghost" onClick={() => remover.mutate(r.id)} aria-label="Remover registro">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
