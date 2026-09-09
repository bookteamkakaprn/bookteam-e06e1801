import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Clock, PlayCircle, CreditCard, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/inscricoes")({
  head: () => ({
    meta: [
      {
        title: "Aprovar inscrições — Admin — Book Team",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: AdminInscricoes,
});

type Filtro = "pendentes" | "aprovadas" | "rejeitadas";

type Inscricao = {
  id: string;
  status: string;
  created_at: string;
  motivo_rejeicao: string | null;
  motivo_cancelamento: string | null;
  participante:
    | {
        id: string;
        nome: string | null;
        email: string | null;
        status: string;
      }
    | null;
  livro: {
    titulo: string | null;
    autor: string | null;
  } | null;
  turma: {
    nome: string | null;
    data_inicio: string | null;
    data_fim: string | null;
  } | null;
  pagamentos: {
    id: string;
    status: "aguardando" | "aprovado" | "rejeitado";
    valor: number;
    observacao?: string | null;
  }[];
};

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "pendentes", label: "Pendentes" },
  { value: "aprovadas", label: "Aprovadas" },
  { value: "rejeitadas", label: "Rejeitadas" },
];

function dataBR(v: string | null) {
  return v
    ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR")
    : "—";
}

function AdminInscricoes() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const [recusando, setRecusando] = useState<Inscricao | null>(null);
  const [motivo, setMotivo] = useState("");

  const query = useQuery({
    queryKey: ["admin-inscricoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          `id,status,created_at,motivo_rejeicao,motivo_cancelamento,
           participante:participantes(id,nome,email,status),
           livro:livros(titulo,autor),
           turma:turmas(nome,data_inicio,data_fim),
           pagamentos(id,status,valor,observacao)`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []) as unknown as Inscricao[];
    },
  });

  const aprovar = useMutation({
    mutationFn: async (inscricao: Inscricao) => {
      const pagamentoAprovado = inscricao.pagamentos?.some(
        (pagamento) => pagamento.status === "aprovado",
      );

      if (!pagamentoAprovado) {
        throw new Error(
          "A inscrição só pode ser aprovada depois que o pagamento estiver aprovado.",
        );
      }

      const { error } = await supabase
        .from("inscricoes")
        .update({
          status: "confirmada",
          motivo_rejeicao: null,
          motivo_cancelamento: null,
        })
        .eq("id", inscricao.id);

      if (error) throw error;

      const participanteId = inscricao.participante?.id;

      if (participanteId) {
        const curso = inscricao.livro?.titulo ?? "seu curso";

        const { error: notificacaoError } = await supabase
          .from("notificacoes")
          .insert({
            participante_id: participanteId,
            titulo: "Inscrição aprovada — Book Team",
            mensagem: `Sua inscrição em ${curso} foi aprovada. Acesse sua área do aluno para acompanhar o próximo passo.`,
            lida: false,
          });

        if (notificacaoError) {
          console.warn("Notificação não criada:", notificacaoError.message);
        }
      }
    },
    onSuccess: () => {
      toast.success("Inscrição aprovada.");
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível aprovar a inscrição.",
      ),
  });

  const liberar = useMutation({
    mutationFn: async (inscricao: Inscricao) => {
      if (inscricao.status !== "confirmada") {
        throw new Error("A inscrição ainda não está confirmada.");
      }

      const pid = inscricao.participante?.id;

      if (!pid) {
        throw new Error("Aluno não encontrado.");
      }

      const pagamentoAprovado = inscricao.pagamentos?.some(
        (pagamento) => pagamento.status === "aprovado",
      );

      if (!pagamentoAprovado) {
        throw new Error(
          "O início só pode ser liberado depois que o pagamento estiver aprovado.",
        );
      }

      const { error } = await supabase
        .from("participantes")
        .update({ status: "participando" })
        .eq("id", pid);

      if (error) throw error;

      const livro = inscricao.livro?.titulo ?? "Book Team";

      const { error: notificacaoError } = await supabase
        .from("notificacoes")
        .insert({
          participante_id: pid,
          titulo: "Você pode iniciar sua jornada!",
          mensagem: `Sua inscrição em ${livro} está confirmada e você já pode iniciar sua jornada.`,
          lida: false,
        });

      if (notificacaoError) {
        console.warn("Notificação de liberação não criada:", notificacaoError.message);
      }
    },
    onSuccess: () => {
      toast.success("Aluno liberado para iniciar.");
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível liberar o aluno.",
      ),
  });

  const recusar = useMutation({
    mutationFn: async ({
      inscricao,
      motivoRecusa,
    }: {
      inscricao: Inscricao;
      motivoRecusa: string;
    }) => {
      const texto = motivoRecusa.trim();

      if (!texto) {
        throw new Error("Informe o motivo da rejeição.");
      }

      const { error } = await supabase
        .from("inscricoes")
        .update({
          status: "cancelada",
          motivo_rejeicao: texto,
          motivo_cancelamento: texto,
        })
        .eq("id", inscricao.id);

      if (error) throw error;

      const participanteId = inscricao.participante?.id;

      if (participanteId) {
        const curso = inscricao.livro?.titulo ?? "Book Team";

        const { error: notificacaoError } = await supabase
          .from("notificacoes")
          .insert({
            participante_id: participanteId,
            titulo: "Inscrição não aprovada — Book Team",
            mensagem: `Sua inscrição em ${curso} não foi aprovada. Motivo: ${texto}`,
            lida: false,
          });

        if (notificacaoError) {
          console.warn("Notificação de rejeição não criada:", notificacaoError.message);
        }

        const emailRes = await supabase.functions.invoke(
          "bookteam-send-notification-email",
          {
            body: {
              participante_id: participanteId,
              assunto: "Inscrição não aprovada — Book Team",
              mensagem: `Sua inscrição em ${curso} não foi aprovada. Motivo: ${texto}. Acesse sua área do aluno para verificar a situação.`,
            },
          },
        );

        if (emailRes.error) {
          console.warn(
            "E-mail de rejeição não enviado:",
            emailRes.error.message,
          );
        }
      }
    },
    onSuccess: () => {
      toast.success("Inscrição rejeitada. O motivo foi registrado.");
      setRecusando(null);
      setMotivo("");

      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível rejeitar a inscrição.",
      ),
  });

  const pendentes = (query.data ?? []).filter((inscricao) => {
    const pagamentoAprovado = inscricao.pagamentos?.some(
      (pagamento) => pagamento.status === "aprovado",
    );

    return inscricao.status !== "cancelada" &&
      inscricao.status !== "confirmada" &&
      pagamentoAprovado;
  });

  const aprovadas = (query.data ?? []).filter(
    (inscricao) => inscricao.status === "confirmada",
  );

  const rejeitadas = (query.data ?? []).filter(
    (inscricao) => inscricao.status === "cancelada",
  );

  const lista =
    filtro === "pendentes"
      ? pendentes
      : filtro === "aprovadas"
        ? aprovadas
        : rejeitadas;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold">
          Aprovar inscrições
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Depois que o pagamento for aprovado, a inscrição fica disponível aqui
          para confirmação.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTROS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filtro === item.value ? "default" : "outline"}
            onClick={() => setFiltro(item.value)}
          >
            {item.label}
            {item.value === "pendentes" && pendentes.length > 0
              ? ` (${pendentes.length})`
              : ""}
            {item.value === "aprovadas" && aprovadas.length > 0
              ? ` (${aprovadas.length})`
              : ""}
            {item.value === "rejeitadas" && rejeitadas.length > 0
              ? ` (${rejeitadas.length})`
              : ""}
          </Button>
        ))}
      </div>

      {query.isLoading && (
        <p className="text-sm text-muted-foreground">
          Carregando inscrições…
        </p>
      )}

      {query.isError && (
        <p className="text-sm text-destructive">
          Não foi possível carregar as inscrições.
        </p>
      )}

      {!query.isLoading && lista.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {filtro === "pendentes"
              ? "Nenhuma inscrição aguardando aprovação."
              : filtro === "aprovadas"
                ? "Nenhuma inscrição aprovada."
                : "Nenhuma inscrição rejeitada."}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {lista.map((inscricao) => {
          const aluno = inscricao.participante;
          const pagamentoAprovado = inscricao.pagamentos?.some(
            (pagamento) => pagamento.status === "aprovado",
          );
          const pagamentoAguardando = inscricao.pagamentos?.some(
            (pagamento) => pagamento.status === "aguardando",
          );

          return (
            <Card key={inscricao.id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-serif text-lg font-semibold">
                        {aluno?.nome ?? "Aluno"}
                      </p>

                      {pagamentoAprovado ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Pagamento aprovado
                        </Badge>
                      ) : pagamentoAguardando ? (
                        <Badge variant="outline" className="gap-1">
                          <CreditCard className="h-3 w-3" />
                          Aguardando pagamento
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Sem pagamento
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm">
                      {inscricao.livro?.titulo ?? "Curso não informado"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {inscricao.turma?.nome ?? "Turma não informada"}
                      {inscricao.turma?.data_inicio
                        ? ` • ${dataBR(inscricao.turma.data_inicio)}`
                        : ""}
                      {inscricao.turma?.data_fim
                        ? ` até ${dataBR(inscricao.turma.data_fim)}`
                        : ""}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {aluno?.email ?? ""}
                    </p>

                    {inscricao.motivo_rejeicao && (
                      <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                        <strong>Motivo da rejeição:</strong>{" "}
                        {inscricao.motivo_rejeicao}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {filtro === "pendentes" && (
                      <>
                        <Button
                          onClick={() => aprovar.mutate(inscricao)}
                          disabled={aprovar.isPending || !pagamentoAprovado}
                          className="gap-1"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprovar inscrição
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            setRecusando(inscricao);
                            setMotivo("");
                          }}
                          disabled={recusar.isPending}
                          className="gap-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Recusar
                        </Button>
                      </>
                    )}

                    {filtro === "aprovadas" && (
                      <Button
                        disabled={liberar.isPending}
                        onClick={() => liberar.mutate(inscricao)}
                        className="gap-1"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Liberar início
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={!!recusando}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setRecusando(null);
            setMotivo("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rejeitar inscrição</DialogTitle>
          </DialogHeader>

          {recusando && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                recusar.mutate({
                  inscricao: recusando,
                  motivoRecusa: motivo,
                });
              }}
            >
              <div>
                <p className="text-sm font-medium">
                  {recusando.participante?.nome ?? "Aluno"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {recusando.livro?.titulo ?? "Curso não informado"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motivo-rejeicao">
                  Justificativa da rejeição
                </Label>
                <Input
                  id="motivo-rejeicao"
                  placeholder="Digite o motivo que o aluno deverá corrigir..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRecusando(null);
                    setMotivo("");
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  variant="destructive"
                  disabled={recusar.isPending || !motivo.trim()}
                >
                  {recusar.isPending ? "Salvando..." : "Confirmar rejeição"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
