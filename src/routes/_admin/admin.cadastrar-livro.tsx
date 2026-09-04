import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BookOpen, ImagePlus, Loader2, Plus, Save, Users } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/cadastrar-livro")({ component: CadastrarLivroPage });

type Livro = { id: string; titulo: string; autor: string | null; imagem_url: string | null; descricao: string | null; categoria: string | null; trilha_id: string | null; ordem: number | null; status: string };
type Trilha = { id: string; nome: string };

function CadastrarLivroPage() {
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [autor, setAutor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [trilhaId, setTrilhaId] = useState("");
  const [ordem, setOrdem] = useState("1");
  const [capa, setCapa] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const { data: livros = [], isLoading } = useQuery({
    queryKey: ["admin-livros-home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livros").select("id,titulo,autor,imagem_url,descricao,categoria,trilha_id,ordem,status").order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Livro[];
    },
  });
  const { data: trilhas = [] } = useQuery({
    queryKey: ["admin-trilhas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trilhas").select("id,nome").order("nome");
      if (error) throw error;
      return (data ?? []) as Trilha[];
    },
  });

  const cadastrar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome do livro ou curso.");
      if (!trilhaId) throw new Error("Selecione uma trilha.");
      const { data: created, error } = await supabase.from("livros").insert({ titulo: nome.trim(), autor: autor.trim() || null, descricao: descricao.trim() || null, categoria: categoria.trim() || null, trilha_id: trilhaId, ordem: Number(ordem) || 1, status: "ativo" } as never).select("id").single();
      if (error) throw error;
      if (capa && created) {
        const ext = capa.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${created.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("capas").upload(path, capa, { upsert: true, contentType: capa.type });
        if (upErr) throw upErr;
        const { data: signed, error: signErr } = await supabase.storage.from("capas").createSignedUrl(path, 60 * 60 * 24 * 3650);
        if (signErr || !signed) throw signErr ?? new Error("Não foi possível gerar a capa.");
        const { error: imgErr } = await supabase.from("livros").update({ imagem_url: signed.signedUrl }).eq("id", created.id);
        if (imgErr) throw imgErr;
      }
    },
    onSuccess: () => { toast.success("Livro/curso cadastrado e disponível na Home."); qc.invalidateQueries({ queryKey: ["admin-livros-home"] }); qc.invalidateQueries({ queryKey: ["livros-disponiveis-aluno"] }); setNovo(false); setNome(""); setAutor(""); setDescricao(""); setCategoria(""); setTrilhaId(""); setOrdem("1"); setCapa(null); setPreview(""); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar."),
  });

  function escolherCapa(file: File | undefined) { if (!file) return; if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; } if (file.size > 5 * 1024 * 1024) { toast.error("A capa deve ter no máximo 5 MB."); return; } setCapa(file); setPreview(URL.createObjectURL(file)); }

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Área administrativa</p><h1 className="break-words font-serif text-2xl font-bold sm:text-3xl">Livros e cursos</h1><p className="mt-1 text-sm text-muted-foreground">Aqui aparecem os mesmos livros usados na Home. Cadastre novos livros, cursos e capas sem alterar o código.</p></div>
        <Button type="button" className="w-full shrink-0 sm:w-auto" onClick={() => setNovo((v) => !v)}><Plus className="mr-2 h-4 w-4" />Novo livro / curso</Button>
      </div>

      {novo && <Card><CardHeader><CardTitle className="font-serif">Cadastrar novo livro ou curso</CardTitle></CardHeader><CardContent className="grid gap-5 lg:grid-cols-[1fr_220px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nome do livro / curso *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: O poder da comunicação" /></div>
          <div><Label>Autor / responsável</Label><Input value={autor} onChange={(e) => setAutor(e.target.value)} /></div>
          <div><Label>Categoria</Label><Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Jornada ou complementar" /></div>
          <div><Label>Trilha *</Label><select value={trilhaId} onChange={(e) => setTrilhaId(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione a trilha</option>{trilhas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
          <div><Label>Ordem na Home</Label><Input type="number" min="1" value={ordem} onChange={(e) => setOrdem(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} /></div>
        </div>
        <div className="space-y-3"><Label>Capa</Label><label className="flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30 p-3 text-center hover:bg-secondary/50">{preview ? <img src={preview} alt="Prévia da capa" className="h-56 w-full rounded-lg object-cover" /> : <><ImagePlus className="h-10 w-10 text-muted-foreground" /><span className="mt-2 text-sm font-medium">Adicionar capa</span><span className="text-xs text-muted-foreground">JPG, PNG ou WebP · até 5 MB</span></>}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => escolherCapa(e.target.files?.[0])} /></label><Button className="w-full" onClick={() => cadastrar.mutate()} disabled={cadastrar.isPending}>{cadastrar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar livro / curso</Button></div>
      </CardContent></Card>}

      <Card><CardHeader><CardTitle className="flex items-center gap-2 font-serif"><BookOpen className="h-5 w-5 text-primary" />Livros que estão na Home <span className="text-sm font-normal text-muted-foreground">({livros.length})</span></CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : livros.map((l) => <div key={l.id} className="flex min-w-0 gap-3 rounded-xl border p-3"><div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">{l.imagem_url ? <img src={l.imagem_url} alt={l.titulo} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><BookOpen className="h-6 w-6 text-muted-foreground" /></div>}</div><div className="min-w-0"><p className="font-medium break-words">{l.titulo}</p><p className="text-xs text-muted-foreground">{l.autor || "Sem autor"}</p><p className="mt-1 text-xs text-muted-foreground">Ordem: {l.ordem ?? "-"}</p></div></div>)}</div></CardContent></Card>

      <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><Users className="h-5 w-5 shrink-0 text-primary" /><div><p className="font-medium">Turmas</p><p className="text-sm text-muted-foreground">Depois de cadastrar o livro, use a área Turmas para criar turmas e vincular cada turma ao livro/curso.</p></div><Button asChild variant="outline" className="sm:ml-auto"><a href="/admin/turmas">Gerenciar turmas</a></Button></CardContent></Card>
    </div>
  );
}
