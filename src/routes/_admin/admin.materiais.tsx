import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Upload,
  Loader2,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_admin/admin/materiais"
)({
  component: AdminMateriaisPage,
});

const MAX = 5 * 1024 * 1024;

type Livro = {
  id: string;
  titulo: string;
};

type Material = {
  id: string;
  livro_id: string;
  modulo: number;
  titulo: string;
  descricao: string | null;
  arquivo_nome: string | null;
  tamanho_bytes: number | null;
  mime_type: string | null;
  url: string;
  created_at: string;
};

function AdminMateriaisPage() {
  const qc = useQueryClient();

  // Curso usado para CADASTRAR um novo material
  const [livroId, setLivroId] = useState("");

  // Curso usado SOMENTE para FILTRAR a lista
  const [filtroLivroId, setFiltroLivroId] =
    useState("");

  const [modulo, setModulo] = useState("1");
  const [titulo, setTitulo] = useState("");
  const [file, setFile] =
    useState<File | null>(null);

  const [abrindo, setAbrindo] =
    useState<string | null>(null);

  /*
   * LIVROS / CURSOS
   */
  const livrosQ = useQuery({
    queryKey: ["admin-materiais-livros"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("id,titulo")
        .order("ordem");

      if (error) {
        throw new Error(
          `Não foi possível carregar os livros/cursos: ${error.message}`
        );
      }

      return (data ?? []) as Livro[];
    },
  });

  /*
   * BUSCA TODOS OS MATERIAIS
   *
   * IMPORTANTE:
   * Não depende mais do curso selecionado no formulário.
   */
  const matQ = useQuery({
    queryKey: ["admin-materiais-todos"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("materiais")
        .select(
          "id,livro_id,modulo,titulo,descricao,arquivo_nome,tamanho_bytes,mime_type,url,created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw new Error(
          `Não foi possível carregar os materiais: ${error.message}`
        );
      }

      return (data ?? []) as Material[];
    },
  });

  /*
   * ENVIAR MATERIAL
   */
  const enviar = useMutation({
    mutationFn: async () => {
      if (!livroId) {
        throw new Error(
          "Selecione o livro/curso."
        );
      }

      if (!modulo || Number(modulo) < 1) {
        throw new Error(
          "Informe um número de módulo válido."
        );
      }

      if (!file) {
        throw new Error(
          "Selecione um arquivo."
        );
      }

      if (file.size > MAX) {
        throw new Error(
          "O arquivo deve ter no máximo 5 MB."
        );
      }

      const ext = (
        file.name.split(".").pop() ||
        "bin"
      ).toLowerCase();

      const numeroModulo =
        Number(modulo) || 1;

      const path =
        `${livroId}/modulo-${numeroModulo}/` +
        `${crypto.randomUUID()}.${ext}`;

      /*
       * ENVIA O ARQUIVO PARA O STORAGE
       */
      const upload = await supabase.storage
        .from("book-materiais")
        .upload(
          path,
          file,
          {
            upsert: false,
            contentType:
              file.type ||
              "application/octet-stream",
          }
        );

      if (upload.error) {
        throw new Error(
          `Erro ao enviar arquivo: ${upload.error.message}`
        );
      }

      /*
       * SALVA O REGISTRO NO BANCO
       */
      const { error } = await supabase
        .from("materiais")
        .insert({
          livro_id: livroId,
          modulo: numeroModulo,
          titulo:
            titulo.trim() || file.name,
          arquivo_nome: file.name,
          tamanho_bytes: file.size,
          mime_type:
            file.type ||
            "application/octet-stream",
          tipo: "arquivo",
          url: path,
        });

      if (error) {
        await supabase.storage
          .from("book-materiais")
          .remove([path]);

        throw new Error(
          `Erro ao salvar material no banco: ${error.message}`
        );
      }

      return path;
    },

    onSuccess: () => {
      toast.success(
        "Material enviado para o módulo com sucesso!"
      );

      setTitulo("");
      setFile(null);

      const input =
        document.getElementById(
          "material-file"
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      // Atualiza a lista de materiais
      qc.invalidateQueries({
        queryKey: [
          "admin-materiais-todos",
        ],
      });
    },

    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o material."
      );
    },
  });

  /*
   * ABRIR MATERIAL
   */
  async function abrirMaterial(
    material: Material
  ) {
    try {
      setAbrindo(material.id);

      // Abre a aba imediatamente para evitar
      // bloqueio de popup do navegador.
      const novaAba = window.open(
        "about:blank",
        "_blank"
      );

      const {
        data,
        error,
      } = await supabase.storage
        .from("book-materiais")
        .createSignedUrl(
          material.url,
          300
        );

      if (error) {
        novaAba?.close();
        throw new Error(error.message);
      }

      if (!data?.signedUrl) {
        novaAba?.close();

        throw new Error(
          "Não foi possível gerar o acesso ao arquivo."
        );
      }

      if (novaAba) {
        novaAba.location.href =
          data.signedUrl;
      } else {
        window.open(
          data.signedUrl,
          "_blank",
          "noopener,noreferrer"
        );
      }
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
   * EXCLUIR MATERIAL
   */
  const excluir = useMutation({
    mutationFn: async (
      material: Material
    ) => {
      const { error } = await supabase
        .from("materiais")
        .delete()
        .eq("id", material.id);

      if (error) {
        throw new Error(
          `Não foi possível remover o material: ${error.message}`
        );
      }

      if (material.url) {
        const {
          error: storageError,
        } = await supabase.storage
          .from("book-materiais")
          .remove([
            material.url,
          ]);

        if (storageError) {
          throw new Error(
            `O cadastro foi removido, mas o arquivo não pôde ser removido: ${storageError.message}`
          );
        }
      }
    },

    onSuccess: () => {
      toast.success(
        "Material removido."
      );

      qc.invalidateQueries({
        queryKey: [
          "admin-materiais-todos",
        ],
      });
    },

    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível remover."
      );
    },
  });

  /*
   * TODOS OS MATERIAIS
   */
  const todosMateriais =
    matQ.data ?? [];

  /*
   * APLICA O FILTRO
   *
   * Se estiver em "Todos os cursos",
   * mostra tudo.
   */
  const materiaisFiltrados =
    filtroLivroId
      ? todosMateriais.filter(
          (material) =>
            material.livro_id ===
            filtroLivroId
        )
      : todosMateriais;

  /*
   * NOME DO CURSO
   */
  function nomeLivro(
    livroId: string
  ) {
    return (
      livrosQ.data?.find(
        (livro) =>
          livro.id === livroId
      )?.titulo ?? "Curso"
    );
  }

  return (
    <div className="space-y-5">

      {/* CABEÇALHO */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Conteúdo
        </p>

        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">
          Materiais dos módulos
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Envie PDF ou qualquer outro tipo de arquivo,
          com limite de 5 MB, para cada módulo.
        </p>
      </div>

      {/* ==========================================
          NOVO MATERIAL
          ========================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Novo material
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2">

          {/* CURSO DO NOVO MATERIAL */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>
              Livro / curso
            </Label>

            <Select
              value={livroId}
              onValueChange={
                setLivroId
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o livro ou curso" />
              </SelectTrigger>

              <SelectContent>
                {(
                  livrosQ.data ?? []
                ).map((livro) => (
                  <SelectItem
                    key={livro.id}
                    value={livro.id}
                  >
                    {livro.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MÓDULO */}
          <div className="space-y-1.5">
            <Label>
              Módulo
            </Label>

            <Input
              type="number"
              min="1"
              value={modulo}
              onChange={(event) =>
                setModulo(
                  event.target.value
                )
              }
            />
          </div>

          {/* TÍTULO */}
          <div className="space-y-1.5">
            <Label>
              Título do material
            </Label>

            <Input
              value={titulo}
              onChange={(event) =>
                setTitulo(
                  event.target.value
                )
              }
              placeholder="Ex.: Apostila do módulo 1"
            />
          </div>

          {/* ARQUIVO */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="material-file">
              Arquivo — até 5 MB
            </Label>

            <Input
              id="material-file"
              type="file"
              onChange={(event) =>
                setFile(
                  event.target.files?.[0] ??
                    null
                )
              }
            />

            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name}
                {" · "}
                {(
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </p>
            )}
          </div>

          {/* BOTÃO ENVIAR */}
          <div className="sm:col-span-2">
            <Button
              disabled={
                enviar.isPending ||
                !livroId ||
                !file
              }
              onClick={() =>
                enviar.mutate()
              }
            >
              {enviar.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}

              {enviar.isPending
                ? "Enviando..."
                : "Enviar material"}
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* ==========================================
          MATERIAIS CADASTRADOS
          ========================================== */}
      <Card>
        <CardHeader>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <CardTitle className="text-lg">
                Materiais cadastrados
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                {materiaisFiltrados.length}{" "}
                {materiaisFiltrados.length ===
                1
                  ? "material"
                  : "materiais"}
              </p>
            </div>

            {/* FILTRO SEPARADO */}
            <div className="w-full sm:w-80">

              <Label className="mb-1.5 block text-xs">
                Filtrar por curso
              </Label>

              <Select
                value={
                  filtroLivroId ||
                  "todos"
                }
                onValueChange={(
                  value
                ) => {
                  setFiltroLivroId(
                    value ===
                      "todos"
                      ? ""
                      : value
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="todos">
                    Todos os cursos
                  </SelectItem>

                  {(
                    livrosQ.data ?? []
                  ).map((livro) => (
                    <SelectItem
                      key={livro.id}
                      value={livro.id}
                    >
                      {livro.titulo}
                    </SelectItem>
                  ))}

                </SelectContent>
              </Select>

            </div>

          </div>

        </CardHeader>

        <CardContent className="space-y-2">

          {/* CARREGANDO */}
          {matQ.isLoading && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando materiais…
            </div>
          )}

          {/* ERRO */}
          {matQ.error && (
            <div className="rounded-lg border border-destructive/40 p-4">
              <p className="font-medium text-destructive">
                Não foi possível carregar os materiais.
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {matQ.error instanceof Error
                  ? matQ.error.message
                  : "Erro desconhecido."}
              </p>
            </div>
          )}

          {/* NENHUM MATERIAL */}
          {!matQ.isLoading &&
            !matQ.error &&
            materiaisFiltrados.length ===
              0 && (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <FileText className="mb-2 h-8 w-8 text-muted-foreground" />

                <p className="font-medium">
                  Nenhum material cadastrado
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Os materiais cadastrados aparecerão aqui.
                </p>
              </div>
            )}

          {/* LISTA */}
          {!matQ.isLoading &&
            !matQ.error &&
            materiaisFiltrados.map(
              (material) => (
                <div
                  key={material.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                >

                  {/* ÍCONE */}
                  <FileText className="h-5 w-5 shrink-0 text-primary" />

                  {/* INFORMAÇÕES */}
                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-medium">
                      {material.titulo}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {nomeLivro(
                        material.livro_id
                      )}
                      {" · "}
                      Módulo{" "}
                      {material.modulo}
                      {" · "}
                      {material.arquivo_nome ||
                        "Arquivo"}

                      {material.tamanho_bytes
                        ? ` · ${(
                            material.tamanho_bytes /
                            1024 /
                            1024
                          ).toFixed(
                            2
                          )} MB`
                        : ""}
                    </p>

                  </div>

                  {/* MÓDULO */}
                  <Badge
                    variant="outline"
                  >
                    Módulo{" "}
                    {material.modulo}
                  </Badge>

                  {/* ABRIR */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      abrindo ===
                      material.id
                    }
                    onClick={() =>
                      abrirMaterial(
                        material
                      )
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

                  {/* EXCLUIR */}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover material"
                    disabled={
                      excluir.isPending
                    }
                    onClick={() => {
                      if (
                        confirm(
                          `Remover o material "${material.titulo}"?`
                        )
                      ) {
                        excluir.mutate(
                          material
                        );
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                </div>
              )
            )}

        </CardContent>
      </Card>

    </div>
  );
}
