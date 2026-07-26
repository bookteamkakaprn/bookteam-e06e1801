import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário de encontros — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarioPage,
});

type Evento = Tables<"eventos"> & { livros: { titulo: string } | null };
type Inscricao = Pick<Tables<"inscricoes">, "id" | "evento_id" | "status">;
type Presenca = Pick<Tables<"presencas">, "id" | "evento_id" | "presente">;

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtData = (data: string) => new Date(data + "T00:00:00").toLocaleDateString("pt-BR");

function CalendarioPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const hoje = new Date();
  const hojeIso = iso(hoje);
  const [mes, setMes] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [detalhe, setDetalhe] = useState<Evento | null>(null);

  const inicioMes = iso(new Date(mes.getFullYear(), mes.getMonth(), 1));
  const fimMes = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["aluno-calendario", inicioMes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*, livros(titulo)")
        .gte("data", inicioMes)
        .lte("data", fimMes)
        .order("data");
      if (error) throw error;
      return (data ?? []) as unknown as Evento[];
    },
  });

  const { data: inscricoes = [] } = useQuery({
    queryKey: ["aluno-inscricoes-cal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("id, evento_id, status")
        .eq("participante_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Inscricao[];
    },
  });

  const { data: presencas = [] } = useQuery({
    queryKey: ["aluno-presencas-cal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presencas")
        .select("id, evento_id, presente")
        .eq("participante_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Presenca[];
    },
  });

  const porDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const e of eventos) {
      const lista = mapa.get(e.data) ?? [];
      lista.push(e);
      mapa.set(e.data, lista);
    }
    return mapa;
  }, [eventos]);

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const vazios = primeiro.getDay();
    return [
      ...Array.from({ length: vazios }, () => null),
      ...Array.from({ length: totalDias }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1)),
    ];
  }, [mes]);

  const inscricaoDe = (eventoId: string) => inscricoes.find((i) => i.evento_id === eventoId) ?? null;
  const presencaDe = (eventoId: string) => presencas.find((p) => p.evento_id === eventoId) ?? null;

  const marcarPresenca = useMutation({
    mutationFn: async (evento: Evento) => {
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");
      const inscricao = inscricaoDe(evento.id);
      if (!inscricao) throw new Error("Você não está inscrito neste encontro.");
      if (inscricao.status !== "confirmada") throw new Error("Sua inscrição ainda não foi confirmada.");
      if (evento.data !== hojeIso) throw new Error("A presença só pode ser marcada no dia do encontro.");

      const existente = presencaDe(evento.id);
      if (existente) {
        const { error } = await supabase
          .from("presencas")
          .update({ presente: true, horario_checkin: new Date().toISOString() })
          .eq("id", existente.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("presencas").insert({
        evento_id: evento.id,
        inscricao_id: inscricao.id,
        participante_id: user.id,
        presente: true,
        horario_checkin: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Presença confirmada!");
      qc.invalidateQueries({ queryKey: ["aluno-presencas-cal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proximos = eventos.filter((e) => e.data >= hojeIso);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Calendário de encontros</h1>
          <p className="text-sm text-muted-foreground">
            Veja os detalhes de cada encontro e marque sua presença no dia.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/eventos">Encontros abertos</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Mês anterior"
              onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="font-serif text-lg font-semibold">
              {MESES[mes.getMonth()]} {mes.getFullYear()}
            </p>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Próximo mês"
              onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
            {DIAS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {celulas.map((dia, idx) => {
              if (!dia) return <div key={`v-${idx}`} className="min-h-[84px] rounded-md bg-muted/20" />;
              const key = iso(dia);
              const doDia = porDia.get(key) ?? [];
              const eHoje = key === hojeIso;
              return (
                <div
                  key={key}
                  className={`min-h-[84px] rounded-md border p-1 text-left ${
                    eHoje ? "border-primary bg-primary/5" : "border-border/60"
                  }`}
                >
                  <span className={`text-xs ${eHoje ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                    {dia.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {doDia.map((e) => {
                      const inscrito = !!inscricaoDe(e.id);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setDetalhe(e)}
                          className={`w-full truncate rounded px-1 py-0.5 text-left text-[11px] transition-colors ${
                            inscrito
                              ? "bg-primary/20 text-foreground hover:bg-primary/30"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                          title={e.titulo}
                        >
                          {e.hora ? `${e.hora.slice(0, 5)} ` : ""}
                          {e.titulo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {isLoading && (
            <p className="mt-3 text-sm text-muted-foreground">
              <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> Carregando encontros…
            </p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Próximos encontros deste mês</h2>
        {proximos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum encontro programado para o restante do mês.</p>
        )}
        {proximos.map((e) => {
          const presenca = presencaDe(e.id);
          return (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-serif text-lg font-semibold">{e.titulo}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> {fmtData(e.data)} {e.hora?.slice(0, 5)}
                    </span>
                    {(e.local || e.cidade) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {[e.local, e.cidade].filter(Boolean).join(" — ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {presenca?.presente && (
                    <Badge className="bg-primary/20 text-foreground">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Presença registrada
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setDetalhe(e)}>
                    Ver detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-lg">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">{detalhe.titulo}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {detalhe.livros?.titulo && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                    {detalhe.livros.titulo}
                  </p>
                )}
                {detalhe.descricao && <p className="text-muted-foreground">{detalhe.descricao}</p>}
                <div className="grid gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> {fmtData(detalhe.data)}
                  </span>
                  {detalhe.hora && (
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" /> {detalhe.hora.slice(0, 5)}
                    </span>
                  )}
                  {(detalhe.local || detalhe.cidade) && (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {[detalhe.local, detalhe.cidade].filter(Boolean).join(" — ")}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4" /> {detalhe.vagas} vagas
                  </span>
                </div>

                {(() => {
                  const inscricao = inscricaoDe(detalhe.id);
                  const presenca = presencaDe(detalhe.id);
                  if (presenca?.presente) {
                    return (
                      <p className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" /> Presença já registrada. Bom encontro!
                      </p>
                    );
                  }
                  if (!inscricao) {
                    return (
                      <Button asChild size="sm" className="w-full">
                        <Link to="/inscricao/$eventoId" params={{ eventoId: detalhe.id }}>
                          Inscrever-se neste encontro
                        </Link>
                      </Button>
                    );
                  }
                  if (inscricao.status !== "confirmada") {
                    return (
                      <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
                        Sua inscrição está como <strong>{inscricao.status.replace(/_/g, " ")}</strong>. A presença
                        libera após a confirmação do pagamento.
                      </p>
                    );
                  }
                  if (detalhe.data !== hojeIso) {
                    return (
                      <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
                        A presença poderá ser marcada no dia do encontro ({fmtData(detalhe.data)}).
                      </p>
                    );
                  }
                  return (
                    <Button
                      className="w-full"
                      disabled={marcarPresenca.isPending}
                      onClick={() => marcarPresenca.mutate(detalhe)}
                    >
                      {marcarPresenca.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Marcar minha presença
                    </Button>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
