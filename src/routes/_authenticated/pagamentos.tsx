import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

  const { data, isLoading, error } = useQuery({
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
          "id,status,valor,comprovante_url,observacao,created_at,inscricao:inscricoes(id,evento:eventos(id,titulo,data),livro:livros(titulo))"
        )
        .in("inscricao_id", ids)
        .order("created_at", { ascending: false });

      if (pagamentosRes.error) {
        throw pagamentosRes.error;
      }

      return (pagamentosRes.data ?? []) as unknown as PagRow[];
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
