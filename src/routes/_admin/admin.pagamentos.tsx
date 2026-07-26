import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — Admin — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPag,
});

interface AdminPagRow {
  id: string;
  status: string;
  valor: number;
  comprovante_url: string | null;
  observacao: string | null;
  created_at: string;
  participante: { nome: string | null; email: string | null } | null;
  evento: { id: string; titulo: string; data: string } | null;
}

const SELECT =
  "id, status, valor, comprovante_url, observacao, created_at, participante:participantes(nome, email), evento:eventos(id, titulo, data)";

const STATUS_LABEL: Record<string, string> = {
  aguardando: "Pagamento pendente",
  aprovado: "Pagamento efetuado",
  rejeitado: "Pagamento recusado",
};

function AdminPag() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"todos" | "aguardando" | "aprovado" | "rejeitado">("aguardando");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [eventoId, setEventoId] = useState("todos");
  const [obsMap, setObsMap] = useState<Record<string, string>>({});

  const eventosQuery = useQuery({
    queryKey: ["admin-eventos-filtro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("id, titulo, data")
        .order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-pagamentos", filter, de, ate],
    queryFn: async () => {
      const q = supabase
        .from("pagamentos")
        .select(SELECT as string)
        .order("created_at", { ascending: false });
      if (filter !== "todos") q.eq("status", filter);
      if (de) q.gte("created_at", `${de}T00:00:00`);
      if (ate) q.lte("created_at", `${ate}T23:59:59`);
      const { data, error } = await q.returns<AdminPagRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const pagamentos = useMemo(
    () => (data ?? []).filter((p) => eventoId === "todos" || p.evento?.id === eventoId),
    [data, eventoId],
  );

  const decide = useMutation({
    mutationFn: async ({
      id,
      status,
      observacao,
    }: {
      id: string;
      status: "aprovado" | "rejeitado";
      observacao?: string;
    }) => {
      const auth = (await supabase.auth.getUser()).data.user;
      const upd = await supabase
        .from("pagamentos")
        .update({
          status,
          observacao: observacao || null,
          aprovado_por: auth?.id ?? null,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", id);
      if (upd.error) throw upd.error;
    },
    onSuccess: () => {
      toast.success("Pagamento atualizado");
      qc.invalidateQueries({ queryKey: ["admin-pagamentos"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  async function openComprovante(path: string) {
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
          {(["aguardando", "aprovado", "rejeitado", "todos"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "todos" ? "Todos" : STATUS_LABEL[f]}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[auto_auto_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="pag-de">De</Label>
            <Input id="pag-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pag-ate">Até</Label>
            <Input id="pag-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pag-evento">Curso / Encontro</Label>
            <select
              id="pag-evento"
              value={eventoId}
              onChange={(e) => setEventoId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="todos">Todos os encontros</option>
              {(eventosQuery.data ?? []).map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setDe("");
              setAte("");
              setEventoId("todos");
            }}
          >
            Limpar
          </Button>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar os pagamentos.</p>}
      {!isLoading && pagamentos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum pagamento para os filtros selecionados.</p>
      )}

      {pagamentos.map((p) => (
        <Card key={p.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-lg font-semibold">{p.participante?.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {p.participante?.email} — {p.evento?.titulo}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enviado em {new Date(p.created_at).toLocaleString("pt-BR")}
                </p>
                {p.observacao && <p className="mt-1 text-xs">Obs: {p.observacao}</p>}
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {p.comprovante_url ? (
                <Button size="sm" variant="outline" onClick={() => openComprovante(p.comprovante_url!)}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Ver comprovante
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Sem comprovante enviado</span>
              )}
              {p.status !== "aprovado" && (
                <Button size="sm" onClick={() => decide.mutate({ id: p.id, status: "aprovado", observacao: obsMap[p.id] })}>
                  Validar pagamento
                </Button>
              )}
              {p.status !== "rejeitado" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => decide.mutate({ id: p.id, status: "rejeitado", observacao: obsMap[p.id] })}
                >
                  Recusar
                </Button>
              )}
              <Input
                placeholder="Observação (opcional)"
                value={obsMap[p.id] ?? ""}
                onChange={(e) => setObsMap((m) => ({ ...m, [p.id]: e.target.value }))}
                className="max-w-sm"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
