import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PagPage,
});

type PagRow = {
  id: string;
  status: string;
  valor: number;
  comprovante_url: string | null;
  comprovante_enviado_em: string | null;
  observacao: string | null;
  created_at: string;
  inscricao:
    | {
        id: string;
        evento:
          | {
              id: string;
              titulo: string;
              data: string;
            }
          | null;
        livro:
          | {
              titulo: string | null;
            }
          | null;
      }
    | null;
};

function PagPage() {
  const { user } = useAuth();
  const [abrindoComprovante, setAbrindoComprovante] = useState<string | null>(
    null
  );
  const [uploadandoComprovante, setUploadandoComprovante] = useState<
    string | null
  >(null);

  const { data, isLoading, error, refetch } = useQuery({
    enabled: !!user,
    queryKey: ["meus-pagamentos", user?.id],

    queryFn: async () => {
      const inscricoesRes = await supabase
        .from("inscricoes")
        .select("id")
        .eq("participante_id", user!.id);

      if (inscricoesRes.error) {
        throw inscricoesRes.error;
      }

      const ids = (inscricoesRes.data ?? []).map((i) => i.id);

      if (!ids.length) {
        return [] as PagRow[];
      }

      const pagamentosRes = await supabase
        .from("pagamentos")
        .select(
          "id,status,valor,comprovante_url,observacao,created_at,comprovante_enviado_em,inscricao:inscricoes(id,evento:eventos(id,titulo,data),livro:livros(titulo))"
        )
        .in("inscricao_id", ids)
        .order("created_at", { ascending: false });

      if (pagamentosRes.error) {
        throw pagamentosRes.error;
      }

      return (pagamentosRes.data ?? []) as unknown as PagRow[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      pagamentoId,
      file,
    }: {
      pagamentoId: string;
      file: File;
    }) => {
      // 1. Upload do arquivo para Storage
      const fileName = `${pagamentoId}-${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("comprovantes")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Atualizar pagamento com URL + timestamp
      const { error: updateError } = await supabase
        .from("pagamentos")
        .update({
          comprovante_url: uploadData.path,
          comprovante_enviado_em: new Date().toISOString(),
        })
        .eq("id", pagamentoId);

      if (updateError) throw updateError;

      return uploadData;
    },
    onSuccess: () => {
      toast.success("Comprovante enviado com sucesso! ✅");
      refetch();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error ? e.message : "Erro ao enviar comprovante";
      toast.error(`Erro: ${msg}`);
    },
  });

  const badge = (s: string) => {
    if (s === "aprovado") {
      return {
        Icon: CheckCircle2,
        variant: "default" as const,
        label: "Aprovado",
      };
    }

    if (s === "rejeitado") {
      return {
        Icon: XCircle,
        variant: "destructive" as const,
        label: "Rejeitado",
      };
    }

    return {
      Icon: Clock,
      variant: "secondary" as const,
      label: "Aguardando",
    };
  };

  const verComprovante = async (
    pagamentoId: string,
    comprovantePath: string
  ) => {
    setAbrindoComprovante(pagamentoId);

    const novaAba = window.open("about:blank", "_blank");

    try {
      const { data: signedData, error } = await supabase.storage
        .from("comprovantes")
        .createSignedUrl(comprovantePath, 300);

      if (error) {
        novaAba?.close();
        throw error;
      }

      if (!signedData?.signedUrl) {
        novaAba?.close();
        throw new Error("Não foi possível gerar o link do comprovante.");
      }

      if (novaAba) {
        novaAba.location.href = signedData.signedUrl;
      } else {
        window.location.href = signedData.signedUrl;
      }
    } catch (e: unknown) {
      novaAba?.close();

      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível abrir o comprovante."
      );
    } finally {
      setAbrindoComprovante(null);
    }
  };

  const handleUploadComprovante = async (
    pagamentoId: string,
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validações
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    const tiposValidos = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!tiposValidos.includes(file.type)) {
      toast.error("Tipo de arquivo inválido. Use JPG, PNG, WebP ou PDF.");
      return;
    }

    setUploadandoComprovante(pagamentoId);
    try {
      await uploadMutation.mutateAsync({ pagamentoId, file });
    } finally {
      setUploadandoComprovante(null);
    }
  };

  const pagamentos = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold">Pagamentos</h1>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      )}

      {error && (
        <p className="text-sm text-destructive">
          Não foi possível carregar seus pagamentos.
        </p>
      )}

      {!isLoading && !error && pagamentos.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum pagamento enviado ainda.
          </CardContent>
        </Card>
      )}

      {pagamentos.map((p) => {
        const b = badge(p.status);
        const Icon = b.Icon;

        return (
          <Card key={p.id}>
            <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="font-serif text-lg font-semibold">
                  {p.inscricao?.livro?.titulo ??
                    p.inscricao?.evento?.titulo ??
                    "Book Team"}
                </p>

                {p.inscricao?.evento?.titulo && (
                  <p className="text-sm text-muted-foreground">
                    {p.inscricao.evento.titulo}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Enviado em{" "}
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </p>

                {p.comprovante_url && (
                  <div className="flex items-center gap-2 pt-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      Comprovante enviado
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-1 gap-1"
                      disabled={abrindoComprovante === p.id}
                      onClick={() =>
                        verComprovante(p.id, p.comprovante_url!)
                      }
                    >
                      {abrindoComprovante === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}

                      {abrindoComprovante === p.id
                        ? "Abrindo..."
                        : "Ver comprovante"}
                    </Button>
                  </div>
                )}

                {p.status === "rejeitado" && p.observacao && (
                  <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs font-semibold text-destructive">
                      Motivo da recusa:
                    </p>
                    <p className="mt-1 text-sm text-destructive">
                      {p.observacao}
                    </p>
                  </div>
                )}

                {p.status === "aguardando" && !p.comprovante_url && (
                  <div className="mt-3 rounded-md border border-blue-300/30 bg-blue-50/50 p-3 dark:border-blue-600/30 dark:bg-blue-950/20">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                      Enviar Comprovante de Pagamento
                    </p>

                    <div className="mt-2 space-y-2">
                      <label
                        htmlFor={`upload-${p.id}`}
                        className="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-blue-300 p-3 text-center transition hover:border-blue-400 hover:bg-blue-100/30 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs text-blue-700 dark:text-blue-300">
                            {uploadandoComprovante === p.id
                              ? "Enviando..."
                              : "Clique para selecionar arquivo"}
                          </span>
                          <span className="text-xs text-blue-600/60 dark:text-blue-400/60">
                            PDF, JPG, PNG ou WebP (máx 5MB)
                          </span>
                        </div>

                        <input
                          id={`upload-${p.id}`}
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          disabled={uploadandoComprovante === p.id}
                          onChange={(e) =>
                            handleUploadComprovante(p.id, e.target.files)
                          }
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="font-serif text-lg">
                  {Number(p.valor).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>

                <Badge
                  variant={b.variant}
                  className="inline-flex items-center gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {b.label}
                </Badge>

                {p.inscricao?.evento?.id && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/inscricao/$eventoId"
                      params={{
                        eventoId: p.inscricao.evento.id,
                      }}
                    >
                      Ver
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
