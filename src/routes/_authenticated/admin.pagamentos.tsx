import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — Admin — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: AdminPag,
});

type AdminPagRow = {
  id: string;
  status: string;
  valor: number;
  comprovante_url: string | null;
  observacao: string | null;
  created_at: string;
  participante: { nome: string | null; email: string | null } | null;
  evento: { titulo: string; data: string } | null;
};

function AdminPag() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"todos" | "aguardando" | "aprovado" | "rejeitado">("aguardando");
  const [obsMap, setObsMap] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pagamentos", filter],
    queryFn: async () => {
      let q = supabase
        .from("pagamentos")
        .select(
          "id, status, valor, comprovante_url, observacao, created_at, participante:participantes(nome, email), evento:eventos(titulo, data)"
        )
        .order("created_at", { ascending: false });
      if (filter !== "todos") q = q.eq("status", filter);
      const { data } = await q;
      return (data ?? []) as unknown as AdminPagRow[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, observacao }: { id: string; status: "aprovado" | "rejeitado"; observacao?: string }) => {
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
      toast.error("Não foi possível abrir");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  const pagamentos = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-3xl font-bold">Pagamentos</h1>
        <div className="flex gap-1">
          {(["aguardando", "aprovado", "rejeitado", "todos"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && pagamentos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum pagamento.</p>
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
                  {p.status}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {p.comprovante_url && (
                <Button size="sm" variant="outline" onClick={() => openComprovante(p.comprovante_url!)}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Ver comprovante
                </Button>
              )}
              {p.status === "aguardando" && (
                <>
                  <Input
                    placeholder="Observação (opcional)"
                    value={obsMap[p.id] ?? ""}
                    onChange={(e) => setObsMap((m) => ({ ...m, [p.id]: e.target.value }))}
                    className="max-w-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => decide.mutate({ id: p.id, status: "aprovado", observacao: obsMap[p.id] })}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => decide.mutate({ id: p.id, status: "rejeitado", observacao: obsMap[p.id] })}
                  >
                    Rejeitar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
