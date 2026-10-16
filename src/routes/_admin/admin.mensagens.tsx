import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Archive, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/mensagens")({ component: AdminMensagensPage });

type Msg = {
  id: string;
  participante_id: string;
  remetente_tipo: string;
  assunto: string | null;
  mensagem: string;
  lida: boolean;
  arquivada: boolean;
  created_at: string;
  participantes?: { nome: string | null; email: string | null } | null;
};

type Conversa = {
  participante_id: string;
  nome: string;
  mensagens: Msg[];
  naoLidas: number;
  arquivada: boolean;
  ultima: Msg;
};

type Item = { tipo: "divisor"; key: string; assunto: string } | { tipo: "msg"; key: string; m: Msg };

const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR");

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

export function AdminMensagensPage() {
  const qc = useQueryClient();
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"ativas" | "arquivadas">("ativas");
  const [resposta, setResposta] = useState("");
  const [respAssunto, setRespAssunto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ["admin-mensagens"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mensagens_admin")
        .select("*, participantes(nome,email)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  // Agrupa todas as mensagens de cada aluno em uma única conversa.
  const conversas = useMemo<Conversa[]>(() => {
    const mapa = new Map<string, Conversa>();
    for (const m of q.data ?? []) {
      const nome = m.participantes?.nome || m.participantes?.email || "Aluno";
      let c = mapa.get(m.participante_id);
      if (!c) {
        c = { participante_id: m.participante_id, nome, mensagens: [], naoLidas: 0, arquivada: false, ultima: m };
        mapa.set(m.participante_id, c);
      }
      c.mensagens.push(m);
      c.ultima = m;
      if (m.remetente_tipo !== "admin" && !m.lida) c.naoLidas++;
    }
    // Conversa arquivada = todas as mensagens arquivadas. Nova mensagem reabre a conversa.
    for (const c of mapa.values()) c.arquivada = c.mensagens.every((m) => m.arquivada);
    return [...mapa.values()].sort((a, b) => b.ultima.created_at.localeCompare(a.ultima.created_at));
  }, [q.data]);

  const conversasVisiveis = conversas.filter((c) => (filtro === "arquivadas" ? c.arquivada : !c.arquivada));
  const totalArquivadas = conversas.filter((c) => c.arquivada).length;
  const totalAtivas = conversas.length - totalArquivadas;

  const conversaSel = conversas.find((c) => c.participante_id === selecionadoId) ?? null;
  const itens = useMemo(() => montarItens(conversaSel?.mensagens ?? []), [conversaSel]);
  const topicoAtual = useMemo(() => {
    const ms = conversaSel?.mensagens ?? [];
    for (let i = ms.length - 1; i >= 0; i--) if (ms[i].assunto?.trim()) return ms[i].assunto!.trim();
    return null;
  }, [conversaSel]);

  const marcarLidas = useMutation({
    mutationFn: async (participanteId: string) => {
      const { error } = await (supabase as any)
        .from("mensagens_admin")
        .update({ lida: true })
        .eq("participante_id", participanteId)
        .eq("remetente_tipo", "aluno");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-mensagens"] }),
  });

  useEffect(() => {
    if (conversaSel && conversaSel.naoLidas > 0) marcarLidas.mutate(conversaSel.participante_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionadoId, conversaSel?.naoLidas]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversaSel?.mensagens.length, selecionadoId]);

  const responder = useMutation({
    mutationFn: async () => {
      if (!conversaSel || !resposta.trim()) throw new Error("Digite uma resposta.");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada.");
      const { error } = await (supabase as any).from("mensagens_admin").insert({
        participante_id: conversaSel.participante_id,
        remetente_id: u.user.id,
        remetente_tipo: "admin",
        assunto: respAssunto.trim() || null,
        mensagem: resposta.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setResposta("");
      setRespAssunto("");
      qc.invalidateQueries({ queryKey: ["admin-mensagens"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível enviar."),
  });

  // Exclusão: só existe nesta tela de admin (a política de admin cobre DELETE).
  const apagarMensagem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("mensagens_admin").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem apagada.");
      qc.invalidateQueries({ queryKey: ["admin-mensagens"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível apagar."),
  });

  const apagarConversa = useMutation({
    mutationFn: async (participanteId: string) => {
      const { error } = await (supabase as any).from("mensagens_admin").delete().eq("participante_id", participanteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conversa apagada.");
      setSelecionadoId(null);
      qc.invalidateQueries({ queryKey: ["admin-mensagens"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível apagar a conversa."),
  });

  const arquivarConversa = useMutation({
    mutationFn: async ({ participanteId, arquivada }: { participanteId: string; arquivada: boolean }) => {
      const { error } = await (supabase as any)
        .from("mensagens_admin")
        .update({ arquivada })
        .eq("participante_id", participanteId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.arquivada ? "Conversa arquivada." : "Conversa desarquivada.");
      setSelecionadoId(null);
      qc.invalidateQueries({ queryKey: ["admin-mensagens"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível atualizar a conversa."),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Comunicação</p>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Mensagens dos alunos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cada aluno tem uma conversa só. Responda por aqui.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Caixa de entrada</CardTitle>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant={filtro === "ativas" ? "default" : "outline"} onClick={() => setFiltro("ativas")}>
                Ativas ({totalAtivas})
              </Button>
              <Button
                size="sm"
                variant={filtro === "arquivadas" ? "default" : "outline"}
                onClick={() => setFiltro("arquivadas")}
              >
                Arquivadas ({totalArquivadas})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {q.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!q.isLoading && conversasVisiveis.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {filtro === "arquivadas" ? "Nenhuma conversa arquivada." : "Nenhuma mensagem ativa."}
              </p>
            )}
            {conversasVisiveis.map((c) => (
              <button
                key={c.participante_id}
                type="button"
                onClick={() => setSelecionadoId(c.participante_id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-secondary/50 ${
                  c.participante_id === selecionadoId ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">{c.nome}</p>
                  {c.naoLidas > 0 && <Badge>{c.naoLidas} nova(s)</Badge>}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{c.ultima.mensagem}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{hora(c.ultima.created_at)}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex min-h-[60vh] flex-col">
          {!conversaSel ? (
            <CardContent className="flex flex-1 flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <MessageSquare className="mb-2 h-8 w-8" />
              <p>Escolha um aluno para ver a conversa.</p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
                <CardTitle className="truncate text-lg">{conversaSel.nome}</CardTitle>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={arquivarConversa.isPending}
                    onClick={() =>
                      arquivarConversa.mutate({
                        participanteId: conversaSel.participante_id,
                        arquivada: !conversaSel.arquivada,
                      })
                    }
                  >
                    <Archive className="h-4 w-4" />
                    {conversaSel.arquivada ? "Desarquivar" : "Arquivar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    disabled={apagarConversa.isPending}
                    onClick={() => {
                      if (
                        window.confirm(`Apagar TODA a conversa com ${conversaSel.nome}? Esta ação não pode ser desfeita.`)
                      ) {
                        apagarConversa.mutate(conversaSel.participante_id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Apagar conversa
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4 pt-4">
                <div className="flex max-h-[50vh] min-h-48 flex-col gap-3 overflow-y-auto rounded-lg bg-muted/20 p-3">
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
                    const doAdmin = m.remetente_tipo === "admin";
                    const botaoApagar = (
                      <button
                        type="button"
                        aria-label="Apagar esta mensagem"
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        onClick={() => {
                          if (window.confirm("Apagar esta mensagem?")) apagarMensagem.mutate(m.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    );
                    return (
                      <div
                        key={item.key}
                        className={`group flex items-end gap-2 ${doAdmin ? "justify-end" : "justify-start"}`}
                      >
                        {doAdmin && botaoApagar}
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                            doAdmin ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm">{m.mensagem}</p>
                          <p className="mt-1 text-right text-[10px] opacity-70">
                            {doAdmin ? "Book Team" : conversaSel.nome} · {hora(m.created_at)}
                          </p>
                        </div>
                        {!doAdmin && botaoApagar}
                      </div>
                    );
                  })}
                  <div ref={fimRef} />
                </div>

                <div className="mt-auto space-y-2 border-t pt-3">
                  {topicoAtual && !respAssunto.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Assunto atual: <strong>{topicoAtual}</strong>. Para começar um assunto novo, preencha o campo Assunto.
                    </p>
                  )}
                  <Input
                    value={respAssunto}
                    onChange={(e) => setRespAssunto(e.target.value)}
                    placeholder="Assunto — preencha para começar um novo assunto"
                  />
                  <div className="flex items-end gap-2">
                    <Textarea
                      rows={2}
                      value={resposta}
                      onChange={(e) => setResposta(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="resize-none"
                    />
                    <Button
                      size="icon"
                      disabled={responder.isPending || !resposta.trim()}
                      onClick={() => responder.mutate()}
                      aria-label="Enviar resposta"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
