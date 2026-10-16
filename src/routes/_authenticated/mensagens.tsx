import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mensagens")({
  component: MensagensPage,
});

type Msg = {
  id: string;
  remetente_tipo: string;
  assunto: string | null;
  mensagem: string;
  created_at: string;
};

type Item = { tipo: "divisor"; key: string; assunto: string } | { tipo: "msg"; key: string; m: Msg };

// Intercala um separador "Novo assunto" sempre que o assunto muda.
function montarItens(msgs: Msg[]): Item[] {
  const itens: Item[] = [];
  let topico: string | null = null;
  for (const m of msgs) {
    const a = m.assunto?.trim() || null;
    if (a && a !== topico) itens.push({ tipo: "divisor", key: `d-${m.id}`, assunto: a });
    if (a) topico = a;
    itens.push({ tipo: "msg", key: m.id, m });
  }
  return itens;
}

function MensagensPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    enabled: !!user,
    queryKey: ["minhas-mensagens", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mensagens_admin")
        .select("id, remetente_tipo, assunto, mensagem, created_at")
        .eq("participante_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!user || !mensagem.trim()) throw new Error("Digite sua mensagem.");
      const { error } = await (supabase as any).from("mensagens_admin").insert({
        participante_id: user.id,
        remetente_id: user.id,
        remetente_tipo: "aluno",
        assunto: assunto.trim() || null,
        mensagem: mensagem.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAssunto("");
      setMensagem("");
      qc.invalidateQueries({ queryKey: ["minhas-mensagens", user?.id] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível enviar."),
  });

  const msgs = q.data ?? [];
  const itens = useMemo(() => montarItens(msgs), [msgs]);
  const topicoAtual = useMemo(() => {
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].assunto?.trim()) return msgs[i].assunto!.trim();
    return null;
  }, [msgs]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Comunicação</p>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Fale com o ADM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie dúvidas, pedidos ou informações diretamente para a administração.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversa com o ADM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex max-h-[60vh] min-h-48 flex-col gap-3 overflow-y-auto rounded-lg bg-muted/20 p-3">
            {q.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!q.isLoading && msgs.length === 0 && (
              <p className="m-auto text-center text-sm text-muted-foreground">
                Você ainda não enviou nenhuma mensagem.
              </p>
            )}
            {itens.map((item) => {
              if (item.tipo === "divisor") {
                return (
                  <div key={item.key} className="my-1 flex items-center gap-2 text-xs font-semibold text-primary">
                    <span className="h-px flex-1 bg-primary/40" />
                    Novo assunto: {item.assunto}
                    <span className="h-px flex-1 bg-primary/40" />
                  </div>
                );
              }
              const m = item.m;
              const minha = m.remetente_tipo !== "admin";
              return (
                <div key={item.key} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                      minha ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{m.mensagem}</p>
                    <p className="mt-1 text-right text-[10px] opacity-70">
                      {minha ? "Você" : "ADM"} · {new Date(m.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={fimRef} />
          </div>

          <div className="space-y-2 border-t pt-3">
            {topicoAtual && !assunto.trim() && (
              <p className="text-xs text-muted-foreground">
                Você está no assunto: <strong>{topicoAtual}</strong>. Para começar um assunto novo, preencha o campo
                Assunto.
              </p>
            )}
            <Input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Assunto — preencha para começar um novo assunto"
            />
            <div className="flex items-end gap-2">
              <Textarea
                rows={2}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Escreva sua mensagem..."
                className="resize-none"
              />
              <Button
                size="icon"
                disabled={enviar.isPending || !mensagem.trim()}
                onClick={() => enviar.mutate()}
                aria-label="Enviar ao ADM"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
