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
  trilha_id: "",
  nivel_id: "",

  titulo: "",
  autor: "",

  ordem: "1",

  categoria: "",
  descricao: "",

  valor: "",
  vagas: "0",

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

  const [
    uploadingCapa,
    setUploadingCapa,
  ] = useState(false);

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

  const [
    novoNivelTrilha,
    setNovoNivelTrilha,
  ] = useState("");

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
     TRILHAS COMPLEMENTARES
  ======================================================= */

  const trilhasComplementares =
    useMemo(
      () =>
        trilhas.filter(
          (trilha) =>
            trilha.id !==
            trilhaJornada?.id
        ),
      [trilhas, trilhaJornada]
    );

  /* =======================================================
     NÍVEIS DO FILTRO
  ======================================================= */

  const niveisFiltrados =
    useMemo(() => {
      if (filtroNivel === "todos") {
        return niveis;
      }

      return niveis.filter(
        (nivel) =>
          nivel.id === filtroNivel
      );
    }, [niveis, filtroNivel]);

  /* =======================================================
     ENVIO DE CAPA
  ======================================================= */

  async function enviarCapa(
    file: File
  ) {
    if (
      file.type !== "image/jpeg"
    ) {
      throw new Error(
        "A capa deve estar em JPG ou JPEG."
      );
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      throw new Error(
        "A capa deve ter no máximo 5 MB."
      );
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
        throw up.error;
      }

      const {
        data,
      } =
        supabase.storage
          .from("book-capas")
          .getPublicUrl(path);

      setForm((f) => ({
        ...f,
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

      const payload = {
        trilha_id:
          form.trilha_id,

        nivel_id:
          form.nivel_id ||
          null,

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

        valor:
          form.valor.trim() === ""
            ? null
            : Number(form.valor),

        vagas:
          form.vagas.trim() === ""
            ? 0
            : Number(form.vagas),

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
          throw error;
        }
      } else {
        const {
          error,
        } = await supabase
          .from("livros")
          .insert(payload);

        if (error) {
          throw error;
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

    onError: (
      e: unknown
    ) => {
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
              "Jornada",

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

  const cadastrarNivel =
    useMutation({
      mutationFn:
        async () => {
          const nome =
            novoNivelNome.trim();

          if (!nome) {
            throw new Error(
              "Informe o nome do nível."
            );
          }

          if (
            !novoNivelTrilha
          ) {
            throw new Error(
              "Selecione a trilha do nível."
            );
          }

          const {
            error,
          } = await supabase
            .from(
              "niveis_trilha"
            )
            .insert({
              nome,
              trilha_id:
                novoNivelTrilha,
              ordem:
                niveis.length +
                1,
            });

          if (error) {
            throw error;
          }
        },

      onSuccess:
        async () => {
          toast.success(
            "Nível cadastrado!"
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

      onError: (
        e: unknown
      ) =>
        toast.error(
          e instanceof Error
            ? e.message
            : "Não foi possível cadastrar o nível."
        ),
    });

  /* =======================================================
     EDITAR
  ======================================================= */

  function editar(
    livro: Livro
  ) {
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
            ),

      vagas:
        String(
          livro.vagas ??
            0
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
     ALTERAR FORM
  ======================================================= */

  function set(
    key: keyof FormLivro,
    value: string
  ) {
    setForm(
      (atual) => ({
        ...atual,
        [key]: value,
      })
    );
  }

  /* =======================================================
     CURSOS DA JORNADA
  ======================================================= */

  const livrosJornada =
    livros
      .filter(
        (livro) =>
          livro.trilha_id ===
          trilhaJornada?.id
      )
      .filter(
        (livro) =>
          filtroNivel ===
            "todos" ||
          livro.nivel_id ===
            filtroNivel
      )
      .sort(
        (a, b) =>
          Number(a.ordem) -
          Number(b.ordem)
      );

  /* =======================================================
     CURSOS COMPLEMENTARES
  ======================================================= */

  const livrosComplementares =
    livros
      .filter(
        (livro) =>
          livro.trilha_id !==
            trilhaJornada?.id
      )
      .filter(
        (livro) =>
          filtroNivel ===
            "todos" ||
          livro.nivel_id ===
            filtroNivel
      )
      .sort(
        (a, b) =>
          Number(a.ordem) -
          Number(b.ordem)
      );

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
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="font-medium">
              Filtrar cursos
            </p>

            <p className="text-xs text-muted-foreground">
              Selecione um nível para visualizar somente os cursos daquele nível.
            </p>
          </div>

          <div className="w-full sm:w-80">
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
          LIVROS DA JORNADA
      =================================================== */}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Livros da Jornada
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">

          {livrosJornada.length ===
            0 && (
            <p className="py-5 text-sm text-muted-foreground">
              Nenhum curso da Jornada encontrado para este filtro.
            </p>
          )}

          {livrosJornada.map(
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
          CURSOS COMPLEMENTARES
      =================================================== */}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Cursos Complementares
          </CardTitle>

          {trilhasComplementares.length >
            0 && (
            <p className="text-xs text-muted-foreground">
              {
                trilhasComplementares
                  .map(
                    (
                      trilha
                    ) =>
                      trilha.nome
                  )
                  .join(
                    " · "
                  )
              }
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-2">

          {livrosComplementares.length ===
            0 && (
            <p className="py-5 text-sm text-muted-foreground">
              Nenhum curso complementar cadastrado para este filtro.
            </p>
          )}

          {livrosComplementares.map(
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

              {/* TRILHA */}

              <Field label="Trilha">
                <Select
                  value={
                    form.trilha_id
                  }
                  onValueChange={(
                    value
                  ) =>
                    set(
                      "trilha_id",
                      value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a trilha" />
                  </SelectTrigger>

                  <SelectContent>
                    {trilhas.map(
                      (
                        trilha
                      ) => (
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

                    {niveis
                      .filter(
                        (
                          nivel
                        ) =>
                          !form.trilha_id ||
                          !nivel.trilha_id ||
                          nivel.trilha_id ===
                            form.trilha_id
                      )
                      .map(
                        (
                          nivel
                        ) => (
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
                      event.target
                        .value
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
