import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Loader2, Save, Upload } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Livro = Tables<"livros">;

export const Route = createFileRoute("/_admin/admin/livros")({
  component: AdminLivrosPage,
});

const textFields: { key: keyof Livro; label: string; type?: "number" }[] = [
  { key: "titulo", label: "Nome" },
  { key: "ordem", label: "Ordem da trilha", type: "number" },
  { key: "categoria", label: "Categoria" },
  { key: "autor", label: "Autor" },
  { key: "qtd_encontros", label: "Quantidade de encontros", type: "number" },
  { key: "duracao", label: "Duração" },
  { key: "professor", label: "Professor responsável" },
  { key: "coordenador", label: "Coordenador" },
  { key: "ano", label: "Ano", type: "number" },
  { key: "turma", label: "Turma" },
  { key: "datas_curso", label: "Datas do curso" },
  { key: "horario", label: "Horário" },
  { key: "sala", label: "Sala" },
  { key: "valor", label: "Valor (R$)", type: "number" },
  { key: "vagas_total", label: "Quantidade de vagas", type: "number" },
];

const longFields: { key: keyof Livro; label: string }[] = [
  { key: "descricao", label: "Descrição" },
  { key: "objetivo", label: "Objetivo" },
  { key: "publico_alvo", label: "Público-alvo" },
  { key: "conteudo_programatico", label: "Conteúdo programático" },
  { key: "competencias", label: "Competências desenvolvidas" },
  { key: "material_necessario", label: "Material necessário" },
];

function AdminLivrosPage() {
  const qc = useQueryClient();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Livro>>({});
  const [enviandoCapa, setEnviandoCapa] = useState(false);

  const { data: livros = [], isLoading } = useQuery({
    queryKey: ["admin-livros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livros").select("*").order("ordem");
      if (error) throw error;
      return data as Livro[];
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!selecionado) return;
      const payload: Record<string, string | number | null> = {};
      for (const [k, v] of Object.entries(form)) {
        if (k === "id" || k === "vagas_restantes" || k === "created_at" || k === "updated_at") continue;
        payload[k] = v === "" ? null : (v as string | number | null);
      }
      const { error } = await supabase
        .from("livros")
        .update(payload as never)
        .eq("id", selecionado);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Livro atualizado");
      qc.invalidateQueries({ queryKey: ["admin-livros"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  function abrir(livro: Livro) {
    setSelecionado(livro.id);
    setForm(livro);
  }

  function set(key: keyof Livro, value: string, numeric?: boolean) {
    setForm((f) => ({ ...f, [key]: numeric ? (value === "" ? null : Number(value)) : value }));
  }

  async function enviarCapa(file: File) {
    if (!selecionado) return;
    const tiposOk = ["image/jpeg", "image/png", "image/webp"];
    if (!tiposOk.includes(file.type)) {
      toast.error("Envie um arquivo JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setEnviandoCapa(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${selecionado}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("capas")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("capas")
        .createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (signErr || !signed) throw signErr ?? new Error("Não foi possível gerar o link da imagem.");
      setForm((f) => ({ ...f, imagem_url: signed.signedUrl }));
      const { error: updErr } = await supabase
        .from("livros")
        .update({ imagem_url: signed.signedUrl })
        .eq("id", selecionado);
      if (updErr) throw updErr;
      qc.invalidateQueries({ queryKey: ["admin-livros"] });
      toast.success("Capa atualizada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a imagem");
    } finally {
      setEnviandoCapa(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Livros</h1>
        <p className="text-sm text-muted-foreground">
          Todo o conteúdo exibido na página do livro é editado aqui — nada fica fixo no código.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {livros.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => abrir(l)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                selecionado === l.id ? "border-primary bg-secondary" : "border-border hover:bg-secondary/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{l.ordem}. {l.titulo}</span>
                {(l.vagas_total ?? 0) > 0 && (l.vagas_restantes ?? 0) <= 0 && (
                  <Badge variant="destructive" className="shrink-0 text-[10px]">Esgotada</Badge>
                )}
              </span>
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-5">
            {!selecionado ? (
              <p className="text-sm text-muted-foreground">Selecione um livro para editar.</p>
            ) : (
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  salvar.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {textFields.map(({ key, label, type }) => (
                    <div key={String(key)} className="space-y-1.5">
                      <Label htmlFor={String(key)}>{label}</Label>
                      <Input
                        id={String(key)}
                        type={type === "number" ? "number" : "text"}
                        step={key === "valor" ? "0.01" : undefined}
                        value={(form[key] as string | number | null) ?? ""}
                        onChange={(e) => set(key, e.target.value, type === "number")}
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label>Inscritos (automático)</Label>
                    <Input value={form.inscritos ?? 0} readOnly disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vagas restantes (automático)</Label>
                    <Input value={form.vagas_restantes ?? 0} readOnly disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capa-upload">Imagem da capa (JPEG ou PNG)</Label>
                  <div className="flex flex-wrap items-center gap-4">
                    {form.imagem_url ? (
                      <img
                        src={form.imagem_url}
                        alt={`Capa do livro ${form.titulo ?? ""}`}
                        className="h-32 w-24 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-32 w-24 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                        Sem capa
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <input
                        id="capa-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void enviarCapa(file);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={enviandoCapa}
                        onClick={() => document.getElementById("capa-upload")?.click()}
                        className="gap-2"
                      >
                        {enviandoCapa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Enviar imagem
                      </Button>
                      <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP, até 5 MB.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {longFields.map(({ key, label }) => (
                    <div key={String(key)} className="space-y-1.5">
                      <Label htmlFor={String(key)}>{label}</Label>
                      <Textarea
                        id={String(key)}
                        rows={key === "conteudo_programatico" ? 8 : 4}
                        value={(form[key] as string | null) ?? ""}
                        onChange={(e) => set(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <Button type="submit" disabled={salvar.isPending} className="gap-2">
                  {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar alterações
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}