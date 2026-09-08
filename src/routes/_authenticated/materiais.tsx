import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/materiais")({
  component: MateriaisPage,
});

type Material = {
  id: string;
  livro_id: string;
  modulo: number;
  titulo: string;
  arquivo_nome: string | null;
  tamanho_bytes: number | null;
  mime_type: string | null;
  url: string;
};

type Livro = {
  id: string;
  titulo: string;
};

type Inscricao = {
  livro_id: string | null;
  status: string;
  livros: Livro | null;
};

function MateriaisPage() {
  const { user } = useAuth();

  const [abrindo, setAbrindo] = useState<string | null>(null);

  /*
   * BUSCA OS CURSOS DO ALUNO E OS MATERIAIS
   */
  const q = useQuery({
    enabled: !!user,

    queryKey: ["meus-materiais", user?.id],

    queryFn: async () => {
      if (!user) {
        return {
          materiais: [] as Material[],
          livros: [] as Livro[],
        };
      }

      /*
       * Busca todas as inscrições do aluno.
       *
       * Não restringimos inicialmente por status.
       * Assim conseguimos identificar corretamente
       * quais cursos pertencem ao aluno.
       */
      const { data: ins, error: insError } = await supabase
        .from("inscricoes")
        .select(
          "livro_id,status,livros(id,titulo)"
        )
        .eq("participante_id", user.id);

      if (insError) {
        throw new Error(
          `Erro ao carregar seus cursos: ${insError.message}`
        );
      }

      const inscricoes =
        (ins ?? []) as unknown as Inscricao[];

      /*
       * Consideramos somente inscrições que realmente
       * possuem um livro/curso.
       */
      const inscricoesComLivro =
        inscricoes.filter(
          (item) => !!item.livro_id && !!item.livros
        );

      /*
       * IDs únicos dos cursos.
       */
      const ids = [
        ...new Set(
          inscricoesComLivro
            .map((item) => item.livro_id)
            .filter(
              (id): id is string => !!id
            )
        ),
      ];

      /*
       * Lista de livros/cursos.
       */
      const livros = [
        ...new Map(
          inscricoesComLivro.map((item) => [
            item.livros!.id,
            item.livros!,
          ])
        ).values(),
      ];

      if (!ids.length) {
        return {
          materiais: [] as Material[],
          livros,
        };
      }

      /*
       * Busca os materiais dos cursos.
       */
      const {
        data: materiais,
        error: materiaisError,
      } = await supabase
        .from("materiais")
        .select(
          "id,livro_id,modulo,titulo,arquivo_nome,tamanho_bytes,mime_type,url"
        )
        .in("livro_id", ids)
        .order("livro_id")
        .order("modulo")
        .order("created_at");

      if (materiaisError) {
        throw new Error(
          `Erro ao carregar materiais: ${materiaisError.message}`
        );
      }

      return {
        materiais: (materiais ?? []) as Material[],
        livros,
      };
    },
  });

  /*
   * ABRIR MATERIAL
   */
  async function abrir(m: Material) {
    try {
      setAbrindo(m.id);

      const {
        data,
        error,
      } = await supabase.storage
        .from("book-materiais")
        .createSignedUrl(m.url, 300);

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.signedUrl) {
        throw new Error(
          "Não foi possível gerar o acesso ao arquivo."
        );
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Não foi possível abrir o material: ${error.message}`
          : "Não foi possível abrir o material."
      );
    } finally {
      setAbrindo(null);
    }
  }

  /*
   * DADOS
   */
  const materiais = q.data?.materiais ?? [];
  const livros = q.data?.livros ?? [];

  /*
   * AGRUPA POR CURSO
   */
  const groups = new Map<
    string,
    Material[]
  >();

  for (const material of materiais) {
    const lista =
      groups.get(material.livro_id) ?? [];

    lista.push(material);

    groups.set(
      material.livro_id,
      lista
    );
  }

  return (
    <div className="space-y-6">

      {/* CABEÇALHO */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Área do aluno
        </p>

        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">
          Materiais dos módulos
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Acesse os materiais disponibilizados para os seus cursos.
        </p>
      </div>

      {/* CARREGANDO */}
      {q.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando materiais…
        </div>
      )}

      {/* ERRO */}
      {q.error && (
        <Card>
          <CardContent className="p-6">
            <p className="font-medium text-destructive">
              Não foi possível carregar os materiais.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {q.error instanceof Error
                ? q.error.message
                : "Erro desconhecido."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* NENHUM MATERIAL */}
      {!q.isLoading &&
        !q.error &&
        groups.size === 0 && (
          <Card>
            <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
              <FolderOpen className="mb-2 h-8 w-8 text-muted-foreground" />

              <p className="font-medium">
                Nenhum material disponível
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Os materiais aparecem aqui quando o ADM os disponibilizar.
              </p>
            </CardContent>
          </Card>
        )}

      {/* CURSOS */}
      {[...groups.entries()].map(
        ([livroId, items]) => {
          const livro = livros.find(
            (l) => l.id === livroId
          );

          /*
           * AGRUPA POR MÓDULO
           */
          const modulos = new Map<
            number,
            Material[]
          >();

          for (const material of items) {
            const lista =
              modulos.get(material.modulo) ?? [];

            lista.push(material);

            modulos.set(
              material.modulo,
              lista
            );
          }

          return (
            <Card key={livroId}>

              <CardHeader>
                <CardTitle className="text-lg">
                  {livro?.titulo ?? "Curso"}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">

                {[...modulos.entries()]
                  .sort(
                    ([a], [b]) => a - b
                  )
                  .map(
                    ([modulo, materiaisModulo]) => (
                      <section
                        key={modulo}
                        className="space-y-2"
                      >

                        <div className="flex items-center gap-2">
                          <Badge>
                            Módulo {modulo}
                          </Badge>
                        </div>

                        {materiaisModulo.map(
                          (material) => (
                            <div
                              key={material.id}
                              className="flex items-center gap-3 rounded-lg border p-3"
                            >

                              <FileText className="h-5 w-5 shrink-0 text-primary" />

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {material.titulo}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {material.arquivo_nome ||
                                    "Arquivo"}

                                  {material.tamanho_bytes
                                    ? ` · ${(
                                        material.tamanho_bytes /
                                        1024 /
                                        1024
                                      ).toFixed(2)} MB`
                                    : ""}
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  abrindo ===
                                  material.id
                                }
                                onClick={() =>
                                  abrir(material)
                                }
                              >
                                {abrindo ===
                                material.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="mr-2 h-4 w-4" />
                                )}

                                {abrindo ===
                                material.id
                                  ? "Abrindo..."
                                  : "Abrir"}
                              </Button>

                            </div>
                          )
                        )}

                      </section>
                    )
                  )}

              </CardContent>
            </Card>
          );
        }
      )}

    </div>
  );
}
