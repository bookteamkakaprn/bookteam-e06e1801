import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({
    meta: [{ title: "Tarefas — Book Team" }, { name: "robots", content: "noindex" }],
  }),
  component: TarefasPage,
});

type Tarefa = {
  id: string;
  livro_id: string;
  modulo: number;
  titulo: string;
  descricao: string | null;
  arquivo_nome: string | null;
  tamanho_bytes: number | null;
  url: string;
};
type Livro = { id: string; titulo: string };

function TarefasPage() {
  const { user } = useAuth();
  const [abrindo, setAbrindo] = useState<string | null>(null);

  const q = useQuery({
    enabled: !!user,
    queryKey: ["minhas-tarefas", user?.id],
    queryFn: async () => {
      const { data: ins, error: insError } = await supabase
        .from("inscricoes")
        .select("livro_id, livros(id,titulo)")
        .eq("participante_id", user!.id)
        .eq("status", "confirmada");

      if (insError) throw new Error(`Erro ao carregar seus cursos: ${insError.message}`);

      const livros = [...new Map(
        ((ins ?? []) as any[])
          .filter((i) => i.livro_id && i.livros)
          .map((i) => [i.livros.id, i.livros as Livro]),
      ).values()];

      const ids = [...new Set(livros.map((l) => l.id))];
      if (!ids.length) return { tarefas: [] as Tarefa[], livros };

      const { data: tarefas, error: tarefasError } = await (supabase as any)
        .from("tarefas")
        .select("id,livro_id,modulo,titulo,descricao,arquivo_nome,tamanho_bytes,url")
        .in("livro_id", ids)
        .order("livro_id")
        .order("modulo")
        .order("created_at");

      if (tarefasError) throw new Error(`Erro ao carregar tarefas: ${tarefasError.message}`);
      return { tarefas: (tarefas ?? []) as Tarefa[], livros };
    },
  });

  async function abrir(tarefa: Tarefa) {
    try {
      setAbrindo(tarefa.id);
      const { data, error } = await supabase.storage.from("book-materiais").createSignedUrl(tarefa.url, 300);
      if (error || !data?.signedUrl) throw new Error(error?.message || "Não foi possível abrir o PDF.");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir a tarefa.");
    } finally {
      setAbrindo(null);
    }
  }

  const tarefas = q.data?.tarefas ?? [];
  const livros = q.data?.livros ?? [];

  const groups = new Map<string, Tarefa[]>();
  for (const tarefa of tarefas) groups.set(tarefa.livro_id, [...(groups.get(tarefa.livro_id) ?? []), tarefa]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Área do aluno</p>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Tarefas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesse as tarefas em PDF disponibilizadas para seus cursos.</p>
      </div>

      {q.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando tarefas...</div>}

      {!q.isLoading && !q.error && groups.size === 0 && (
        <Card><CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
          <FolderOpen className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhuma tarefa disponível</p>
          <p className="mt-1 text-sm text-muted-foreground">As tarefas aparecerão aqui quando o ADM disponibilizar.</p>
        </CardContent></Card>
      )}

      {[...groups.entries()].map(([livroId, items]) => {
        const livro = livros.find((l) => l.id === livroId);
        const modulos = new Map<number, Tarefa[]>();
        for (const tarefa of items) modulos.set(tarefa.modulo, [...(modulos.get(tarefa.modulo) ?? []), tarefa]);

        return (
          <Card key={livroId}>
            <CardHeader><CardTitle className="text-lg">{livro?.titulo ?? "Curso"}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {[...modulos.entries()].sort(([a], [b]) => a - b).map(([modulo, lista]) => (
                <section key={modulo} className="space-y-2">
                  <Badge>Módulo {modulo}</Badge>
                  {lista.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <FileText className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.titulo}</p>
                        <p className="text-xs text-muted-foreground">{t.arquivo_nome || "PDF"}{t.tamanho_bytes ? ` · ${(t.tamanho_bytes / 1024 / 1024).toFixed(2)} MB` : ""}</p>
                      </div>
                      <Button size="sm" variant="outline" disabled={abrindo === t.id} onClick={() => abrir(t)}>
                        {abrindo === t.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Abrir
                      </Button>
                    </div>
                  ))}
                </section>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
