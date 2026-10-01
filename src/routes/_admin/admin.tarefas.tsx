import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Loader2, FileText, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/tarefas")({
  component: AdminTarefasPage,
});

const MAX = 5 * 1024 * 1024;

type Livro = { id: string; titulo: string };
type Tarefa = {
  id: string;
  livro_id: string;
  modulo: number;
  titulo: string;
  descricao: string | null;
  arquivo_nome: string | null;
  tamanho_bytes: number | null;
  mime_type: string | null;
  url: string;
  created_at: string;
};

function AdminTarefasPage() {
  const qc = useQueryClient();
  const [livroId, setLivroId] = useState("");
  const [filtroLivroId, setFiltroLivroId] = useState("");
  const [modulo, setModulo] = useState("1");
  const [titulo, setTitulo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  const livrosQ = useQuery({
    queryKey: ["admin-tarefas-livros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livros").select("id,titulo").order("ordem");
      if (error) throw error;
      return (data ?? []) as Livro[];
    },
  });

  const tarefasQ = useQuery({
    queryKey: ["admin-tarefas-todas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tarefas")
        .select("id,livro_id,modulo,titulo,descricao,arquivo_nome,tamanho_bytes,mime_type,url,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tarefa[];
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!livroId) throw new Error("Selecione o curso.");
      if (!modulo || Number(modulo) < 1) throw new Error("Informe um módulo válido.");
      if (!file) throw new Error("Selecione um PDF.");
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("A tarefa deve ser um arquivo PDF.");
      }
      if (file.size > MAX) throw new Error("O PDF deve ter no máximo 5 MB.");

      const path = `tarefas/${livroId}/modulo-${Number(modulo)}/${crypto.randomUUID()}.pdf`;
      const upload = await supabase.storage.from("book-materiais").upload(path, file, {
        upsert: false,
        contentType: "application/pdf",
      });
      if (upload.error) throw new Error(`Erro ao enviar PDF: ${upload.error.message}`);

      const { error } = await (supabase as any).from("tarefas").insert({
        livro_id: livroId,
        modulo: Number(modulo),
        titulo: titulo.trim() || file.name,
        arquivo_nome: file.name,
        tamanho_bytes: file.size,
        mime_type: "application/pdf",
        url: path,
      });

      if (error) {
        await supabase.storage.from("book-materiais").remove([path]);
        throw new Error(`Erro ao salvar tarefa: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success("Tarefa em PDF cadastrada.");
      setTitulo("");
      setFile(null);
      const input = document.getElementById("tarefa-file") as HTMLInputElement | null;
      if (input) input.value = "";
      qc.invalidateQueries({ queryKey: ["admin-tarefas-todas"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar a tarefa."),
  });

  async function abrir(t: Tarefa) {
    try {
      setAbrindo(t.id);
      const { data, error } = await supabase.storage.from("book-materiais").createSignedUrl(t.url, 300);
      if (error || !data?.signedUrl) throw new Error(error?.message || "Não foi possível gerar o acesso ao PDF.");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir a tarefa.");
    } finally {
      setAbrindo(null);
    }
  }

  const excluir = useMutation({
    mutationFn: async (t: Tarefa) => {
      const { error } = await (supabase as any).from("tarefas").delete().eq("id", t.id);
      if (error) throw error;
      if (t.url) await supabase.storage.from("book-materiais").remove([t.url]);
    },
    onSuccess: () => {
      toast.success("Tarefa removida.");
      qc.invalidateQueries({ queryKey: ["admin-tarefas-todas"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível remover."),
  });

  const tarefas = (tarefasQ.data ?? []).filter((t) => !filtroLivroId || t.livro_id === filtroLivroId);
  const nomeLivro = (id: string) => livrosQ.data?.find((l) => l.id === id)?.titulo ?? "Curso";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Tarefas</h1>
        <p className="text-sm text-muted-foreground">
          Suba as tarefas em PDF, como na aba Materiais. Limite de 5 MB por arquivo.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Adicionar tarefa em PDF</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Curso</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={livroId} onChange={(e) => setLivroId(e.target.value)}>
              <option value="">Selecione...</option>
              {(livrosQ.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.titulo}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Módulo</Label>
            <Input type="number" min={1} value={modulo} onChange={(e) => setModulo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Título da tarefa</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Tarefa do módulo 1" />
          </div>
          <div className="space-y-1.5">
            <Label>PDF (até 5 MB)</Label>
            <Input id="tarefa-file" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button onClick={() => enviar.mutate()} disabled={enviar.isPending} className="gap-2">
              {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {enviar.isPending ? "Enviando..." : "Subir tarefa"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Tarefas cadastradas</CardTitle>
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={filtroLivroId} onChange={(e) => setFiltroLivroId(e.target.value)}>
            <option value="">Todos os cursos</option>
            {(livrosQ.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.titulo}</option>)}
          </select>
        </CardHeader>
        <CardContent className="space-y-2">
          {tarefasQ.isLoading && <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando...</div>}
          {!tarefasQ.isLoading && tarefas.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>}
          {tarefas.map((t) => (
            <div key={t.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.titulo}</p>
                <p className="text-xs text-muted-foreground">{nomeLivro(t.livro_id)} · Módulo {t.modulo} · {t.arquivo_nome || "PDF"}{t.tamanho_bytes ? ` · ${(t.tamanho_bytes / 1024 / 1024).toFixed(2)} MB` : ""}</p>
              </div>
              <Badge variant="outline">Módulo {t.modulo}</Badge>
              <Button size="sm" variant="outline" disabled={abrindo === t.id} onClick={() => abrir(t)}>
                {abrindo === t.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Abrir
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { if (window.confirm(`Remover a tarefa "${t.titulo}"?`)) excluir.mutate(t); }} disabled={excluir.isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
