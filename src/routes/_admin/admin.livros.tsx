import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Check,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute(
  "/_admin/admin/livros"
)({
  component: AdminLivrosPage,
});

/* =========================================================
   TIPOS
========================================================= */

type Livro = {
  id: string;
  trilha_id: string;
  nivel_id: string | null;

  titulo: string;
  autor: string | null;

  ordem: number;

  descricao: string | null;

  valor: number | null;
  vagas: number;

  ano: number | null;
  qtd_encontros: number | null;

  duracao: string | null;
  turma: string | null;

  capa_url: string | null;

  status: string;
};

type Trilha = {
  id: string;
  nome: string;
};

type Nivel = {
  id: string;
  nome: string;
  ordem: number;
  trilha_id: string | null;
};

/*
 * Formulário usa STRINGS nos campos numéricos.
 *
 * Isso é importante porque permite:
 * - apagar o 0;
 * - digitar normalmente;
 * - não aparecerem setinhas;
 * - não perder o foco.
 */


type FormLivro = {
  tipo_curso: "jornada" | "complementar";
  nivel_id: string;

  titulo: string;
  autor: string;

  ordem: string;
  descricao: string;

  valor: string;
  vagas: string;

  ano: string;
  qtd_encontros: string;

  duracao: string;
  turma: string;
};

/* =========================================================
   LIVROS DA HOME / JORNADA
========================================================= */

const HOME = [
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

/* =========================================================
   FORMULÁRIO VAZIO
========================================================= */

const vazio: FormLivro = {
  tipo_curso: "jornada",
  nivel_id: "",

  titulo: "",
  autor: "",

  ordem: "1",
  descricao: "",

  valor: "",
  vagas: "0",

  ano: "",
  qtd_encontros: "",

  duracao: "",
  turma: "",
};

/* =========================================================
   FIELD};

/* =========================================================
   FIELD
   FORA DO COMPONENTE PRINCIPAL
   =========================================================
   
   Esta é a correção do problema do cursor.

   Antes o Field era criado dentro de AdminLivrosPage.
   Agora ele fica fora e não é recriado a cada tecla.
========================================================= */

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={
        wide
          ? "space-y-1.5 sm:col-span-2"
          : "space-y-1.5"
      }
    >
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* =========================================================
   COMPONENTE
========================================================= */

function AdminLivrosPage() {
  const qc = useQueryClient();

  const [
    selecionado,
    setSelecionado,
  ] = useState<string | null>(null);

  const [
    criando,
    setCriando,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<FormLivro>(vazio);

  const [capaFile, setCapaFile] = useState<File | null>(null);

  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [
    filtroNivel,
    setFiltroNivel,
  ] = useState("todos");

  const [
    novoNivelAberto,
    setNovoNivelAberto,
  ] = useState(false);

  const [
    novoNivelNome,
    setNovoNivelNome,
  ] = useState("");

  const [novoNivelTipo, setNovoNivelTipo] =
    useState<"jornada" | "complementar">("jornada");

  const [nivelEditando, setNivelEditando] = useState<string | null>(null);
  const [nivelEditNome, setNivelEditNome] = useState("");

  /* =======================================================
     LIVROS
  ======================================================= */

  const livrosQuery = useQuery({
    queryKey: ["admin-livros"],

    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("livros")
        .select("*")
        .order("ordem");

      if (error) {
        throw error;
      }

      return (data ?? []) as Livro[];
    },
  });

  /* =======================================================
     TRILHAS
  ======================================================= */

  const trilhasQuery = useQuery({
    queryKey: ["admin-trilhas"],

    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("trilhas")
        .select("id,nome")
        .order("nome");

      if (error) {
        throw error;
      }

      return (data ?? []) as Trilha[];
    },
  });

  /* =======================================================
     NÍVEIS
  ======================================================= */

  const niveisQuery = useQuery({
    queryKey: ["admin-niveis-trilha"],

    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("niveis_trilha")
        .select(
          "id,nome,ordem,trilha_id"
        )
        .order("ordem")
        .order("nome");

      if (error) {
        throw error;
      }

      return (data ?? []) as Nivel[];
    },
  });

  const livros = livrosQuery.data ?? [];
  const trilhas =
    trilhasQuery.data ?? [];
  const niveis =
    niveisQuery.data ?? [];

  /* =======================================================
     MAPA POR ORDEM
  ======================================================= */

  const porOrdem = useMemo(
    () =>
      new Map(
        livros.map((livro) => [
          Number(livro.ordem),
          livro,
        ])
      ),
    [livros]
  );

  /* =======================================================
     TRILHA JORNADA
  ======================================================= */

  const trilhaJornada = useMemo(
    () =>
      trilhas.find(
        (trilha) =>
          trilha.nome
            .trim()
            .toLowerCase() ===
          "jornada"
      ) ?? null,
    [trilhas]
  );

  /* =======================================================
     FILTRO
  ======================================================= */

  const tipoCursoSelecionado = useMemo(() => {
    if (filtroTipo === "jornada") return trilhaJornada?.id ?? null;
    if (filtroTipo === "complementar") {
      return trilhas.find(
        (trilha) =>
          trilha.nome.trim().toLowerCase() === "cursos complementares"
      )?.id ?? null;
    }
    return null;
  }, [filtroTipo, trilhas, trilhaJornada]);

  const niveisDoFiltro = useMemo(() => {
    if (!tipoCursoSelecionado) return niveis;
    return niveis.filter(
      (nivel) => !nivel.trilha_id || nivel.trilha_id === tipoCursoSelecionado
    );
  }, [niveis, tipoCursoSelecionado]);

  /* =======================================================
     SALVAR CURSO
  ======================================================= */

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.titulo.trim()) {
        throw new Error("Informe o nome do curso.");
      }

      const trilhaId =
        form.tipo_curso === "jornada"
          ? trilhaJornada?.id
          : trilhas.find(
              (trilha) =>
                trilha.nome.trim().toLowerCase() === "cursos complementares"
            )?.id;

      if (!trilhaId) {
        throw new Error(
          "O tipo de curso selecionado ainda não está configurado no banco de dados."
        );
      }

      const payload = {
        trilha_id: trilhaId,
        nivel_id: form.nivel_id || null,
        titulo: form.titulo.trim(),
        autor: form.autor.trim() || null,
        ordem: Number(form.ordem) || 1,
        descricao: form.descricao.trim() || null,
        valor:
          form.valor.trim() === ""
            ? null
            : Number(form.valor.replace(",", ".")),
        vagas:
          form.vagas.trim() === ""
            ? 0
            : Number(form.vagas),
        ano:
          form.ano.trim() === ""
            ? null
            : Number(form.ano),
        qtd_encontros:
          form.qtd_encontros.trim() === ""
            ? null
            : Number(form.qtd_encontros),
        duracao: form.duracao.trim() || null,
        turma: form.turma.trim() || null,
      };

      let livroId = selecionado;

      if (selecionado) {
        const { error } = await supabase
          .from("livros")
          .update(payload)
          .eq("id", selecionado);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("livros")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        livroId = data.id;
      }

      if (capaFile && livroId) {
        const ext = capaFile.name.toLowerCase().endsWith(".png") ? "png" : "jpg";
        const path = `${livroId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("book-capas")
          .upload(path, capaFile, {
            upsert: false,
            contentType: capaFile.type,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("book-capas")
          .getPublicUrl(path);

        const { error: coverError } = await supabase
          .from("livros")
          .update({ capa_url: publicUrl.publicUrl })
          .eq("id", livroId);

        if (coverError) throw coverError;
      }
    },
    onSuccess: async () => {
      toast.success(
        selecionado ? "Curso atualizado!" : "Curso cadastrado!"
      );
      fechar();
      await qc.invalidateQueries({ queryKey: ["admin-livros"] });
    },
    onError: (e: unknown) => {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar o curso."
      );
    },
  });

  /* =======================================================
     CADASTRAR LIVRO DA HOME
  ======================================================= */

  const cadastrarHome =
    useMutation({
      mutationFn: async (
        base: typeof HOME[number]
      ) => {
        if (porOrdem.has(base[0])) {
          return;
        }

        const trilha =
          trilhaJornada ??
          trilhas[0];

        if (!trilha) {
          throw new Error(
            "Nenhuma trilha cadastrada."
          );
        }

        const {
          error,
        } = await supabase
          .from("livros")
          .insert({
            trilha_id:
              trilha.id,

            nivel_id:
              null,

            titulo:
              base[1],

            autor:
              base[2] ||
              null,

            ordem:
              base[0],

            categoria:
              null,

            vagas: 0,
          });

        if (error) {
          throw error;
        }
      },

      onSuccess:
        async () => {
          toast.success(
            "Curso da Jornada cadastrado!"
          );

          await qc.invalidateQueries({
            queryKey: [
              "admin-livros",
            ],
          });
        },

      onError: (
        e: unknown
      ) =>
        toast.error(
          e instanceof Error
            ? e.message
            : "Não foi possível cadastrar o curso."
        ),
    });

  /* =======================================================
     NOVO NÍVEL
  ======================================================= */

  const cadastrarNivel = useMutation({
    mutationFn: async () => {
      const nome = novoNivelNome.trim();
      if (!nome) throw new Error("Informe o nome do nível.");

      const trilhaId =
        novoNivelTipo === "jornada"
          ? trilhaJornada?.id
          : trilhas.find(
              (trilha) =>
                trilha.nome.trim().toLowerCase() === "cursos complementares"
            )?.id;

      if (!trilhaId) {
        throw new Error(
          "O tipo de curso selecionado ainda não está configurado no banco de dados."
        );
      }

      const { error } = await supabase
        .from("niveis_trilha")
        .insert({
          nome,
          trilha_id: trilhaId,
          ordem:
            niveis.filter((nivel) => nivel.trilha_id === trilhaId).length + 1,
        });

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Nível cadastrado!");
      setNovoNivelNome("");
      setNovoNivelTipo("jornada");
      setNovoNivelAberto(false);
      await qc.invalidateQueries({
        queryKey: ["admin-niveis-trilha"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível cadastrar o nível."
      ),
  });

  /* =======================================================
     EDITAR / EXCLUIR NÍVEL
  ======================================================= */

  const salvarNivel = useMutation({
    mutationFn: async () => {
      if (!nivelEditando) throw new Error("Nenhum nível selecionado.");
      const nome = nivelEditNome.trim();
      if (!nome) throw new Error("Informe o nome do nível.");

      const { error } = await supabase
        .from("niveis_trilha")
        .update({ nome })
        .eq("id", nivelEditando);

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Nível atualizado!");
      setNivelEditando(null);
      setNivelEditNome("");
      await qc.invalidateQueries({ queryKey: ["admin-niveis-trilha"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível atualizar o nível."
      ),
  });

  const excluirNivel = useMutation({
    mutationFn: async (nivel: Nivel) => {
      const confirmar = window.confirm(
        `Excluir o nível "${nivel.nome}"?\n\nOs cursos vinculados ficarão sem nível. Essa ação não poderá ser desfeita.`
      );
      if (!confirmar) return false;

      const { error } = await supabase
        .from("niveis_trilha")
        .delete()
        .eq("id", nivel.id);

      if (error) throw error;
      return true;
    },
    onSuccess: async (apagou) => {
      if (!apagou) return;
      toast.success("Nível excluído!");
      if (nivelEditando) {
        setNivelEditando(null);
        setNivelEditNome("");
      }
      await qc.invalidateQueries({ queryKey: ["admin-niveis-trilha"] });
      await qc.invalidateQueries({ queryKey: ["admin-livros"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível excluir o nível."
      ),
  });

  /* =======================================================
     EXCLUIR CURSO
  ======================================================= */

  const excluir = useMutation({
    mutationFn: async (livro: Livro) => {
      const confirmar = window.confirm(
        `Excluir o curso "${livro.titulo}"?\n\nEssa ação não poderá ser desfeita.`
      );
      if (!confirmar) return false;

      const { error } = await supabase
        .from("livros")
        .delete()
        .eq("id", livro.id);

      if (error) throw error;
      return true;
    },
    onSuccess: async (apagou) => {
      if (!apagou) return;
      toast.success("Curso excluído!");
      if (selecionado) fechar();
      await qc.invalidateQueries({ queryKey: ["admin-livros"] });
    },
    onError: (e: unknown) => {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível excluir o curso."
      );
    },
  });

  /* =======================================================
     EDITAR
  ======================================================= */

  function editar(livro: Livro) {
    setCriando(false);
    setSelecionado(livro.id);
    setCapaFile(null);

    const tipo_curso =
      livro.trilha_id === trilhaJornada?.id
        ? "jornada"
        : "complementar";

    setForm({
      tipo_curso,
      nivel_id: livro.nivel_id ?? "",
      titulo: livro.titulo ?? "",
      autor: livro.autor ?? "",
      ordem: String(livro.ordem ?? 1),
      descricao: livro.descricao ?? "",
      valor: livro.valor == null ? "" : String(livro.valor),
      vagas: String(livro.vagas ?? 0),
      ano: livro.ano == null ? "" : String(livro.ano),
      qtd_encontros:
        livro.qtd_encontros == null
          ? ""
          : String(livro.qtd_encontros),
      duracao: livro.duracao ?? "",
      turma: livro.turma ?? "",
    });
  }

  /* =======================================================
     NOVO CURSO
  ======================================================= */

  function novoLivro() {
    const tipo_curso =
      filtroTipo === "complementar" ? "complementar" : "jornada";

    setSelecionado(null);
    setCriando(true);
    setCapaFile(null);
    setForm({
      ...vazio,
      tipo_curso,
      ordem: String(livros.length + 1),
    });
  }

  /* =======================================================
     FECHAR
  ======================================================= */

  function fechar() {
    setSelecionado(null);
    setCriando(false);
    setCapaFile(null);
    setForm({
      ...vazio,
    });
  }

  /* =======================================================
     ALTERAR FORM
  ======================================================= */

  function set<K extends keyof FormLivro>(
    key: K,
    value: FormLivro[K]
  ) {
    setForm((atual) => ({
      ...atual,
      [key]: value,
    }));
  }

  /* =======================================================
     CURSOS FILTRADOS
  ======================================================= */

  const livrosFiltrados = useMemo(() => {
    return livros
      .filter((livro) => {
        if (filtroTipo === "todos") return true;
        if (filtroTipo === "jornada") {
          return livro.trilha_id === trilhaJornada?.id;
        }
        const trilhaComplementar = trilhas.find(
          (trilha) =>
            trilha.nome.trim().toLowerCase() === "cursos complementares"
        );
        return livro.trilha_id === trilhaComplementar?.id;
      })
      .filter(
        (livro) =>
          filtroNivel === "todos" || livro.nivel_id === filtroNivel
      )
      .sort(
        (a, b) => Number(a.ordem) - Number(b.ordem)
      );
  }, [livros, filtroTipo, filtroNivel, trilhas, trilhaJornada]);

  /* =======================================================
     NOME DO NÍVEL
  ======================================================= */

  function nomeNivel(
    nivelId: string | null
  ) {
    if (!nivelId) {
      return null;
    }

    return (
      niveis.find(
        (nivel) =>
          nivel.id ===
          nivelId
      )?.nome ??
      null
    );
  }

  /* =======================================================
     CARD DE CURSO
  ======================================================= */

  function CursoCard({
    livro,
  }: {
    livro: Livro;
  }) {
    return (
      <div
        className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary hover:bg-secondary/50"
        onClick={() =>
          editar(livro)
        }
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.key ===
              "Enter" ||
            event.key ===
              " "
          ) {
            event.preventDefault();
            editar(livro);
          }
        }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {livro.ordem}
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium">
            {livro.titulo}
          </p>

          <div className="mt-1 flex flex-wrap gap-2">
            {nomeNivel(
              livro.nivel_id
            ) && (
              <Badge
                variant="outline"
                className="text-[10px]"
              >
                {
                  nomeNivel(
                    livro.nivel_id
                  )
                }
              </Badge>
            )}

            {livro.autor && (
              <span className="text-xs text-muted-foreground">
                {livro.autor}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[10px]"
          >
            <Check className="mr-1 h-3 w-3" />
            Cadastrado
          </Badge>

          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            disabled={excluir.isPending}
            onClick={(event) => {
              event.stopPropagation();
              excluir.mutate(livro);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            title="Excluir curso"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden">

      {/* CABEÇALHO */}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Cadastro
          </p>

          <h1 className="break-words font-serif text-2xl font-semibold sm:text-3xl">
            Cursos
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cadastre e organize os cursos da Jornada e os cursos complementares.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">

          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() =>
              setNovoNivelAberto(
                true
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo nível
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={
              novoLivro
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo curso
          </Button>

        </div>
      </div>

      {/* FILTRO */}

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium">Tipo de curso</p>
            <Select
              value={filtroTipo}
              onValueChange={(value) => {
                setFiltroTipo(value);
                setFiltroNivel("todos");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os cursos</SelectItem>
                <SelectItem value="jornada">Jornada</SelectItem>
                <SelectItem value="complementar">Cursos Complementares</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">Nível</p>
            <Select
              value={filtroNivel}
              onValueChange={setFiltroNivel}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os níveis</SelectItem>
                {niveisDoFiltro.map((nivel) => (
                  <SelectItem key={nivel.id} value={nivel.id}>
                    {nivel.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Níveis cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {niveisDoFiltro.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum nível cadastrado para este tipo de curso.
            </p>
          ) : (
            niveisDoFiltro.map((nivel) => (
              <div
                key={nivel.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  {nivelEditando === nivel.id ? (
                    <Input
                      autoFocus
                      value={nivelEditNome}
                      onChange={(event) => setNivelEditNome(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") salvarNivel.mutate();
                        if (event.key === "Escape") {
                          setNivelEditando(null);
                          setNivelEditNome("");
                        }
                      }}
                    />
                  ) : (
                    <p className="text-sm font-medium">{nivel.nome}</p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  {nivelEditando === nivel.id ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={salvarNivel.isPending}
                        onClick={() => salvarNivel.mutate()}
                      >
                        {salvarNivel.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNivelEditando(null);
                          setNivelEditNome("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNivelEditando(nivel.id);
                          setNivelEditNome(nivel.nome);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        disabled={excluirNivel.isPending}
                        onClick={() => excluirNivel.mutate(nivel)}
                        title="Excluir nível"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filtroTipo === "jornada"
              ? "Cursos da Jornada"
              : filtroTipo === "complementar"
                ? "Cursos Complementares"
                : "Todos os cursos"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {livrosFiltrados.length} {livrosFiltrados.length === 1 ? "curso encontrado" : "cursos encontrados"}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {livrosFiltrados.length === 0 ? (
            <p className="py-5 text-sm text-muted-foreground">
              Nenhum curso encontrado para este filtro.
            </p>
          ) : (
            livrosFiltrados.map((livro) => (
              <CursoCard key={livro.id} livro={livro} />
            ))
          )}
        </CardContent>
      </Card>

      {/* ===================================================
          MODAL NOVO NÍVEL
      =================================================== */}

      <Dialog
        open={
          novoNivelAberto
        }
        onOpenChange={
          setNovoNivelAberto
        }
      >
        <DialogContent className="sm:max-w-lg">

          <DialogHeader>
            <DialogTitle>
              Cadastrar novo nível
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            <Field label="Nome do nível">
              <Input
                autoFocus
                value={
                  novoNivelNome
                }
                onChange={(
                  event
                ) =>
                  setNovoNivelNome(
                    event.target
                      .value
                  )
                }
                placeholder="Ex.: Curso Essencial"
              />
            </Field>

            <Field label="Tipo de curso">
              <Select
                value={novoNivelTipo}
                onValueChange={(value) =>
                  setNovoNivelTipo(value as "jornada" | "complementar")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jornada">Jornada</SelectItem>
                  <SelectItem value="complementar">Cursos Complementares</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex gap-2">
              <Button
                type="button"
                disabled={
                  cadastrarNivel.isPending
                }
                onClick={() =>
                  cadastrarNivel.mutate()
                }
              >
                {cadastrarNivel.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}

                Salvar nível
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setNovoNivelAberto(
                    false
                  )
                }
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* ===================================================
          MODAL CURSO
      =================================================== */}

      <Dialog
        open={
          Boolean(
            selecionado ||
              criando
          )
        }
        onOpenChange={(
          open
        ) => {
          if (!open) {
            fechar();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">

          <DialogHeader>
            <DialogTitle>
              {selecionado
                ? "Editar curso"
                : "Cadastrar curso"}
            </DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              salvar.mutate();
            }}
          >

            <div className="grid gap-4 sm:grid-cols-2">

              {/* NOME */}

              <Field
                label="Nome do curso"
                wide
              >
                <Input
                  value={
                    form.titulo
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "titulo",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* AUTOR */}

              <Field label="Autor">
                <Input
                  value={
                    form.autor
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "autor",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* TIPO DE CURSO */}

              <Field label="Tipo de curso">
                <Select
                  value={form.tipo_curso}
                  onValueChange={(value) => {
                    set("tipo_curso", value as "jornada" | "complementar");
                    set("nivel_id", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jornada">Jornada</SelectItem>
                    <SelectItem value="complementar">Cursos Complementares</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* NÍVEL */}

              <Field label="Nível">
                <Select
                  value={
                    form.nivel_id ||
                    "sem-nivel"
                  }
                  onValueChange={(
                    value
                  ) =>
                    set(
                      "nivel_id",
                      value ===
                        "sem-nivel"
                        ? ""
                        : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>

                  <SelectContent>

                    <SelectItem value="sem-nivel">
                      Sem nível
                    </SelectItem>

                    {niveis
                      .filter((nivel) => {
                        const trilhaId =
                          form.tipo_curso === "jornada"
                            ? trilhaJornada?.id
                            : trilhas.find(
                                (trilha) =>
                                  trilha.nome.trim().toLowerCase() ===
                                  "cursos complementares"
                              )?.id;
                        return (
                          !trilhaId ||
                          !nivel.trilha_id ||
                          nivel.trilha_id === trilhaId
                        );
                      })
                      .map((nivel) => (
                        <SelectItem key={nivel.id} value={nivel.id}>
                          {nivel.nome}
                        </SelectItem>
                      ))}

                  </SelectContent>
                </Select>
              </Field>

              {/* ORDEM */}

              <Field label="Ordem">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={
                    form.ordem
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "ordem",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* VALOR */}

              <Field label="Valor (R$)">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={
                    form.valor
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "valor",
                      event.target
                        .value
                    )
                  }
                  placeholder="0,00"
                />

                <p className="text-xs text-muted-foreground">
                  Digite o valor, por exemplo: 250 ou 250,00
                </p>
              </Field>

              {/* VAGAS */}

              <Field label="Vagas">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={
                    form.vagas
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "vagas",
                      event.target
                        .value
                    )
                  }
                  placeholder="0"
                />
              </Field>

              {/* ANO */}

              <Field label="Ano">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={
                    form.ano
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "ano",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* ENCONTROS */}

              <Field label="Quantidade de encontros">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={
                    form.qtd_encontros
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "qtd_encontros",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* DURAÇÃO */}

              <Field label="Duração">
                <Input
                  value={
                    form.duracao
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "duracao",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* TURMA */}

              <Field label="Turma">
                <Input
                  value={
                    form.turma
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "turma",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* CAPA */}

              <Field label="Capa do curso">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (!file) {
                      setCapaFile(null);
                      return;
                    }

                    if (!['image/jpeg', 'image/png'].includes(file.type)) {
                      toast.error("A capa deve estar em JPG ou PNG.");
                      event.currentTarget.value = "";
                      setCapaFile(null);
                      return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("A capa deve ter no máximo 5 MB.");
                      event.currentTarget.value = "";
                      setCapaFile(null);
                      return;
                    }

                    setCapaFile(file);
                  }}
                />
              </Field>

              {/* DESCRIÇÃO */}

              <Field
                label="Descrição"
                wide
              >
                <Textarea
                  rows={4}
                  value={
                    form.descricao
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "descricao",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

            </div>

            {/* BOTÕES */}

            <div className="flex flex-col gap-2 sm:flex-row">

              <Button
                type="submit"
                disabled={
                  salvar.isPending ||
                  trilhasQuery.isLoading
                }
                className="w-full sm:w-auto"
              >
                {salvar.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}

                {salvar.isPending
                  ? "Salvando..."
                  : "Salvar"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={
                  fechar
                }
                className="w-full sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" />
                Fechar
              </Button>

            </div>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
