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
import {
  BookOpen,
  Loader2,
  Save,
  Upload,
  ImageIcon,
  CalendarDays,
  BookMarked,
  User,
  Clock,
  MapPin,
  Users,
  RotateCcw,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Livro = Tables<"livros">;

export const Route = createFileRoute("/_admin/admin/livros")({
  component: AdminLivrosPage,
});

/* =========================================================
   CAMPOS EDITÁVEIS
   ========================================================= */

const textFields: {
  key: keyof Livro;
  label: string;
  type?: "number";
  placeholder?: string;
}[] = [
  {
    key: "titulo",
    label: "Nome do livro / curso",
    placeholder: "Digite o nome do livro",
  },
  {
    key: "ordem",
    label: "Ordem da jornada",
    type: "number",
    placeholder: "Ex.: 1",
  },
  {
    key: "categoria",
    label: "Categoria",
    placeholder: "Jornada ou Complementar",
  },
  {
    key: "autor",
    label: "Autor",
    placeholder: "Nome do autor",
  },
  {
    key: "qtd_encontros",
    label: "Quantidade de encontros",
    type: "number",
    placeholder: "Ex.: 2",
  },
  {
    key: "duracao",
    label: "Duração",
    placeholder: "Ex.: 2 dias",
  },
  {
    key: "professor",
    label: "Professor responsável",
    placeholder: "Nome do professor",
  },
  {
    key: "coordenador",
    label: "Coordenador",
    placeholder: "Nome do coordenador",
  },
  {
    key: "ano",
    label: "Ano",
    type: "number",
    placeholder: "Ex.: 2026",
  },
  {
    key: "turma",
    label: "Turma",
    placeholder: "Ex.: Turma 10",
  },
  {
    key: "datas_curso",
    label: "Data / período do curso",
    placeholder: "Ex.: 03 e 04 de novembro de 2026",
  },
  {
    key: "horario",
    label: "Horário",
    placeholder: "Ex.: 19h às 22h",
  },
  {
    key: "sala",
    label: "Sala / local",
    placeholder: "Ex.: Sala Principal",
  },
  {
    key: "valor",
    label: "Valor (R$)",
    type: "number",
    placeholder: "Ex.: 197",
  },
  {
    key: "vagas_total",
    label: "Quantidade de vagas",
    type: "number",
    placeholder: "Ex.: 30",
  },
];

const longFields: {
  key: keyof Livro;
  label: string;
  placeholder?: string;
}[] = [
  {
    key: "descricao",
    label: "Descrição",
    placeholder: "Descrição que aparecerá para os participantes.",
  },
  {
    key: "objetivo",
    label: "Objetivo",
    placeholder: "Qual é o objetivo deste livro / curso?",
  },
  {
    key: "publico_alvo",
    label: "Público-alvo",
    placeholder: "Para quem este livro / curso é indicado?",
  },
  {
    key: "conteudo_programatico",
    label: "Conteúdo programático",
    placeholder: "Digite o conteúdo programático.",
  },
  {
    key: "competencias",
    label: "Competências desenvolvidas",
    placeholder: "Quais competências serão desenvolvidas?",
  },
  {
    key: "material_necessario",
    label: "Material necessário",
    placeholder: "Informe os materiais necessários.",
  },
];

/* =========================================================
   PÁGINA ADMINISTRATIVA
   ========================================================= */

function AdminLivrosPage() {
  const qc = useQueryClient();

  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Livro>>({});
  const [enviandoCapa, setEnviandoCapa] = useState(false);

  /* =======================================================
     CARREGAR LIVROS
     ======================================================= */

  const {
    data: livros = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-livros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("*")
        .order("ordem");

      if (error) throw error;

      return data as Livro[];
    },
  });

  /* =======================================================
     SALVAR ALTERAÇÕES
     ======================================================= */

  const salvar = useMutation({
    mutationFn: async () => {
      if (!selecionado) {
        throw new Error("Nenhum livro selecionado.");
      }

      const payload: Record<string, string | number | null> = {};

      for (const [k, v] of Object.entries(form)) {
        /*
         * Campos que não devem ser alterados manualmente.
         */
        if (
          k === "id" ||
          k === "vagas_restantes" ||
          k === "inscritos" ||
          k === "created_at" ||
          k === "updated_at"
        ) {
          continue;
        }

        payload[k] =
          v === ""
            ? null
            : (v as string | number | null);
      }

      const { error } = await supabase
        .from("livros")
        .update(payload as never)
        .eq("id", selecionado);

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Livro atualizado com sucesso!");

      qc.invalidateQueries({
        queryKey: ["admin-livros"],
      });
    },

    onError: (e: unknown) => {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar as alterações."
      );
    },
  });

  /* =======================================================
     ABRIR LIVRO PARA EDIÇÃO
     ======================================================= */

  function abrir(livro: Livro) {
    setSelecionado(livro.id);
    setForm({ ...livro });
  }

  /* =======================================================
     ALTERAR CAMPO
     ======================================================= */

  function set(
    key: keyof Livro,
    value: string,
    numeric?: boolean
  ) {
    setForm((f) => ({
      ...f,
      [key]: numeric
        ? value === ""
          ? null
          : Number(value)
        : value,
    }));
  }

  /* =======================================================
     CANCELAR / LIMPAR EDIÇÃO
     ======================================================= */

  function limparSelecao() {
    setSelecionado(null);
    setForm({});
  }

  /* =======================================================
     ENVIAR CAPA
     ======================================================= */

  async function enviarCapa(file: File) {
    if (!selecionado) {
      toast.error("Selecione um livro primeiro.");
      return;
    }

    const tiposOk = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!tiposOk.includes(file.type)) {
      toast.error(
        "Envie uma imagem JPEG, PNG ou WebP."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        "A imagem deve ter no máximo 5 MB."
      );
      return;
    }

    setEnviandoCapa(true);

    try {
      const ext =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ?? "jpg";

      const path = `${selecionado}/${Date.now()}.${ext}`;

      const { error: upErr } =
        await supabase.storage
          .from("capas")
          .upload(path, file, {
            upsert: true,
            contentType: file.type,
          });

      if (upErr) throw upErr;

      const {
        data: signed,
        error: signErr,
      } = await supabase.storage
        .from("capas")
        .createSignedUrl(
          path,
          60 * 60 * 24 * 3650
        );

      if (signErr || !signed) {
        throw (
          signErr ??
          new Error(
            "Não foi possível gerar o link da imagem."
          )
        );
      }

      setForm((f) => ({
        ...f,
        imagem_url: signed.signedUrl,
      }));

      const { error: updErr } =
        await supabase
          .from("livros")
          .update({
            imagem_url: signed.signedUrl,
          })
          .eq("id", selecionado);

      if (updErr) throw updErr;

      qc.invalidateQueries({
        queryKey: ["admin-livros"],
      });

      toast.success(
        "Capa do livro atualizada!"
      );
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Erro ao enviar a imagem."
      );
    } finally {
      setEnviandoCapa(false);
    }
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="space-y-6">

      {/* ===================================================
          CABEÇALHO
      =================================================== */}

      <div>
        <div className="flex items-center gap-3">
          <BookMarked className="h-7 w-7 text-primary" />

          <h1 className="font-serif text-2xl font-semibold">
            Livros da Jornada
          </h1>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Gerencie os livros diretamente pelo painel
          administrativo. Você pode alterar nome, ordem,
          categoria, capa, datas, turma, valor e demais
          informações sem precisar alterar o código do site.
        </p>
      </div>

      {/* ===================================================
          AVISO
      =================================================== */}

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <div>
              <p className="font-medium">
                Estrutura da Jornada
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Os livros da jornada devem manter a ordem
                correta. Os livros complementares podem ser
                cadastrados e editados separadamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================================================
          ÁREA PRINCIPAL
      =================================================== */}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">

        {/* =================================================
            LISTA DE LIVROS
        ================================================= */}

        <div className="space-y-2">

          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-medium">
                Livros cadastrados
              </p>

              <p className="text-xs text-muted-foreground">
                {livros.length} livro(s)
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando livros...
            </div>
          )}

          {isError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Não foi possível carregar os livros.
            </div>
          )}

          {!isLoading &&
            livros.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => abrir(l)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                  selecionado === l.id
                    ? "border-primary bg-secondary shadow-sm"
                    : "border-border hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center gap-3">

                  {/* MINIATURA */}
                  {l.imagem_url ? (
                    <img
                      src={l.imagem_url}
                      alt={`Capa de ${l.titulo}`}
                      className="h-14 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded border border-dashed">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">

                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {l.ordem ?? "-"}.
                      </span>

                      <span className="truncate text-sm">
                        {l.titulo || "Sem nome"}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1">

                      {l.categoria && (
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {l.categoria}
                        </Badge>
                      )}

                      {(l.vagas_total ?? 0) > 0 &&
                        (l.vagas_restantes ?? 0) <= 0 && (
                          <Badge
                            variant="destructive"
                            className="text-[10px]"
                          >
                            Esgotada
                          </Badge>
                        )}

                    </div>
                  </div>
                </div>
              </button>
            ))}
        </div>

        {/* =================================================
            FORMULÁRIO
        ================================================= */}

        <Card>
          <CardContent className="p-5">

            {!selecionado ? (

              <div className="flex min-h-[400px] flex-col items-center justify-center text-center">

                <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />

                <h2 className="font-serif text-xl font-semibold">
                  Selecione um livro
                </h2>

                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Escolha um livro na lista ao lado para
                  editar todas as informações dele.
                </p>

              </div>

            ) : (

              <form
                className="space-y-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  salvar.mutate();
                }}
              >

                {/* =========================================
                    TÍTULO DA EDIÇÃO
                ========================================= */}

                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">

                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Editando livro
                    </p>

                    <h2 className="mt-1 font-serif text-2xl font-semibold">
                      {form.titulo || "Livro sem nome"}
                    </h2>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={limparSelecao}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Fechar edição
                  </Button>

                </div>

                {/* =========================================
                    INFORMAÇÕES PRINCIPAIS
                ========================================= */}

                <section className="space-y-4">

                  <div className="flex items-center gap-2">
                    <BookMarked className="h-5 w-5 text-primary" />

                    <h3 className="font-semibold">
                      Informações do livro
                    </h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">

                    {textFields.map(
                      ({
                        key,
                        label,
                        type,
                        placeholder,
                      }) => (
                        <div
                          key={String(key)}
                          className="space-y-1.5"
                        >

                          <Label htmlFor={String(key)}>
                            {label}
                          </Label>

                          <Input
                            id={String(key)}
                            type={
                              type === "number"
                                ? "number"
                                : "text"
                            }
                            step={
                              key === "valor"
                                ? "0.01"
                                : undefined
                            }
                            placeholder={placeholder}
                            value={
                              (form[key] as
                                | string
                                | number
                                | null) ?? ""
                            }
                            onChange={(e) =>
                              set(
                                key,
                                e.target.value,
                                type === "number"
                              )
                            }
                          />

                        </div>
                      )
                    )}

                    {/* INSCRITOS */}

                    <div className="space-y-1.5">
                      <Label>
                        Inscritos
                      </Label>

                      <Input
                        value={form.inscritos ?? 0}
                        readOnly
                        disabled
                      />

                      <p className="text-xs text-muted-foreground">
                        Calculado automaticamente pelo sistema.
                      </p>
                    </div>

                    {/* VAGAS RESTANTES */}

                    <div className="space-y-1.5">
                      <Label>
                        Vagas restantes
                      </Label>

                      <Input
                        value={form.vagas_restantes ?? 0}
                        readOnly
                        disabled
                      />

                      <p className="text-xs text-muted-foreground">
                        Calculado automaticamente pelo sistema.
                      </p>
                    </div>

                  </div>
                </section>

                {/* =========================================
                    CAPA
                ========================================= */}

                <section className="space-y-4">

                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />

                    <h3 className="font-semibold">
                      Capa do livro
                    </h3>
                  </div>

                  <div className="rounded-lg border p-4">

                    <div className="flex flex-wrap items-start gap-5">

                      {/* PREVIEW */}

                      {form.imagem_url ? (
                        <img
                          src={form.imagem_url}
                          alt={`Capa do livro ${
                            form.titulo ?? ""
                          }`}
                          className="h-48 w-36 rounded-lg border object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-48 w-36 flex-col items-center justify-center rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                          <ImageIcon className="mb-2 h-8 w-8" />
                          Sem capa
                        </div>
                      )}

                      {/* UPLOAD */}

                      <div className="flex flex-col gap-3">

                        <div>
                          <p className="font-medium">
                            Alterar capa
                          </p>

                          <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            Escolha a imagem da capa que será
                            exibida no site.
                          </p>
                        </div>

                        <input
                          id="capa-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file =
                              e.target.files?.[0];

                            e.target.value = "";

                            if (file) {
                              void enviarCapa(file);
                            }
                          }}
                        />

                        <Button
                          type="button"
                          variant="outline"
                          disabled={enviandoCapa}
                          onClick={() =>
                            document
                              .getElementById(
                                "capa-upload"
                              )
                              ?.click()
                          }
                          className="w-fit gap-2"
                        >
                          {enviandoCapa ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}

                          {enviandoCapa
                            ? "Enviando..."
                            : "Escolher nova capa"}
                        </Button>

                        <p className="text-xs text-muted-foreground">
                          JPEG, PNG ou WebP — máximo de 5 MB.
                        </p>

                      </div>
                    </div>
                  </div>
                </section>

                {/* =========================================
                    DATAS E ORGANIZAÇÃO
                ========================================= */}

                <section className="space-y-4">

                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />

                    <h3 className="font-semibold">
                      Datas e organização
                    </h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">

                    <div className="space-y-1.5">
                      <Label>
                        Data / período
                      </Label>

                      <Input
                        value={
                          (form.datas_curso as string) ?? ""
                        }
                        placeholder="Ex.: 03 e 04 de novembro de 2026"
                        onChange={(e) =>
                          set(
                            "datas_curso",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>
                        Turma
                      </Label>

                      <Input
                        value={
                          (form.turma as string) ?? ""
                        }
                        placeholder="Ex.: Turma 10"
                        onChange={(e) =>
                          set(
                            "turma",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>
                        Horário
                      </Label>

                      <Input
                        value={
                          (form.horario as string) ?? ""
                        }
                        placeholder="Ex.: 19h às 22h"
                        onChange={(e) =>
                          set(
                            "horario",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>
                        Sala / local
                      </Label>

                      <Input
                        value={
                          (form.sala as string) ?? ""
                        }
                        placeholder="Ex.: Sala Principal"
                        onChange={(e) =>
                          set(
                            "sala",
                            e.target.value
                          )
                        }
                      />
                    </div>

                  </div>
                </section>

                {/* =========================================
                    DESCRIÇÕES
                ========================================= */}

                <section className="space-y-4">

                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />

                    <h3 className="font-semibold">
                      Conteúdo e descrição
                    </h3>
                  </div>

                  <div className="space-y-5">

                    {longFields.map(
                      ({
                        key,
                        label,
                        placeholder,
                      }) => (
                        <div
                          key={String(key)}
                          className="space-y-1.5"
                        >

                          <Label htmlFor={String(key)}>
                            {label}
                          </Label>

                          <Textarea
                            id={String(key)}
                            rows={
                              key ===
                              "conteudo_programatico"
                                ? 8
                                : 4
                            }
                            placeholder={placeholder}
                            value={
                              (form[key] as
                                | string
                                | null) ?? ""
                            }
                            onChange={(e) =>
                              set(
                                key,
                                e.target.value
                              )
                            }
                          />

                        </div>
                      )
                    )}

                  </div>
                </section>

                {/* =========================================
                    RESUMO
                ========================================= */}

                <section className="rounded-lg bg-secondary/40 p-4">

                  <p className="mb-3 font-medium">
                    Resumo
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                    <div className="flex items-center gap-2">
                      <BookMarked className="h-4 w-4 text-muted-foreground" />

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Ordem
                        </p>

                        <p className="text-sm font-medium">
                          {form.ordem ?? "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Autor
                        </p>

                        <p className="text-sm font-medium">
                          {form.autor || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Horário
                        </p>

                        <p className="text-sm font-medium">
                          {form.horario || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Vagas
                        </p>

                        <p className="text-sm font-medium">
                          {form.vagas_total ?? "-"}
                        </p>
                      </div>
                    </div>

                  </div>
                </section>

                {/* =========================================
                    BOTÕES
                ========================================= */}

                <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5">

                  <Button
                    type="button"
                    variant="outline"
                    onClick={limparSelecao}
                  >
                    Cancelar
                  </Button>

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

                    {salvar.isPending
                      ? "Salvando..."
                      : "Salvar alterações"}
                  </Button>

                </div>

              </form>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
