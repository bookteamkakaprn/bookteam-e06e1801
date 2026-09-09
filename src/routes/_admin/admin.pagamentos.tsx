import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Wallet,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_admin/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — Admin — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPag,
});

type StatusPagamento = "aguardando" | "aprovado" | "rejeitado";

type Pagamento = {
  id: string;
  status: StatusPagamento;
  valor: number;
  comprovante_url: string | null;
  observacao: string | null;
  aprovado_em?: string | null;
  aprovado_por?: string | null;
  created_at: string;
  inscricao:
    | {
        id: string;
        status: string;
        participante:
          | {
              id: string;
              nome: string | null;
              email: string | null;
              telefone: string | null;
            }
          | null;
        livro: { titulo: string; autor: string | null } | null;
        turma: {
          nome: string | null;
          data_inicio: string | null;
          data_fim: string | null;
        } | null;
        evento: {
          titulo: string | null;
          data: string | null;
          local: string | null;
        } | null;
      }
    | null;
};

const FILTROS = [
  { value: "aguardando", label: "Pendentes" },
  { value: "aprovado", label: "Aprovados" },
  { value: "rejeitado", label: "Recusados" },
  { value: "todos", label: "Todos" },
] as const;

type Filtro = (typeof FILTROS)[number]["value"];

function moeda(v: number) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(v: string | null) {
  return v
    ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR")
    : "—";
}

function AdminPag() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filtro>("aguardando");
  const [motivoId, setMotivoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const query = useQuery({
    queryKey: ["admin-pagamentos", filter],
    queryFn: async () => {
      let q = supabase
        .from("pagamentos")
        .select(
          `id,status,valor,comprovante_url,observacao,aprovado_em,aprovado_por,created_at,
           inscricao:inscricoes(
             id,status,
             participante:participantes(id,nome,email,telefone),
             livro:livros(titulo,autor),
             turma:turmas(nome,data_inicio,data_fim),
             evento:eventos(titulo,data,local)
           )`,
        )
        .order("created_at", { ascending: false });

      if (filter !== "todos") {
        q = q.eq("status", filter);
      }

      const { data, error } = await q;

      if (error) throw error;

      return (data ?? []) as unknown as Pagamento[];
    },
  });

  const decidir = useMutation({
    mutationFn: async ({
      pagamento,
      status,
      observacao,
    }: {
      pagamento: Pagamento;
      status: "aprovado" | "rejeitado";
      observacao: string | null;
    }) => {
      const { data: usuario } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("pagamentos")
        .update({
          status,
          observacao,
          aprovado_em:
            status === "aprovado" ? new Date().toISOString() : null,
          aprovado_por:
            status === "aprovado" ? usuario.user?.id ?? null : null,
        })
        .eq("id", pagamento.id);

      if (error) throw error;

      const participanteId = pagamento.inscricao?.participante?.id;

      if (participanteId) {
        const assunto =
          status === "aprovado"
            ? "Pagamento aprovado — Book Team"
            : "Pagamento não aprovado — Book Team";

        const mensagem =
          status === "aprovado"
            ? `Seu pagamento foi aprovado. Sua inscrição em ${
                pagamento.inscricao?.livro?.titulo ?? "Book Team"
              } está confirmada. Acesse sua área do aluno para acompanhar o próximo passo.`
            : `Seu pagamento não foi aprovado. Motivo: ${
                observacao || "Comprovante não validado."
              } Acesse sua área do aluno para regularizar o pagamento.`;

        const emailRes = await supabase.functions.invoke(
          "bookteam-send-notification-email",
          {
            body: {
              participante_id: participanteId,
              assunto,
              mensagem,
            },
          },
        );

        if (emailRes.error) {
          console.warn(
            "E-mail de status não enviado:",
            emailRes.error.message,
          );
        }
      }
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.status === "aprovado"
          ? "Pagamento aprovado."
          : "Pagamento recusado. O motivo foi registrado.",
      );

      setMotivoId(null);
      setMotivo("");

      qc.invalidateQueries({
        queryKey: ["admin-pagamentos"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-inscricoes"],
      });
      qc.invalidateQueries({
        queryKey: ["meus-pagamentos"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível atualizar o pagamento.",
      ),
  });

  const excluirAprovacao = useMutation({
    mutationFn: async (pagamento: Pagamento) => {
      if (
        !window.confirm(
          `Excluir a aprovação do pagamento de "${pagamento.inscricao?.participante?.nome ?? "Aluno"}"?\n\nO pagamento voltará para Pendentes.`,
        )
      ) {
        return false;
      }

      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "aguardando",
          aprovado_em: null,
          aprovado_por: null,
          observacao: null,
        })
        .eq("id", pagamento.id);

      if (error) throw error;

      return true;
    },
    onSuccess: (alterado) => {
      if (!alterado) return;

      toast.success("Aprovação excluída. O pagamento voltou para Pendentes.");

      qc.invalidateQueries({
        queryKey: ["admin-pagamentos"],
      });
      qc.invalidateQueries({
        queryKey: ["admin-inscricoes"],
      });
      qc.invalidateQueries({
        queryKey: ["meus-pagamentos"],
      });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível excluir a aprovação.",
      ),
  });

  async function abrirComprovante(url: string) {
    const { data, error } = await supabase.storage
      .from("comprovantes")
      .createSignedUrl(url, 300);

    if (error || !data?.signedUrl) {
      toast.error("Não foi possível abrir o comprovante.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function abrirMotivo(pagamento: Pagamento) {
    setMotivoId(pagamento.id);
    setMotivo("");
  }

  function confirmarRecusa(pagamento: Pagamento) {
    const texto = motivo.trim();

    if (!texto) {
      toast.error("Informe o motivo da recusa.");
      return;
    }

    decidir.mutate({
      pagamento,
      status: "rejeitado",
      observacao: texto,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">
            Aprovar pagamentos
          </h1>

          <p className="text-sm text-muted-foreground">
            Valide o comprovante e aprove ou recuse o pagamento.
          </p>
        </div>

        <Button asChild variant="outline" className="gap-2">
          <Link to="/admin/conta">
            <Wallet className="h-4 w-4" />
            Cadastrar conta PIX
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTROS.map((filtro) => (
          <Button
            key={filtro.value}
            size="sm"
            variant={filter === filtro.value ? "default" : "outline"}
            onClick={() => setFilter(filtro.value)}
          >
            {filtro.label}
          </Button>
        ))}
      </div>

      {query.isLoading && (
        <p className="text-sm text-muted-foreground">
          Carregando pagamentos…
        </p>
      )}

      {query.isError && (
        <p className="text-sm text-destructive">
          Não foi possível carregar os pagamentos.
        </p>
      )}

      {!query.isLoading &&
        !query.isError &&
        (query.data ?? []).length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhum pagamento neste filtro.
            </CardContent>
          </Card>
        )}

      <div className="space-y-3">
        {(query.data ?? []).map((pagamento) => {
          const aluno = pagamento.inscricao?.participante;
          const turma = pagamento.inscricao?.turma;
          const evento = pagamento.inscricao?.evento;
          const recusando = motivoId === pagamento.id;

          return (
            <Card key={pagamento.id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-serif text-lg font-semibold">
                      {aluno?.nome ?? "Aluno"}
                    </p>

                    <p className="text-sm">
                      {pagamento.inscricao?.livro?.titulo ??
                        evento?.titulo ??
                        "Curso não informado"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {turma?.nome ??
                        evento?.titulo ??
                        "Inscrição não informada"}{" "}
                      {turma?.data_inicio
                        ? `• ${dataBR(turma.data_inicio)}`
                        : evento?.data
                          ? `• ${dataBR(evento.data)}`
                          : ""}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {aluno?.email ?? ""}
                    </p>

                    {pagamento.status === "rejeitado" &&
                      pagamento.observacao && (
                        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                          <strong>Motivo:</strong>{" "}
                          {pagamento.observacao}
                        </p>
                      )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="font-serif text-lg">
                      {moeda(pagamento.valor)}
                    </span>

                    <Badge
                      variant={
                        pagamento.status === "aprovado"
                          ? "default"
                          : pagamento.status === "rejeitado"
                            ? "destructive"
                            : "secondary"
                      }
                      className="inline-flex items-center gap-1"
                    >
                      {pagamento.status === "aprovado" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : pagamento.status === "rejeitado" ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}

                      {pagamento.status === "aprovado"
                        ? "Aprovado"
                        : pagamento.status === "rejeitado"
                          ? "Recusado"
                          : "Pendente"}
                    </Badge>

                    {pagamento.comprovante_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          abrirComprovante(pagamento.comprovante_url!)
                        }
                      >
                        <ExternalLink className="mr-1 h-4 w-4" />
                        Comprovante
                      </Button>
                    )}

                    {pagamento.status === "aguardando" && (
                      <>
                        <Button
                          size="sm"
                          disabled={decidir.isPending}
                          onClick={() =>
                            decidir.mutate({
                              pagamento,
                              status: "aprovado",
                              observacao: null,
                            })
                          }
                        >
                          Aprovar pagamento
                        </Button>

                        {!recusando ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={decidir.isPending}
                            onClick={() => abrirMotivo(pagamento)}
                          >
                            Recusar
                          </Button>
                        ) : null}
                      </>
                    )}

                    {pagamento.status === "aprovado" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={excluirAprovacao.isPending}
                        onClick={() =>
                          excluirAprovacao.mutate(pagamento)
                        }
                        title="Excluir aprovação e voltar para pendentes"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Excluir aprovação
                      </Button>
                    )}
                  </div>
                </div>

                {recusando && pagamento.status === "aguardando" && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <Label
                      htmlFor={`motivo-${pagamento.id}`}
                      className="text-sm font-semibold"
                    >
                      Motivo da recusa
                    </Label>

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <Input
                        id={`motivo-${pagamento.id}`}
                        placeholder="Ex.: comprovante ilegível, valor divergente..."
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmarRecusa(pagamento);
                          }
                        }}
                      />

                      <Button
                        type="button"
                        variant="destructive"
                        disabled={decidir.isPending}
                        onClick={() => confirmarRecusa(pagamento)}
                      >
                        Confirmar recusa
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setMotivoId(null);
                          setMotivo("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
