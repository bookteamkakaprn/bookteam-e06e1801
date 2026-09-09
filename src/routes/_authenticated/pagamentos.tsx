import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Loader2,
  Upload,
  Send,
} from "lucide-react";
import { useRef, useState } from "react";
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
  created_at: string;
  observacao: string | null;
  resposta_aluno: string | null;
  cancelamento_status: string | null;
  cancelamento_motivo: string | null;
  estorno_comprovante_url: string | null;
  estorno_enviado_em: string | null;
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
  const qc = useQueryClient();

  const [abrindoComprovante, setAbrindoComprovante] = useState<string | null>(
    null
  );
  const [enviando, setEnviando] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [arquivoSelecionado, setArquivoSelecionado] = useState<
    Record<string, File | null>
  >({});
  const [pedindoCancelamento, setPedindoCancelamento] = useState<string | null>(
    null
  );
  const [motivosCancelamento, setMotivosCancelamento] = useState<
    Record<string, string>
  >({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
          "id,status,valor,comprovante_url,comprovante_enviado_em,created_at,observacao,resposta_aluno,inscricao:inscricoes(id,evento:eventos(id,titulo,data),livro:livros(titulo))"
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

  const reenviarComprovante = async (pagamento: PagRow) => {
    const arquivo = arquivoSelecionado[pagamento.id];
    const resposta = (respostas[pagamento.id] ?? "").trim();

    if (!arquivo) {
      toast.error("Selecione um novo comprovante.");
      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      toast.error("O comprovante deve ter no máximo 5 MB.");
      return;
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
      toast.error("Envie JPG, PNG ou PDF.");
      return;
    }

    setEnviando(pagamento.id);

    try {
      const extensao =
        arquivo.name.split(".").pop()?.toLowerCase() || "bin";

      const path = `${user!.id}/${pagamento.id}/${crypto.randomUUID()}.${extensao}`;

      const upload = await supabase.storage
        .from("comprovantes")
        .upload(path, arquivo, {
          upsert: false,
          contentType: arquivo.type,
        });

      if (upload.error) {
        throw new Error(
          `Erro ao enviar comprovante: ${upload.error.message}`
        );
      }

      const agora = new Date().toISOString();

      const { error: pagamentoError } = await supabase
        .from("pagamentos")
        .update({
          comprovante_url: path,
          comprovante_enviado_em: agora,
          status: "aguardando",
          pago_em: null,
          resposta_aluno: resposta || null,
        })
        .eq("id", pagamento.id);

      if (pagamentoError) {
        await supabase.storage.from("comprovantes").remove([path]);
        throw new Error(
          `Erro ao salvar comprovante: ${pagamentoError.message}`
        );
      }

      toast.success("Novo comprovante enviado para análise.");

      setArquivoSelecionado((estado) => ({
        ...estado,
        [pagamento.id]: null,
      }));

      setRespostas((estado) => ({
        ...estado,
        [pagamento.id]: "",
      }));

      if (inputRefs.current[pagamento.id]) {
        inputRefs.current[pagamento.id]!.value = "";
      }

      await qc.invalidateQueries({
        queryKey: ["meus-pagamentos", user?.id],
      });
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível reenviar o comprovante."
      );
    } finally {
      setEnviando(null);
    }
  };

  const pedirCancelamento = async (pagamento: PagRow) => {
    const motivo = (motivosCancelamento[pagamento.id] ?? "").trim();

    if (!motivo) {
      toast.error("Informe o motivo do pedido de cancelamento.");
      return;
    }

    try {
      const { error } = await supabase
        .from("pagamentos")
        .update({
          cancelamento_status: "solicitado",
          cancelamento_motivo: motivo,
        })
        .eq("id", pagamento.id);

      if (error) throw error;

      toast.success("Pedido de cancelamento enviado para análise.");
      setPedindoCancelamento(null);

      await qc.invalidateQueries({
        queryKey: ["meus-pagamentos", user?.id],
      });
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível enviar o pedido de cancelamento."
      );
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
        const recusado = p.status === "rejeitado";
        const enviandoEste = enviando === p.id;
        const resposta = respostas[p.id] ?? "";
        const arquivo = arquivoSelecionado[p.id] ?? null;

        return (
          <Card key={p.id}>
            <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-1">
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

                {p.comprovante_url ? (
                  <p className="text-xs text-muted-foreground">
                    Comprovante enviado em{" "}
                    <strong className="text-foreground">
                      {new Date(
                        p.comprovante_enviado_em ?? p.created_at
                      ).toLocaleString("pt-BR")}
                    </strong>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pagamento criado em{" "}
                    {new Date(p.created_at).toLocaleString("pt-BR")}
                  </p>
                )}

                {p.cancelamento_status === "solicitado" && (
                  <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3">
                    <p className="text-sm font-semibold text-gold">
                      Cancelamento solicitado
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Motivo: {p.cancelamento_motivo || "Não informado"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aguardando análise do ADM.
                    </p>
                  </div>
                )}

                {p.cancelamento_status === "aprovado" && (
                  <div className="mt-3 rounded-lg border border-border/60 bg-card/50 p-3">
                    <p className="text-sm font-semibold">
                      Cancelamento aprovado
                    </p>
                    {p.estorno_enviado_em && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Estorno enviado em{" "}
                        <strong className="text-foreground">
                          {new Date(p.estorno_enviado_em).toLocaleString("pt-BR")}
                        </strong>
                      </p>
                    )}
                    {p.estorno_comprovante_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 gap-1"
                        onClick={() =>
                          verComprovante(
                            p.id,
                            p.estorno_comprovante_url!
                          )
                        }
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Ver comprovante de estorno
                      </Button>
                    )}
                  </div>
                )}

                {recusado && p.observacao && (
                  <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm font-semibold text-destructive">
                      Motivo da recusa
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.observacao}
                    </p>
                  </div>
                )}

                {p.resposta_aluno && (
                  <div className="mt-3 rounded-lg border border-border/60 bg-card/50 p-3">
                    <p className="text-sm font-semibold">
                      Sua resposta
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.resposta_aluno}
                    </p>
                  </div>
                )}

                {p.comprovante_url && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
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

                {recusado && (
                  <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-semibold text-destructive">
                      Corrigir e reenviar
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Responda à justificativa do ADM e envie um novo
                      comprovante para nova análise.
                    </p>

                    <div className="mt-3 space-y-3">
                      <div>
                        <Label htmlFor={`resposta-${p.id}`}>
                          Sua resposta
                        </Label>

                        <Textarea
                          id={`resposta-${p.id}`}
                          rows={3}
                          value={resposta}
                          placeholder="Explique a correção realizada ou responda ao motivo da recusa."
                          onChange={(e) =>
                            setRespostas((estado) => ({
                              ...estado,
                              [p.id]: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`arquivo-${p.id}`}>
                          Novo comprovante
                        </Label>

                        <Input
                          id={`arquivo-${p.id}`}
                          ref={(element) => {
                            inputRefs.current[p.id] = element;
                          }}
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          className="mt-1"
                          onChange={(e) =>
                            setArquivoSelecionado((estado) => ({
                              ...estado,
                              [p.id]: e.target.files?.[0] ?? null,
                            }))
                          }
                        />

                        {arquivo && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Selecionado: {arquivo.name}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        disabled={enviandoEste}
                        onClick={() => reenviarComprovante(p)}
                        className="gap-2"
                      >
                        {enviandoEste ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}

                        {enviandoEste
                          ? "Enviando..."
                          : "Responder e enviar novo comprovante"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {p.status !== "rejeitado" &&
                p.cancelamento_status !== "solicitado" &&
                p.cancelamento_status !== "aprovado" && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPedindoCancelamento(p.id);
                        setMotivosCancelamento((estado) => ({
                          ...estado,
                          [p.id]: "",
                        }));
                      }}
                    >
                      Pedir cancelamento
                    </Button>

                    {pedindoCancelamento === p.id && (
                      <div className="mt-3 rounded-xl border border-border/60 bg-card/50 p-4">
                        <p className="text-sm font-semibold">
                          Solicitar cancelamento
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Informe o motivo. O pedido será analisado pelo ADM.
                        </p>

                        <Textarea
                          rows={3}
                          className="mt-3"
                          placeholder="Motivo do cancelamento..."
                          value={motivosCancelamento[p.id] ?? ""}
                          onChange={(e) =>
                            setMotivosCancelamento((estado) => ({
                              ...estado,
                              [p.id]: e.target.value,
                            }))
                          }
                        />

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => pedirCancelamento(p)}
                          >
                            Enviar pedido
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setPedindoCancelamento(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              <div className="flex shrink-0 flex-wrap items-center gap-3">
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
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                  >
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
