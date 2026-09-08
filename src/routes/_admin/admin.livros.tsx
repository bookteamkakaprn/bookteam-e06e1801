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
  Upload,
  X,
} from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/livros")({
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

  categoria: string | null;
  descricao: string | null;

  valor: number | null;
  vagas: number;

  ano: number | null;
  qtd_encontros: number | null;

  duracao: string | null;
  material_necessario: string | null;
  turma: string | null;
  datas_curriculo: string | null;
  data_curso: string | null;

  imagem_url: string | null;
  capa_url: string | null;
  video_url: string | null;

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

type FormLivro = {
  trilha_id: string;
  nivel_id: string;

  titulo: string;
  autor: string;

  ordem: string;

  categoria: string;
  descricao: string;

  valor: string;
  vagas: string;

  ano: string;
  qtd_encontros: string;

  duracao: string;
  material_necessario: string;
  turma: string;
  datas_curriculo: string;
  data_curso: string;

  imagem_url: string;
  capa_url: string;
  video_url: string;
};

/* =========================================================
   FORMULÁRIO VAZIO
========================================================= */

const vazio: FormLivro = {
  trilha_id: "",
  nivel_id: "",

  titulo: "",
  autor: "",

  ordem: "1",

  categoria: "",
  descricao: "",

  valor: "",
  vagas: "",

  ano: "",
  qtd_encontros: "",

  duracao: "",
  material_necessario: "",
  turma: "",
  datas_curriculo: "",
  data_curso: "",

  imagem_url: "",
  capa_url: "",
  video_url: "",
};

/* =========================================================
   FIELD
   Fica FORA do componente principal para não perder o foco
   enquanto o usuário digita.
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
   HELPERS
========================================================= */

function numeroMoeda(valor: string) {
  if (!valor.trim()) {
    return null;
  }

  const normalizado = valor
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : null;
}

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

/* =========================================================
   COMPONENTE
========================================================= */

function AdminLivrosPage() {
  const qc = useQueryClient();

  const [selecionado, setSelecionado] =
    useState<string | null>(null);

  const [criando, setCriando] =
    useState(false);

  const [form, setForm] =
    useState<FormLivro>(vazio);

  const [
    uploadingCapa,
    setUploadingCapa,
  ] = useState(false);

  /* =======================================================
     FILTROS
  ======================================================= */

  const [
    filtroTipo,
    setFiltroTipo,
  ] = useState("todos");

  const [
    filtroTrilha,
    setFiltroTrilha,
  ] = useState("todas");

  const [
    filtroNivel,
    setFiltroNivel,
  ] = useState("todos");

  /* =======================================================
     NOVO NÍVEL
  ======================================================= */

  const [
    novoNivelAberto,
    setNovoNivelAberto,
  ] = useState(false);

  const [
    novoNivelNome,
    setNovoNivelNome,
  ] = useState("");

  const [
    novoNivelTrilha,
    setNovoNivelTrilha,
  ] = useState("");

  /* =======================================================
     LIVROS / CURSOS
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
        throw new Error(
          `Não foi possível carregar os cursos: ${error.message}`
        );
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
        throw new Error(
          `Não foi possível carregar as trilhas: ${error.message}`
        );
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
        .select("id,nome,ordem,trilha_id")
        .order("ordem")
        .order("nome");

      if (error) {
        throw new Error(
          `Não foi possível carregar os níveis: ${error.message}`
        );
      }

      return (data ?? []) as Nivel[];
    },
  });

  const livros = livrosQuery.data ?? [];
  const trilhas = trilhasQuery.data ?? [];
  const niveis = niveisQuery.data ?? [];

  /* =======================================================
     TRILHA JORNADA
  ======================================================= */

  const trilhaJornada = useMemo(() => {
    return (
      trilhas.find(
        (trilha) =>
          trilha.nome
            .trim()
            .toLowerCase() === "jornada"
      ) ?? null
    );
  }, [trilhas]);

  /* =======================================================
     TRILHAS COMPLEMENTARES
  ======================================================= */

  const trilhasComplementares = useMemo(() => {
    return trilhas.filter(
      (trilha) =>
        trilha.id !== trilhaJornada?.id
    );
  }, [trilhas, trilhaJornada]);

  /* =======================================================
     CURSOS FILTRADOS
  ======================================================= */

  const cursosFiltrados = useMemo(() => {
    return [...livros]
      .filter((livro) => {
        if (filtroTipo === "todos") {
          return true;
        }

        if (filtroTipo === "jornada") {
          return (
            livro.trilha_id ===
            trilhaJornada?.id
          );
        }

        if (
          filtroTipo ===
          "complementares"
        ) {
          return (
            livro.trilha_id !==
            trilhaJornada?.id
          );
        }

        return true;
      })
      .filter((livro) => {
        if (filtroTrilha === "todas") {
          return true;
        }

        return (
          livro.trilha_id ===
          filtroTrilha
        );
      })
      .filter((livro) => {
        if (filtroNivel === "todos") {
          return true;
        }

        return (
          livro.nivel_id ===
          filtroNivel
        );
      })
      .sort(
        (a, b) =>
          Number(a.ordem) -
          Number(b.ordem)
      );
  }, [
    livros,
    filtroTipo,
    filtroTrilha,
    filtroNivel,
    trilhaJornada,
  ]);

  /* =======================================================
     NÍVEIS DA TRILHA SELECIONADA NO FORMULÁRIO
  ======================================================= */

  const niveisDoFormulario = useMemo(() => {
    if (!form.trilha_id) {
      return [];
    }

    return niveis
      .filter(
        (nivel) =>
          nivel.trilha_id ===
          form.trilha_id
      )
      .sort(
        (a, b) =>
          Number(a.ordem) -
          Number(b.ordem)
      );
  }, [niveis, form.trilha_id]);

  /* =======================================================
     ENVIO DE CAPA
  ======================================================= */

  async function enviarCapa(file: File) {
    if (
      file.type !== "image/jpeg"
    ) {
      toast.error(
        "A capa deve estar em JPG ou JPEG."
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      toast.error(
        "A capa deve ter no máximo 5 MB."
      );
      return;
    }

    setUploadingCapa(true);

    try {
      const path =
        `livros/${
          selecionado ??
          crypto.randomUUID()
        }.jpg`;

      const up =
        await supabase.storage
          .from("book-capas")
          .upload(
            path,
            file,
            {
              upsert: true,
              contentType:
                "image/jpeg",
            }
          );

      if (up.error) {
        throw new Error(
          `Erro ao enviar capa: ${up.error.message}`
        );
      }

      const {
        data,
      } =
        supabase.storage
          .from("book-capas")
          .getPublicUrl(path);

      setForm((atual) => ({
        ...atual,
        capa_url:
          data.publicUrl,
        imagem_url:
          data.publicUrl,
      }));

      toast.success(
        "Capa enviada!"
      );
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível enviar a capa."
      );
    } finally {
      setUploadingCapa(false);
    }
  }

  /* =======================================================
     SALVAR CURSO
  ======================================================= */

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.titulo.trim()) {
        throw new Error(
          "Informe o nome do curso."
        );
      }

      if (!form.trilha_id) {
        throw new Error(
          "Selecione uma trilha."
        );
      }

      const valor =
        numeroMoeda(form.valor);

      const vagas =
        form.vagas.trim() === ""
          ? 0
          : Number(form.vagas);

      const payload = {
        trilha_id:
          form.trilha_id,

        nivel_id:
          form.nivel_id || null,

        titulo:
          form.titulo.trim(),

        autor:
          form.autor.trim() ||
          null,

        ordem:
          Number(form.ordem) || 1,

        categoria:
          form.categoria.trim() ||
          null,

        descricao:
          form.descricao.trim() ||
          null,

        valor,

        vagas,

        ano:
          form.ano.trim() === ""
            ? null
            : Number(form.ano),

        qtd_encontros:
          form.qtd_encontros.trim() ===
          ""
            ? null
            : Number(
                form.qtd_encontros
              ),

        duracao:
          form.duracao.trim() ||
          null,

        material_necessario:
          form.material_necessario.trim() ||
          null,

        turma:
          form.turma.trim() ||
          null,

        datas_curriculo:
          form.datas_curriculo.trim() ||
          null,

        data_curso:
          form.data_curso ||
          null,

        imagem_url:
          form.imagem_url.trim() ||
          null,

        capa_url:
          form.capa_url.trim() ||
          null,

        video_url:
          form.video_url.trim() ||
          null,
      };

      if (selecionado) {
        const {
          error,
        } = await supabase
          .from("livros")
          .update(payload)
          .eq(
            "id",
            selecionado
          );

        if (error) {
          throw new Error(
            `Erro ao atualizar o curso: ${error.message}`
          );
        }
      } else {
        const {
          error,
        } = await supabase
          .from("livros")
          .insert(payload);

        if (error) {
          throw new Error(
            `Erro ao cadastrar o curso: ${error.message}`
          );
        }
      }
    },

    onSuccess: async () => {
      toast.success(
        selecionado
          ? "Curso atualizado!"
          : "Curso cadastrado!"
      );

      fechar();

      await qc.invalidateQueries({
        queryKey: [
          "admin-livros",
        ],
      });
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
     CADASTRAR NOVO NÍVEL
  ======================================================= */

  const cadastrarNivel =
    useMutation({
      mutationFn: async () => {
        const nome =
          novoNivelNome.trim();

        const trilhaId =
          novoNivelTrilha;

        if (!nome) {
          throw new Error(
            "Informe o nome do nível."
          );
        }

        if (!trilhaId) {
          throw new Error(
            "Selecione a trilha do nível."
          );
        }

        /*
         * Impede duplicidade dentro da mesma trilha.
         */
        const duplicado =
          niveis.some(
            (nivel) =>
              nivel.trilha_id ===
                trilhaId &&
              nivel.nome
                .trim()
                .toLowerCase() ===
                nome.toLowerCase()
          );

        if (duplicado) {
          throw new Error(
            "Esse nível já está cadastrado nesta trilha."
          );
        }

        /*
         * Calcula a próxima ordem
         * somente dentro da trilha.
         */
        const niveisDaTrilha =
          niveis.filter(
            (nivel) =>
              nivel.trilha_id ===
              trilhaId
          );

        const maiorOrdem =
          niveisDaTrilha.reduce(
            (maior, nivel) =>
              Math.max(
                maior,
                Number(nivel.ordem) || 0
              ),
            0
          );

        const proximaOrdem =
          maiorOrdem + 1;

        const {
          error,
        } = await supabase
          .from("niveis_trilha")
          .insert({
            nome,
            trilha_id:
              trilhaId,
            ordem:
              proximaOrdem,
          });

        if (error) {
          /*
           * IMPORTANTE:
           * mostra o erro REAL do Supabase.
           */
          throw new Error(
            `Erro ao cadastrar nível: ${error.message}`
          );
        }
      },

      onSuccess: async () => {
        toast.success(
          "Nível cadastrado com sucesso!"
        );

        setNovoNivelNome("");

        setNovoNivelTrilha(
          trilhaJornada?.id ??
            trilhas[0]?.id ??
            ""
        );

        setNovoNivelAberto(
          false
        );

        await qc.invalidateQueries({
          queryKey: [
            "admin-niveis-trilha",
          ],
        });
      },

      onError: (e: unknown) => {
        toast.error(
          e instanceof Error
            ? e.message
            : "Não foi possível cadastrar o nível."
        );
      },
    });

  /* =======================================================
     EDITAR
  ======================================================= */

  function editar(livro: Livro) {
    setCriando(false);

    setSelecionado(
      livro.id
    );

    setForm({
      trilha_id:
        livro.trilha_id ??
        "",

      nivel_id:
        livro.nivel_id ??
        "",

      titulo:
        livro.titulo ??
        "",

      autor:
        livro.autor ??
        "",

      ordem:
        String(
          livro.ordem ??
          1
        ),

      categoria:
        livro.categoria ??
        "",

      descricao:
        livro.descricao ??
        "",

      valor:
        livro.valor == null
          ? ""
          : String(
              livro.valor
            ).replace(
              ".",
              ","
            ),

      vagas:
        livro.vagas == null
          ? ""
          : String(
              livro.vagas
            ),

      ano:
        livro.ano == null
          ? ""
          : String(
              livro.ano
            ),

      qtd_encontros:
        livro.qtd_encontros ==
        null
          ? ""
          : String(
              livro.qtd_encontros
            ),

      duracao:
        livro.duracao ??
        "",

      material_necessario:
        livro.material_necessario ??
        "",

      turma:
        livro.turma ??
        "",

      datas_curriculo:
        livro.datas_curriculo ??
        "",

      data_curso:
        livro.data_curso ??
        "",

      imagem_url:
        livro.imagem_url ??
        "",

      capa_url:
        livro.capa_url ??
        "",

      video_url:
        livro.video_url ??
        "",
    });
  }

  /* =======================================================
     NOVO CURSO
  ======================================================= */

  function novoLivro() {
    const trilha =
      trilhaJornada ??
      trilhas[0];

    setSelecionado(null);

    setCriando(true);

    setForm({
      ...vazio,

      ordem: String(
        livros.length + 1
      ),

      trilha_id:
        trilha?.id ??
        "",

      nivel_id: "",
    });
  }

  /* =======================================================
     NOVO NÍVEL
  ======================================================= */

  function abrirNovoNivel() {
    setNovoNivelNome("");

    setNovoNivelTrilha(
      trilhaJornada?.id ??
        trilhas[0]?.id ??
        ""
    );

    setNovoNivelAberto(true);
  }

  /* =======================================================
     FECHAR
  ======================================================= */

  function fechar() {
    setSelecionado(null);

    setCriando(false);

    setForm({
      ...vazio,
    });
  }

  /* =======================================================
     ALTERAR FORMULÁRIO
  ======================================================= */

  function set(
    key: keyof FormLivro,
    value: string
  ) {
    setForm((atual) => ({
      ...atual,
      [key]: value,
    }));
  }

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
     NOME DA TRILHA
  ======================================================= */

  function nomeTrilha(
    trilhaId: string
  ) {
    return (
      trilhas.find(
        (trilha) =>
          trilha.id ===
          trilhaId
      )?.nome ??
      ""
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
    const nivel =
      nomeNivel(
        livro.nivel_id
      );

    const trilha =
      nomeTrilha(
        livro.trilha_id
      );

    return (
      <div
        className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary hover:bg-secondary/50"
        onClick={() =>
          editar(livro)
        }
        role="button"
        tabIndex={0}
        onKeyDown={(
          event
        ) => {
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

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {trilha && (
              <Badge
                variant="outline"
                className="text-[10px]"
              >
                {trilha}
              </Badge>
            )}

            {nivel && (
              <Badge
                variant="outline"
                className="text-[10px]"
              >
                {nivel}
              </Badge>
            )}

            {livro.autor && (
              <span className="text-xs text-muted-foreground">
                {livro.autor}
              </span>
            )}
          </div>
        </div>

        <Badge
          variant="secondary"
          className="shrink-0 text-[10px]"
        >
          <Check className="mr-1 h-3 w-3" />
          Cadastrado
        </Badge>
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
            onClick={
              abrirNovoNivel
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

      {/* ===================================================
          FILTROS
      =================================================== */}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Filtros
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-3">

          {/* TIPO */}

          <div className="space-y-1.5">
            <Label>
              Tipo de curso
            </Label>

            <Select
              value={
                filtroTipo
              }
              onValueChange={
                (value) => {
                  setFiltroTipo(
                    value
                  );

                  /*
                   * Quando muda o tipo,
                   * limpa trilha para evitar
                   * combinação confusa.
                   */
                  setFiltroTrilha(
                    "todas"
                  );
                }
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="todos">
                  Todos os cursos
                </SelectItem>

                <SelectItem value="jornada">
                  Jornada
                </SelectItem>

                <SelectItem value="complementares">
                  Cursos Complementares
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TRILHA */}

          <div className="space-y-1.5">
            <Label>
              Trilha
            </Label>

            <Select
              value={
                filtroTrilha
              }
              onValueChange={
                setFiltroTrilha
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="todas">
                  Todas as trilhas
                </SelectItem>

                {trilhas.map(
                  (trilha) => (
                    <SelectItem
                      key={
                        trilha.id
                      }
                      value={
                        trilha.id
                      }
                    >
                      {trilha.nome}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* NÍVEL */}

          <div className="space-y-1.5">
            <Label>
              Nível
            </Label>

            <Select
              value={
                filtroNivel
              }
              onValueChange={
                setFiltroNivel
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="todos">
                  Todos os níveis
                </SelectItem>

                {niveis.map(
                  (nivel) => (
                    <SelectItem
                      key={
                        nivel.id
                      }
                      value={
                        nivel.id
                      }
                    >
                      {nivel.nome}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      {/* ===================================================
          LISTA ÚNICA DE CURSOS
      =================================================== */}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filtroTipo ===
            "jornada"
              ? "Cursos da Jornada"
              : filtroTipo ===
                "complementares"
              ? "Cursos Complementares"
              : "Todos os cursos"}
          </CardTitle>

          <p className="text-xs text-muted-foreground">
            {cursosFiltrados.length}{" "}
            {cursosFiltrados.length ===
            1
              ? "curso encontrado"
              : "cursos encontrados"}
          </p>
        </CardHeader>

        <CardContent className="space-y-2">

          {cursosFiltrados.length ===
            0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum curso encontrado para os filtros selecionados.
            </p>
          )}

          {cursosFiltrados.map(
            (livro) => (
              <CursoCard
                key={
                  livro.id
                }
                livro={
                  livro
                }
              />
            )
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

            <Field label="Trilha">
              <Select
                value={
                  novoNivelTrilha
                }
                onValueChange={
                  setNovoNivelTrilha
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a trilha" />
                </SelectTrigger>

                <SelectContent>
                  {trilhas.map(
                    (trilha) => (
                      <SelectItem
                        key={
                          trilha.id
                        }
                        value={
                          trilha.id
                        }
                      >
                        {
                          trilha.nome
                        }
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </Field>

            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">
                Exemplos de níveis:
              </p>

              <p className="mt-1 text-sm">
                Curso Essencial
              </p>

              <p className="text-sm">
                Curso Avançado I, II, III e IV
              </p>

              <p className="text-sm">
                Masterclass I e II
              </p>
            </div>

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

                {cadastrarNivel.isPending
                  ? "Salvando..."
                  : "Salvar nível"}
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
            onSubmit={(
              event
            ) => {
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

              {/* TRILHA */}

              <Field label="Trilha">
                <Select
                  value={
                    form.trilha_id
                  }
                  onValueChange={(
                    value
                  ) => {
                    set(
                      "trilha_id",
                      value
                    );

                    /*
                     * Ao trocar a trilha,
                     * remove um nível que
                     * pertencia à trilha anterior.
                     */
                    const nivelAtual =
                      niveis.find(
                        (nivel) =>
                          nivel.id ===
                          form.nivel_id
                      );

                    if (
                      nivelAtual &&
                      nivelAtual.trilha_id !==
                        value
                    ) {
                      set(
                        "nivel_id",
                        ""
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a trilha" />
                  </SelectTrigger>

                  <SelectContent>
                    {trilhas.map(
                      (trilha) => (
                        <SelectItem
                          key={
                            trilha.id
                          }
                          value={
                            trilha.id
                          }
                        >
                          {
                            trilha.nome
                          }
                        </SelectItem>
                      )
                    )}
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

                    {niveisDoFormulario.map(
                      (nivel) => (
                        <SelectItem
                          key={
                            nivel.id
                          }
                          value={
                            nivel.id
                          }
                        >
                          {
                            nivel.nome
                          }
                        </SelectItem>
                      )
                    )}

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
                      somenteNumeros(
                        event
                          .target
                          .value
                      )
                    )
                  }
                />
              </Field>

              {/* CATEGORIA */}

              <Field label="Categoria">
                <Input
                  value={
                    form.categoria
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "categoria",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* VALOR */}

              <Field label="Valor">
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3">
                  <span className="mr-2 text-sm font-medium text-muted-foreground">
                    R$
                  </span>

                  <input
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
                    className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Digite, por exemplo:
                  250 ou 250,00
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
                      somenteNumeros(
                        event
                          .target
                          .value
                      )
                    )
                  }
                  placeholder="0"
                />
              </Field>

              {/* DATA */}

              <Field label="Data do curso">
                <Input
                  type="date"
                  value={
                    form.data_curso
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "data_curso",
                      event.target
                        .value
                    )
                  }
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
                      somenteNumeros(
                        event
                          .target
                          .value
                      )
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
                      somenteNumeros(
                        event
                          .target
                          .value
                      )
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

              {/* DATAS */}

              <Field label="Datas do curso">
                <Input
                  value={
                    form.datas_curriculo
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "datas_curriculo",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* MATERIAL */}

              <Field label="Material necessário">
                <Input
                  value={
                    form.material_necessario
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "material_necessario",
                      event.target
                        .value
                    )
                  }
                />
              </Field>

              {/* CAPA */}

              <Field label="Capa do curso (JPG/JPEG)">
                <div className="space-y-2">

                  <Input
                    type="file"
                    accept=".jpg,.jpeg,image/jpeg"
                    disabled={
                      uploadingCapa
                    }
                    onChange={(
                      event
                    ) => {
                      const file =
                        event
                          .target
                          .files?.[0];

                      if (file) {
                        enviarCapa(
                          file
                        );
                      }
                    }}
                  />

                  {(form.capa_url ||
                    form.imagem_url) && (
                    <img
                      src={
                        form.capa_url ||
                        form.imagem_url ||
                        ""
                      }
                      alt="Capa do curso"
                      className="h-32 w-24 rounded-md border object-cover"
                    />
                  )}

                  <p className="text-xs text-muted-foreground">
                    Máximo 5 MB.
                  </p>

                </div>
              </Field>

              {/* URL CAPA */}

              <Field label="URL da capa">
                <Input
                  value={
                    form.capa_url
                  }
                  onChange={(
                    event
                  ) => {
                    set(
                      "capa_url",
                      event.target
                        .value
                    );

                    set(
                      "imagem_url",
                      event.target
                        .value
                    );
                  }}
                  placeholder="https://...jpg"
                />
              </Field>

              {/* VÍDEO */}

              <Field label="Vídeo (URL)">
                <Input
                  value={
                    form.video_url
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "video_url",
                      event.target
                        .value
                    )
                  }
                  placeholder="https://youtube.com/..."
                />
              </Field>

              {/* IMAGEM */}

              <Field label="Imagem (URL)">
                <Input
                  value={
                    form.imagem_url
                  }
                  onChange={(
                    event
                  ) =>
                    set(
                      "imagem_url",
                      event.target
                        .value
                    )
                  }
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
                  trilhasQuery.isLoading ||
                  uploadingCapa
                }
                className="w-full sm:w-auto"
              >
                {salvar.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : uploadingCapa ? (
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}

                {salvar.isPending
                  ? "Salvando..."
                  : uploadingCapa
                  ? "Enviando capa..."
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
