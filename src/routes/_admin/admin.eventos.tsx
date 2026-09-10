import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/eventos")({
  component: AdminEventosPage,
});

type Categoria =
  | "Homens"
  | "Mulheres"
  | "Mulheres solteiras"
  | "Misto"
  | "Família"
  | "Ministério (Staff)";

type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: Categoria | null;
  data: string;
  hora: string | null;
  local: string | null;
  cidade: string | null;
  valor: number;
  vagas: number;
  livro_id: string | null;
  status: string;
};

const CATEGORIAS: Categoria[] = [
  "Homens",
  "Mulheres",
  "Mulheres solteiras",
  "Misto",
  "Família",
  "Ministério (Staff)",
];

function AdminEventosPage() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Partial<Evento> | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  const eventosQ = useQuery({
    queryKey: ["admin-eventos-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select(
          "id,titulo,descricao,categoria,data,hora,local,cidade,valor,vagas,livro_id,status",
        )
        .is("livro_id", null)
        .order("data")
        .order("hora");

      if (error) throw error;
      return (data ?? []) as Evento[];
    },
  });

  const eventos = eventosQ.data ?? [];

  const eventosFiltrados = eventos.filter(
    (evento) =>
      filtroCategoria === "todas" || evento.categoria === filtroCategoria,
  );

  const salvar = useMutation({
    mutationFn: async (evento: Partial<Evento>) => {
      if (!evento.titulo?.trim()) {
        throw new Error("Informe o título do encontro.");
      }

      if (!evento.data) {
        throw new Error("Informe a data do encontro.");
      }

      if (!evento.categoria) {
        throw new Error("Selecione a categoria.");
      }

      // Eventos desta tela nunca são vinculados a cursos.
      const payload = {
        titulo: evento.titulo.trim(),
        livro_id: null,
        categoria: evento.categoria,
        data: evento.data,
        hora: evento.hora || null,
        local: evento.local?.trim() || null,
        cidade: evento.cidade?.trim() || null,
        descricao: evento.descricao?.trim() || null,
        valor: Number(evento.valor ?? 0),
        vagas: Number(evento.vagas ?? 0),
      };

      const response = evento.id
        ? await supabase.from("eventos").update(payload).eq("id", evento.id)
        : await supabase.from("eventos").insert(payload);

      if (response.error) throw response.error;
    },
    onSuccess: () => {
      toast.success("Evento salvo!");
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["admin-eventos-todos"] });
      qc.invalidateQueries({ queryKey: ["admin-eventos"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível salvar o evento.",
      ),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento excluído.");
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["admin-eventos-todos"] });
      qc.invalidateQueries({ queryKey: ["admin-eventos"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível excluir o evento.",
      ),
  });

  const novoEvento = () => {
    const hoje = new Date();
    setEditando({
      titulo: "",
      data: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(hoje.getDate()).padStart(2, "0")}`,
      hora: "19:00",
      categoria: "Misto",
      valor: 0,
      vagas: 0,
      livro_id: null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Cadastro
          </p>
          <h1 className="font-serif text-2xl font-semibold">Eventos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cadastre, edite e exclua somente os eventos. O calendário geral fica
            em uma aba separada.
          </p>
        </div>

        <Button type="button" className="gap-2" onClick={novoEvento}>
          <Plus className="h-4 w-4" />
          Novo evento
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="filtro-categoria">Categoria</Label>
              <select
                id="filtro-categoria"
                className="h-10 min-w-[230px] rounded-md border border-input bg-background px-3 text-sm"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="todas">Todas as categorias</option>
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-muted-foreground">
              {eventosFiltrados.length}{" "}
              {eventosFiltrados.length === 1
                ? "evento cadastrado"
                : "eventos cadastrados"}
            </p>
          </div>
        </CardContent>
      </Card>

      {eventosQ.isLoading && (
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
          Carregando eventos...
        </p>
      )}

      {!eventosQ.isLoading && eventosFiltrados.length === 0 && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Nenhum evento encontrado.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {eventosFiltrados.map((evento) => (
          <Card key={evento.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-serif text-lg font-semibold">
                    {evento.titulo}
                  </p>

                  {evento.categoria && (
                    <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] font-semibold text-gold">
                      {evento.categoria}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(
                    `${evento.data}T00:00:00`,
                  ).toLocaleDateString("pt-BR")}
                  {evento.hora ? ` · ${evento.hora.slice(0, 5)}` : ""}
                  {evento.local ? ` · ${evento.local}` : ""}
                  {evento.cidade ? ` · ${evento.cidade}` : ""}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditando(evento)}
                >
                  Editar
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Excluir o evento "${evento.titulo}"?\n\nEssa ação não poderá ser desfeita.`,
                      )
                    ) {
                      excluir.mutate(evento.id);
                    }
                  }}
                  disabled={excluir.isPending}
                  title="Excluir evento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!editando}
        onOpenChange={(aberto) => !aberto && setEditando(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando?.id ? "Editar evento" : "Novo evento"}
            </DialogTitle>
          </DialogHeader>

          {editando && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                salvar.mutate(editando);
              }}
            >
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={editando.titulo ?? ""}
                  onChange={(e) =>
                    setEditando((estado) => ({
                      ...estado,
                      titulo: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={String(editando.categoria ?? "")}
                  onChange={(e) =>
                    setEditando((estado) => ({
                      ...estado,
                      categoria: (e.target.value || null) as Categoria | null,
                    }))
                  }
                >
                  <option value="">Selecione a categoria</option>
                  {CATEGORIAS.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editando.data ?? ""}
                    onChange={(e) =>
                      setEditando((estado) => ({
                        ...estado,
                        data: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={(editando.hora ?? "").slice(0, 5)}
                    onChange={(e) =>
                      setEditando((estado) => ({
                        ...estado,
                        hora: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Local</Label>
                  <Input
                    value={editando.local ?? ""}
                    onChange={(e) =>
                      setEditando((estado) => ({
                        ...estado,
                        local: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input
                    value={editando.cidade ?? ""}
                    onChange={(e) =>
                      setEditando((estado) => ({
                        ...estado,
                        cidade: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editando.valor ?? 0}
                    onChange={(e) =>
                      setEditando((estado) => ({
                        ...estado,
                        valor: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Vagas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editando.vagas ?? 0}
                    onChange={(e) =>
                      setEditando((estado) => ({
                        ...estado,
                        vagas: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <textarea
                  rows={5}
                  value={editando.descricao ?? ""}
                  onChange={(e) =>
                    setEditando((estado) => ({
                      ...estado,
                      descricao: e.target.value,
                    }))
                  }
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={salvar.isPending}
                  className="gap-2"
                >
                  {salvar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </Button>

                {editando.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Excluir o evento "${editando.titulo}"?\n\nEssa ação não poderá ser desfeita.`,
                        )
                      ) {
                        excluir.mutate(editando.id);
                      }
                    }}
                    disabled={excluir.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Excluir
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditando(null)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
