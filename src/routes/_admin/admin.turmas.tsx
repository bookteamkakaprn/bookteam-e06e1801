import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Turma = Tables<"turmas">;
type Livro = Pick<Tables<"livros">, "id" | "titulo" | "ordem">;

export const Route = createFileRoute("/_admin/admin/turmas")({
  component: AdminTurmasPage,
});

const CATEGORIAS = [
  "Homens",
  "Mulheres",
  "Mulheres solteiras",
  "Misto",
  "Família",
  "Ministério (Staff)",
] as const;

const campos: {
  key: keyof Turma;
  label: string;
  type?: "number" | "date";
}[] = [
  { key: "nome", label: "Nome da turma" },
  { key: "ano", label: "Ano", type: "number" },
  { key: "data_inicio", label: "Data início", type: "date" },
  { key: "data_fim", label: "Data fim", type: "date" },
  { key: "horario", label: "Horário" },
  { key: "staff", label: "Staff" },
  { key: "sala", label: "Sala" },
  { key: "valor", label: "Valor (R$)", type: "number" },
  { key: "vagas_max", label: "Vagas máximas", type: "number" },
];

function AdminTurmasPage() {
  const qc = useQueryClient();
  const [livroId, setLivroId] = useState<string>("");
  const [editando, setEditando] = useState<Partial<Turma> | null>(null);

  const { data: livros = [] } = useQuery({
    queryKey: ["admin-livros-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("id, titulo, ordem")
        .order("ordem");

      if (error) throw error;
      return data as Livro[];
    },
  });

  const livroAtual = livroId || livros[0]?.id || "";

  const { data: turmas = [], isLoading } = useQuery({
    queryKey: ["admin-turmas", livroAtual],
    enabled: !!livroAtual,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("*")
        .eq("livro_id", livroAtual)
        .order("created_at");

      if (error) throw error;
      return data as Turma[];
    },
  });

  const proximoNome = useMemo(
    () => `Turma ${String(turmas.length + 1).padStart(2, "0")}`,
    [turmas.length],
  );

  const novaTurma = () => {
    setEditando({
      nome: proximoNome,
      categoria: "Misto",
      vagas_max: 20,
    });
  };

  const salvar = useMutation({
    mutationFn: async (t: Partial<Turma>) => {
      const payload: Record<string, string | number | null> = {};

      // Salva somente os campos permitidos nesta tela.
      // Professor, coordenador e temporada ficam fora do cadastro de turma.
      const camposPermitidos: (keyof Turma)[] = [
        "nome",
        "ano",
        "categoria",
        "data_inicio",
        "data_fim",
        "horario",
        "staff",
        "sala",
        "valor",
        "vagas_max",
      ];

      for (const key of camposPermitidos) {
        const value = t[key];
        payload[String(key)] =
          value === "" ? null : (value as string | number | null);
      }

      payload.livro_id = livroAtual;

      if (t.id) {
        const { error } = await supabase
          .from("turmas")
          .update(payload as never)
          .eq("id", t.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("turmas")
          .insert(payload as never);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Turma salva");
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["admin-turmas", livroAtual] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("turmas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Turma removida");
      qc.invalidateQueries({ queryKey: ["admin-turmas", livroAtual] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao remover turma"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Turmas</h1>
          <p className="text-sm text-muted-foreground">
            Cada curso pode ter quantas turmas você quiser.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="livro">Curso</Label>
            <select
              id="livro"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={livroAtual}
              onChange={(e) => {
                setLivroId(e.target.value);
                setEditando(null);
              }}
            >
              {livros.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.ordem}. {l.titulo}
                </option>
              ))}
            </select>
          </div>

          <Button className="gap-2" onClick={novaTurma}>
            <Plus className="h-4 w-4" />
            Nova turma
          </Button>
        </div>
      </div>

      {editando && (
        <Card>
          <CardContent className="p-5">
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                salvar.mutate(editando);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {campos.map(({ key, label, type }) => (
                  <div key={String(key)} className="space-y-1.5">
                    <Label htmlFor={String(key)}>{label}</Label>
                    <Input
                      id={String(key)}
                      type={
                        type === "number"
                          ? "number"
                          : type === "date"
                            ? "date"
                            : "text"
                      }
                      step={key === "valor" ? "0.01" : undefined}
                      value={(editando[key] as string | number | null) ?? ""}
                      onChange={(e) =>
                        setEditando((t) => ({
                          ...t,
                          [key]:
                            type === "number"
                              ? e.target.value === ""
                                ? null
                                : Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}

                <div className="space-y-1.5">
                  <Label htmlFor="categoria">Categoria</Label>
                  <select
                    id="categoria"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={String(editando.categoria ?? "")}
                    onChange={(e) =>
                      setEditando((t) => ({
                        ...t,
                        categoria: e.target.value || null,
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
              </div>

              <div className="flex gap-2">
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
                  Salvar turma
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditando(null)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}

        {!isLoading && turmas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma turma cadastrada para este curso.
          </p>
        )}

        {turmas.map((t) => {
          const esgotada =
            t.vagas_max > 0 && (t.vagas_restantes ?? 0) <= 0;

          return (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-serif text-lg font-semibold">
                    {t.nome}
                    {esgotada && (
                      <Badge variant="destructive" className="ml-2">
                        Esgotado
                      </Badge>
                    )}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {[
                      t.categoria,
                      t.ano,
                      t.sala,
                      t.horario,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.inscritos}/{t.vagas_max} inscritos ·{" "}
                    {t.vagas_restantes} vagas restantes
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditando(t)}
                  >
                    Editar
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => excluir.mutate(t.id)}
                    disabled={excluir.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
