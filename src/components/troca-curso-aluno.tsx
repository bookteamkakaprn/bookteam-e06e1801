import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeftRight, Copy, Loader2, Upload } from "lucide-react";
import { enviarEmail } from "@/lib/email-service";
import { registrarComprovante, validarComprovante } from "@/lib/pagamento-recusa";

type Solicitacao = {
  id: string;
  status: string;
  diferenca: number;
  expira_em: string;
  inscricao_id: string;
  pagamento_diferenca_id: string | null;
  destino: { nome: string } | null;
};

type PagamentoDiferenca = {
  id: string;
  status: string;
  valor: number;
  comprovante_url: string | null;
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function erroTexto(e: unknown) {
  return e instanceof Error ? e.message : "Não foi possível concluir a ação.";
}

/**
 * Troca de curso proposta pela equipe. O aluno confirma aqui e, se houver diferença a pagar,
 * envia o comprovante desta diferença (separado do pagamento da inscrição).
 */
export function TrocaCursoAluno() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [arquivos, setArquivos] = useState<Record<string, File | null>>({});

  const solicitacoesQ = useQuery({
    enabled: !!user?.id,
    queryKey: ["troca-curso-aluno", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("solicitacoes_troca_curso")
        .select(
          "id,status,diferenca,expira_em,inscricao_id,pagamento_diferenca_id,destino:turmas!turma_destino_id(nome)",
        )
        .in("status", ["pendente_aluno", "aguardando_diferenca"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Solicitacao[];
    },
  });

  const idsPagamento = (solicitacoesQ.data ?? [])
    .map((s) => s.pagamento_diferenca_id)
    .filter((id): id is string => !!id);

  const pagamentosQ = useQuery({
    enabled: idsPagamento.length > 0,
    queryKey: ["troca-curso-aluno-pagamentos", idsPagamento.join(",")],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pagamentos")
        .select("id,status,valor,comprovante_url")
        .in("id", idsPagamento);
      if (error) throw error;
      return (data ?? []) as PagamentoDiferenca[];
    },
  });

  const pixQ = useQuery({
    enabled: (solicitacoesQ.data ?? []).some((s) => s.status === "aguardando_diferenca"),
    queryKey: ["troca-curso-aluno-pix"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("configuracoes_pagamento")
        .select("pix_chave,beneficiario")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { pix_chave: string | null; beneficiario: string | null } | null;
    },
  });

  const confirmar = useMutation({
    mutationFn: async (s: Solicitacao) => {
      const { data, error } = await (supabase as any).rpc("confirmar_troca_curso", {
        p_solicitacao_id: s.id,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async (resultado, s) => {
      const destino = s.destino?.nome ?? "novo curso";
      const diferenca = Number(s.diferenca);
      if (resultado === "expirada") {
        toast.error("Esta solicitação expirou. Peça uma nova à equipe.");
      } else if (resultado === "aguardando_diferenca") {
        toast.success(`Troca confirmada. Pague a diferença de ${moeda(diferenca)} para concluir.`);
      } else {
        toast.success(`Troca concluída para ${destino}.`);
      }

      const email = user?.email;
      if (email && resultado !== "expirada") {
        const texto =
          resultado === "aguardando_diferenca"
            ? `Sua troca para "${destino}" foi confirmada. Para concluí-la, pague a diferença de ${moeda(diferenca)} ` +
              `via Pix e envie o comprovante em Minhas inscrições.`
            : diferenca < 0
              ? `Sua troca para "${destino}" foi concluída. A diferença de ${moeda(Math.abs(diferenca))} será devolvida pela equipe.`
              : `Sua troca para "${destino}" foi concluída.`;
        try {
          await enviarEmail({
            to: email,
            tipo: "customizado",
            nome: (user?.user_metadata as { nome?: string } | undefined)?.nome ?? "Aluno(a)",
            assunto: "Troca de curso",
            mensagem: texto,
          });
        } catch {
          // O aviso no site já foi gravado pelo banco; falha de e-mail não desfaz a troca.
        }
      }

      qc.invalidateQueries({ queryKey: ["troca-curso-aluno"] });
      qc.invalidateQueries({ queryKey: ["minhas-inscricoes"] });
    },
    onError: (e) => toast.error(erroTexto(e)),
  });

  const enviarComprovante = useMutation({
    mutationFn: async ({
      pagamentoId,
      inscricaoId,
    }: {
      pagamentoId: string;
      inscricaoId: string;
    }) => {
      const arquivo = arquivos[pagamentoId];
      if (!user?.id) throw new Error("Faça login para continuar.");
      if (!arquivo) throw new Error("Selecione o comprovante.");
      const erro = validarComprovante(arquivo);
      if (erro) throw new Error(erro);

      const ext = (arquivo.name.split(".").pop() ?? "bin").toLowerCase();
      const caminho = `${user.id}/${inscricaoId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("comprovantes").upload(caminho, arquivo, {
        upsert: false,
        contentType: arquivo.type,
      });
      if (up.error) throw new Error(`Erro ao enviar arquivo: ${up.error.message}`);

      await registrarComprovante({ pagamentoId, caminho });
    },
    onSuccess: (_, { pagamentoId }) => {
      toast.success("Comprovante da diferença enviado. A equipe vai analisar.");
      setArquivos((prev) => ({ ...prev, [pagamentoId]: null }));
      qc.invalidateQueries({ queryKey: ["troca-curso-aluno-pagamentos"] });
    },
    onError: (e) => toast.error(erroTexto(e)),
  });

  const solicitacoes = solicitacoesQ.data ?? [];
  if (solicitacoes.length === 0) return null;

  const pagamentos = pagamentosQ.data ?? [];
  const pix = pixQ.data;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
        <ArrowLeftRight className="h-5 w-5" /> Troca de curso
      </h2>

      {solicitacoes.map((s) => {
        const pagamento = pagamentos.find((p) => p.id === s.pagamento_diferenca_id);
        const diferenca = Number(s.diferenca);
        const expira = new Date(s.expira_em).toLocaleDateString("pt-BR");

        return (
          <Card key={s.id} className="border-gold/40">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="font-medium">Nova turma: {s.destino?.nome ?? "—"}</p>
                <p className="text-sm text-muted-foreground">
                  {diferenca > 0 && `Diferença a pagar: ${moeda(diferenca)}.`}
                  {diferenca < 0 && `Diferença a ser devolvida: ${moeda(Math.abs(diferenca))}.`}
                  {diferenca === 0 && "Sem diferença de valor."}
                </p>
              </div>

              {s.status === "pendente_aluno" && (
                <div className="space-y-2">
                  <p className="text-sm">
                    Confirme se foi você quem solicitou esta troca. Expira em {expira}.
                  </p>
                  <Button
                    type="button"
                    className="gap-2 bg-gold text-primary-foreground hover:bg-gold/90"
                    disabled={confirmar.isPending}
                    onClick={() => confirmar.mutate(s)}
                  >
                    {confirmar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirmar troca
                  </Button>
                </div>
              )}

              {s.status === "aguardando_diferenca" && pagamento && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {pagamento.comprovante_url
                        ? "Comprovante enviado — em análise"
                        : "Aguardando pagamento"}
                    </Badge>
                  </div>

                  {pix?.pix_chave && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm">
                      <p className="font-medium">Pague {moeda(diferenca)} via Pix</p>
                      <p className="break-all">Chave: {pix.pix_chave}</p>
                      {pix.beneficiario && <p>Beneficiário: {pix.beneficiario}</p>}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 gap-1.5"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(pix.pix_chave ?? "");
                            toast.success("Chave Pix copiada.");
                          } catch {
                            toast.error("Não foi possível copiar a chave.");
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" /> Copiar chave Pix
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`comprovante-${s.id}`}>
                      Comprovante da diferença (PDF, JPG ou PNG)
                    </label>
                    <Input
                      id={`comprovante-${s.id}`}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={(e) =>
                        setArquivos((prev) => ({
                          ...prev,
                          [pagamento.id]: e.target.files?.[0] ?? null,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      className="gap-2"
                      disabled={!arquivos[pagamento.id] || enviarComprovante.isPending}
                      onClick={() =>
                        enviarComprovante.mutate({
                          pagamentoId: pagamento.id,
                          inscricaoId: s.inscricao_id,
                        })
                      }
                    >
                      {enviarComprovante.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Enviar comprovante
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
