import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Check, Loader2, Plus, Save, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Livro = Tables<"livros">;

export const Route = createFileRoute("/_admin/admin/livros")({ component: AdminLivrosPage });

// Estes são os mesmos 10 livros que a Home apresenta quando ainda não existem registros no banco.
const LIVROS_HOME = [
  [1, "Mantenha Seu Amor Aceso", ""],
  [2, "Cultura da Honra", ""],
  [3, "Livro 3", ""],
  [4, "Livro 4", ""],
  [5, "Organize a Sua Desordem Mental", ""],
  [6, "O Despertar da Leoa", ""],
  [7, "Livro 7", ""],
  [8, "Os Caminhos Sobrenaturais da Realeza", ""],
  [9, "O Poder Sobrenatural de uma Mente Transformada", ""],
  [10, "Impunível", "Danny Silk"],
] as const;

const novoForm = { titulo: "", autor: "", ordem: 1, categoria: "Jornada", descricao: "", objetivo: "", publico_alvo: "", valor: null as number | null, vagas_total: null as number | null };

function AdminLivrosPage() {
  const qc = useQueryClient();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [form, setForm] = useState(novoForm);
  const [criando, setCriando] = useState(false);

  const { data: livros = [], isLoading, isError } = useQuery({
    queryKey: ["admin-livros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livros").select("*").order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Livro[];
    },
  });

  const porOrdem = useMemo(() => new Map(livros.map((l) => [Number(l.ordem), l])), [livros]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.titulo.trim()) throw new Error("Informe o nome do livro ou curso.");
      const payload = {
        titulo: form.titulo.trim(), autor: form.autor || null, ordem: Number(form.ordem) || 0,
        categoria: form.categoria || "Jornada", descricao: form.descricao || null, objetivo: form.objetivo || null,
        publico_alvo: form.publico_alvo || null, valor: form.valor, vagas_total: form.vagas_total,
      };
      if (selecionado) {
        const { error } = await supabase.from("livros").update(payload).eq("id", selecionado);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("livros").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(selecionado ? "Livro atualizado!" : "Livro cadastrado!"); fechar(); qc.invalidateQueries({ queryKey: ["admin-livros"] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const cadastrarHome = useMutation({
    mutationFn: async (base: typeof LIVROS_HOME[number]) => {
      if (porOrdem.has(base[0])) return;
      const { error } = await supabase.from("livros").insert({ titulo: base[1], autor: base[2] || null, ordem: base[0], categoria: "Jornada" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Livro da Home cadastrado!"); qc.invalidateQueries({ queryKey: ["admin-livros"] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao cadastrar livro."),
  });

  function editar(l: Livro) {
    setCriando(false); setSelecionado(l.id);
    setForm({ titulo: l.titulo ?? "", autor: l.autor ?? "", ordem: Number(l.ordem ?? 0), categoria: l.categoria ?? "Jornada", descricao: l.descricao ?? "", objetivo: l.objetivo ?? "", publico_alvo: l.publico_alvo ?? "", valor: l.valor == null ? null : Number(l.valor), vagas_total: l.vagas_total == null ? null : Number(l.vagas_total) });
  }
  function novoLivro() { setSelecionado(null); setCriando(true); setForm({ ...novoForm, ordem: livros.length + 1 }); }
  function fechar() { setSelecionado(null); setCriando(false); setForm(novoForm); }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Cadastro</p><h1 className="break-words font-serif text-2xl font-semibold sm:text-3xl">Livros e cursos</h1><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Aqui ficam os mesmos livros exibidos na Home. Cadastre os que ainda não estão no banco e depois edite as informações.</p></div>
        <Button className="w-full shrink-0 sm:w-auto" onClick={novoLivro}><Plus className="mr-2 h-4 w-4" /> Novo livro / curso</Button>
      </div>

      <Card className="min-w-0">
        <CardHeader><CardTitle className="text-lg">Livros da Home</CardTitle><p className="text-sm text-muted-foreground">A Home possui estes livros mesmo quando a tabela ainda está vazia. Use “Cadastrar” para transformar cada um em um registro administrável.</p></CardHeader>
        <CardContent className="grid min-w-0 gap-2 sm:grid-cols-2">
          {LIVROS_HOME.map(([ordem, titulo, autor]) => {
            const livro = porOrdem.get(ordem);
            return <div key={ordem} className="flex min-w-0 items-center gap-2 rounded-lg border p-2.5 sm:gap-3 sm:p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{ordem}</div>
              <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{livro?.titulo ?? titulo}</p>{(livro?.autor || autor) && <p className="break-words text-xs text-muted-foreground">{livro?.autor || autor}</p>}</div>
              {livro ? <Badge variant="secondary" className="shrink-0 text-[10px]"><Check className="mr-1 h-3 w-3" /> Cadastrado</Badge> : <Button size="sm" className="shrink-0" disabled={cadastrarHome.isPending} onClick={() => cadastrarHome.mutate([ordem, titulo, autor])}>Cadastrar</Button>}
            </div>;
          })}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <Card className="min-w-0"><CardHeader><CardTitle className="text-lg">Livros cadastrados ({livros.length})</CardTitle></CardHeader><CardContent className="space-y-2">
          {isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</p>}
          {isError && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">Erro ao carregar os livros.</p>}
          {!isLoading && !livros.length && <p className="text-sm text-muted-foreground">Nenhum livro cadastrado. Use os botões acima.</p>}
          {livros.map((l) => <button key={l.id} type="button" onClick={() => editar(l)} className={`flex w-full min-w-0 items-center gap-2 rounded-lg border p-3 text-left transition sm:gap-3 ${selecionado === l.id ? "border-primary bg-primary/10" : "hover:bg-secondary/60"}`}><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{l.ordem ?? "-"}</div><span className="min-w-0 flex-1 break-words text-sm font-medium">{l.titulo}</span><span className="shrink-0 text-xs text-muted-foreground">Editar</span></button>)}
        </CardContent></Card>

        <Card className="min-w-0"><CardHeader><CardTitle className="text-lg">{selecionado ? "Editar livro / curso" : criando ? "Cadastrar livro / curso" : "Selecione um livro"}</CardTitle></CardHeader><CardContent>
          {!selecionado && !criando ? <div className="flex min-h-56 flex-col items-center justify-center px-2 text-center text-muted-foreground"><BookOpen className="mb-3 h-10 w-10 opacity-40" /><p>Escolha um livro da lista ou use “Novo livro / curso”.</p></div> : <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Field label="Nome do livro / curso" className="sm:col-span-2"><Input className="w-full" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
              <Field label="Autor"><Input className="w-full" value={form.autor} onChange={(e) => setForm({ ...form, autor: e.target.value })} /></Field>
              <Field label="Ordem"><Input className="w-full" type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} /></Field>
              <Field label="Categoria"><Input className="w-full" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></Field>
              <Field label="Valor (R$)"><Input className="w-full" type="number" step="0.01" value={form.valor ?? ""} onChange={(e) => setForm({ ...form, valor: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Vagas"><Input className="w-full" type="number" value={form.vagas_total ?? ""} onChange={(e) => setForm({ ...form, vagas_total: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
            </div>
            <Field label="Descrição"><Textarea className="w-full" rows={4} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field>
            <Field label="Objetivo"><Textarea className="w-full" rows={3} value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></Field>
            <Field label="Público-alvo"><Textarea className="w-full" rows={3} value={form.publico_alvo} onChange={(e) => setForm({ ...form, publico_alvo: e.target.value })} /></Field>
            <div className="flex flex-col gap-2 sm:flex-row"><Button type="submit" disabled={salvar.isPending} className="w-full sm:w-auto"><Save className="mr-2 h-4 w-4" />{salvar.isPending ? "Salvando..." : "Salvar"}</Button><Button type="button" variant="outline" onClick={fechar} className="w-full sm:w-auto"><X className="mr-2 h-4 w-4" />Cancelar</Button></div>
          </form>}
        </CardContent></Card>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <div className={`min-w-0 space-y-1.5 ${className}`}><Label>{label}</Label>{children}</div>; }
