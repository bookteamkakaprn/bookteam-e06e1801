import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { PagamentoDetalhe, STATUS_LABEL, type PagamentoAdmin } from "@/components/admin/pagamento-detalhe";

export const Route = createFileRoute("/_admin/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — Admin — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPag,
});

const SELECT =
  "id, status, valor, comprovante_url, observacao, created_at, participante:participantes(nome, email, telefone, cpf, cidade, estado), evento:eventos(id, titulo, data, hora, local, cidade, livro:livros(titulo, autor, trilha:trilhas(nome)))";

const FILTROS = [
  { value: "aguardando", label: "Pendentes" },
  { value: "aprovado", label: "Aprovados" },
  { value: "rejeitado", label: "Recusados" },
  { value: "todos", label: "Todos" },
] as const;

type Filtro = (typeof FILTROS)[number]["value"];

function AdminPag() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filtro>("aguardando");
  const [aberto, setAberto] = useState<PagamentoAdmin | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-pagamentos", filter],
    queryFn: async () => {
      const q = supabase.from("pagamentos").select(SELECT as string).order("created_at", { ascending: false });
      if (filter !== "todos") q.eq("status", filter);
      const { data, error } = await q.returns<PagamentoAdmin[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const pagamentos = data ?? [];

  function refresh(msg: string) {
    toast.success(msg);
    setAberto(null);
    qc.invalidateQueries({ queryKey: ["admin-pagamentos"] });
  }

  const decide = useMutation({
    mutationFn: async ({ id, status, observacao }: { id: string; status: "aprovado" | "rejeitado"; observacao?: string }) => {
      const auth = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from("pagamentos")
        .update({
          status,
          observacao: observacao?.trim() || null,
          aprovado_por: auth?.id ?? null,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh("Pagamento atualizado"),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const solicitar = useMutation({
    mutationFn: async ({ id, observacao }: { id: string; observacao?: string }) => {
      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "aguardando",
          comprovante_url: null,
          aprovado_por: null,
          aprovado_em: null,
          observacao: observacao?.trim() || "Novo comprovante solicitado pela administração.",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh("Novo comprovante solicitado ao aluno"),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  async function verComprovante(path: string) {
    const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Não foi possível abrir o comprovante");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-3xl font-bold">Pagamentos</h1>
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"} onClick={() => setFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar os pagamentos.</p>}
      {!isLoading && !isError && pagamentos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum pagamento neste filtro.</p>
      )}

      <div className="space-y-3">
        {pagamentos.map((p) => (
          <Card key={p.id} className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => setAberto(p)}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-serif text-lg font-semibold">{p.participante?.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {[p.evento?.livro?.trilha?.nome, p.evento?.livro?.titulo, p.evento?.titulo].filter(Boolean).join(" • ") || "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enviado em {new Date(p.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-serif text-lg">
                  {Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <Badge
                  variant={p.status === "aprovado" ? "default" : p.status === "rejeitado" ? "destructive" : "secondary"}
                  className="inline-flex items-center gap-1"
                >
                  {p.status === "aprovado" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : p.status === "rejeitado" ? (
                    <XCircle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {STATUS_LABEL[p.status] ?? p.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PagamentoDetalhe
        pagamento={aberto}
        onOpenChange={(o) => !o && setAberto(null)}
        onDecidir={(args) => decide.mutate(args)}
        onSolicitarComprovante={(args) => solicitar.mutate(args)}
        onVerComprovante={verComprovante}
        pendente={decide.isPending || solicitar.isPending}
      />
    </div>
  );
}
