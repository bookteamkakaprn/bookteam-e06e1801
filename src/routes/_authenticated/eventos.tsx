import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/eventos")({
  head: () => ({ meta: [{ title: "Encontros — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: EventosPage,
});

type EventoRow = {
  id: string;
  titulo: string;
  descricao?: string | null;
  data: string;
  hora?: string | null;
  cidade?: string | null;
  local?: string | null;
  valor?: number | null;
  vagas?: number | null;
  livro_titulo?: string | null;
  trilha_nome?: string | null;
};

function EventosPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["eventos-abertos"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const q = query(
        collection(db, "eventos"),
        where("status", "==", "aberto"),
        where("data", ">=", today),
        orderBy("data", "asc"),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as EventoRow[];
    },
  });

  const eventos = data ?? [];
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold">Encontros abertos</h1>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {error && <p className="text-sm text-destructive">Não foi possível carregar os encontros. Verifique as permissões do Firestore.</p>}
      {!isLoading && !error && eventos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum encontro aberto no momento.</p>
      )}
      {eventos.map((e) => (
        <Card key={e.id}>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              {e.trilha_nome && <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">{e.trilha_nome}</p>}
              <p className="font-serif text-lg font-semibold">{e.titulo}</p>
              {e.descricao && <p className="mt-1 text-sm text-muted-foreground">{e.descricao}</p>}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR")} {e.hora?.slice(0, 5)}</span>
                {(e.local || e.cidade) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[e.local, e.cidade].filter(Boolean).join(" — ")}</span>}
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{e.vagas ?? 0} vagas</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{Number(e.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Badge>
              <Button asChild size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90">
                <Link to="/inscricao/$eventoId" params={{ eventoId: e.id }}>Inscrever-se</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
