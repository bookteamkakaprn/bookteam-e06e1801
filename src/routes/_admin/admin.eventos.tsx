import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Evento = Tables<"eventos">;
type LivroMin = Pick<Tables<"livros">, "id" | "titulo" | "ordem">;

export const Route = createFileRoute("/_admin/admin/eventos")({
  head: () => ({ meta: [{ title: "Calendário de encontros — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminEventosPage,
});

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function AdminEventosPage() {
  const qc = useQueryClient();
  const hoje = new Date();
  const [mes, setMes] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [editando, setEditando] = useState<Partial<Evento> | null>(null);

  const inicioMes = iso(new Date(mes.getFullYear(), mes.getMonth(), 1));
  const fimMes = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));

  const { data: livros = [] } = useQuery({
    queryKey: ["admin-livros-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livros").select("id, titulo, ordem").order("ordem");
      if (error) throw error;
      return data as LivroMin[];
    },
  });

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["admin-eventos", inicioMes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .gte("data", inicioMes)
        .lte("data", fimMes)
        .order("data");
      if (error) throw error;
      return data as Evento[];
    },
  });

  const porDia = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    for (const e of eventos) (map[e.data] ??= []).push(e);
    return map;
  }, [eventos]);

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const vazios = primeiro.getDay();
    return [
      ...Array.from({ length: vazios }, () => null),
      ...Array.from({ length: totalDias }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1)),
    ];
  }, [mes]);

  const salvar = useMutation({
    mutationFn: async (e: Partial<Evento>) => {
      if (!e.titulo) throw new Error("Informe o título do encontro");
      if (!e.data) throw new Error("Informe a data do encontro");
      const payload = {
        titulo: e.titulo,
        livro_id: e.livro_id || null,
        data: e.data,
        hora: e.hora || null,
        local: e.local || null,
        cidade: e.cidade || null,
        descricao: e.descricao || null,
        valor: Number(e.valor ?? 0),
        vagas: Number(e.vagas ?? 0),
      };
      if (e.id) {
        const { error } = await supabase.from("eventos").update(payload).eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("eventos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Encontro salvo");
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["admin-eventos", inicioMes] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Encontro removido");
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["admin-eventos", inicioMes] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Calendário de encontros</h1>
          <p className="text-sm text-muted-foreground">Clique em um dia para criar ou editar um encontro.</p>
        </div>
        <Button className="gap-2" onClick={() => setEditando({ data: iso(hoje), valor: 0, vagas: 0 })}>
          <Plus className="h-4 w-4" /> Novo encontro
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Mês anterior"
              onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="font-serif text-lg font-semibold">
              {MESES[mes.getMonth()]} {mes.getFullYear()}
            </p>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Próximo mês"
              onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading && <p className="mb-2 text-sm text-muted-foreground">Carregando…</p>}

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted-foreground">
            {DIAS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((d, i) => {
              if (!d) return <div key={`v${i}`} className="min-h-20 rounded-md" />;
              const key = iso(d);
              const doDia = porDia[key] ?? [];
              const isHoje = key === iso(hoje);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEditando({ data: key, valor: 0, vagas: 0 })}
                  className={`min-h-20 rounded-md border p-1 text-left transition-colors hover:bg-secondary ${
                    isHoje ? "border-primary" : "border-border"
                  }`}
                >
                  <span className="text-xs font-semibold text-muted-foreground">{d.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {doDia.map((e) => (
                      <span
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setEditando(e);
                        }}
                        className="block truncate rounded bg-primary px-1 py-0.5 text-[11px] text-primary-foreground"
                      >
                        {e.hora ? `${e.hora.slice(0, 5)} ` : ""}
                        {e.titulo}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{editando?.id ? "Editar encontro" : "Novo encontro"}</DialogTitle>
          </DialogHeader>
          {editando && (
            <form
              className="space-y-4"
              onSubmit={(ev) => {
                ev.preventDefault();
                salvar.mutate(editando);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={editando.titulo ?? ""}
                  onChange={(e) => setEditando((s) => ({ ...s, titulo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="livro">Livro</Label>
                <select
                  id="livro"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editando.livro_id ?? ""}
                  onChange={(e) => setEditando((s) => ({ ...s, livro_id: e.target.value || null }))}
                >
                  <option value="">— sem livro —</option>
                  {livros.map((l) => (
                    <option key={l.id} value={l.id}>{l.ordem}. {l.titulo}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={editando.data ?? ""}
                    onChange={(e) => setEditando((s) => ({ ...s, data: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hora">Horário</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={(editando.hora ?? "").slice(0, 5)}
                    onChange={(e) => setEditando((s) => ({ ...s, hora: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="local">Local / Sala</Label>
                  <Input
                    id="local"
                    value={editando.local ?? ""}
                    onChange={(e) => setEditando((s) => ({ ...s, local: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={editando.cidade ?? ""}
                    onChange={(e) => setEditando((s) => ({ ...s, cidade: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={editando.valor ?? 0}
                    onChange={(e) => setEditando((s) => ({ ...s, valor: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vagas">Vagas</Label>
                  <Input
                    id="vagas"
                    type="number"
                    value={editando.vagas ?? 0}
                    onChange={(e) => setEditando((s) => ({ ...s, vagas: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={salvar.isPending} className="gap-2">
                  {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
                {editando.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => excluir.mutate(editando.id!)}
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </Button>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
