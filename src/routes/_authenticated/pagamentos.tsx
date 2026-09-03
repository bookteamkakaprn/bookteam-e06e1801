import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: PagPage,
});

type PagRow = { id: string; status: string; valor?: number; observacao?: string | null; created_at?: string; evento_id?: string; evento_titulo?: string; evento_data?: string };

function PagPage() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading, error } = useQuery({
    enabled: !!user && !authLoading,
    queryKey: ["meus-pagamentos", user?.uid],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "pagamentos"), where("participante_id", "==", user!.uid)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))) as PagRow[];
    },
  });
  const badge = (s: string) => s === "aprovado" ? { Icon: CheckCircle2, variant: "default" as const, label: "Aprovado" } : s === "rejeitado" ? { Icon: XCircle, variant: "destructive" as const, label: "Rejeitado" } : { Icon: Clock, variant: "secondary" as const, label: "Aguardando" };
  const pagamentos = data ?? [];
  return <div className="space-y-4"><h1 className="font-serif text-3xl font-bold">Pagamentos</h1>
    {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
    {error && <p className="text-sm text-destructive">Não foi possível carregar seus pagamentos.</p>}
    {!isLoading && !error && pagamentos.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum pagamento enviado ainda.</CardContent></Card>}
    {pagamentos.map((p) => { const b = badge(p.status); const Icon = b.Icon; return <Card key={p.id}><CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-serif text-lg font-semibold">{p.evento_titulo ?? "Encontro"}</p><p className="text-xs text-muted-foreground">Enviado em {p.created_at ? new Date(p.created_at).toLocaleString("pt-BR") : "—"}</p>{p.observacao && <p className="text-xs text-muted-foreground">Obs: {p.observacao}</p>}</div><div className="flex items-center gap-3"><span className="font-serif text-lg">{Number(p.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span><Badge variant={b.variant} className="inline-flex items-center gap-1"><Icon className="h-3 w-3" />{b.label}</Badge>{p.evento_id && <Button asChild size="sm" variant="outline"><Link to="/inscricao/$eventoId" params={{ eventoId: p.evento_id }}>Ver</Link></Button>}</div></CardContent></Card>; })}
  </div>;
}
