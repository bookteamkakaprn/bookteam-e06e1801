import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: CalendarioPage,
});

type Evento = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  data: string;
  hora: string | null;
  local: string | null;
  cidade: string | null;
  vagas: number | null;
};

type Inscricao = {
  id: string;
  status: string;
  livro: { id: string; titulo: string | null } | null;
  turma: {
    id: string;
    nome: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    dia_semana: string | null;
    horario: string | null;
    sala: string | null;
  } | null;
};

type Item =
  | { kind: "evento"; id: string; data: string; titulo: string; hora: string | null; evento: Evento }
  | { kind: "aula"; id: string; data: string; titulo: string; hora: string | null; inscricao: Inscricao };

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function iso(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function localDate(v: string) {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function gerarAulas(turma: Inscricao["turma"]) {
  if (!turma?.data_inicio || !turma.data_fim || turma.dia_semana === null || turma.dia_semana === "") return [];
  const dia = Number(turma.dia_semana);
  const out: string[] = [];
  const cursor = localDate(turma.data_inicio);
  const fim = localDate(turma.data_fim);
  while (cursor <= fim) {
    if (cursor.getDay() === dia) out.push(iso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function CalendarioPage() {
  const { user } = useAuth();
  const hoje = new Date();
  const hojeIso = iso(hoje);
  const [mes, setMes] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [detalhe, setDetalhe] = useState<Item | null>(null);
  const inicioMes = iso(new Date(mes.getFullYear(), mes.getMonth(), 1));
  const fimMes = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["aluno-calendario-eventos", inicioMes],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("id,titulo,descricao,data,hora,local,cidade,vagas").gte("data", inicioMes).lte("data", fimMes).order("data").order("hora");
      if (error) throw error;
      return (data ?? []) as Evento[];
    },
  });

  const { data: inscricoes = [] } = useQuery({
    queryKey: ["aluno-calendario-turmas", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("id,status,livro:livros(id,titulo),turma:turmas(id,nome,data_inicio,data_fim,dia_semana,horario,sala)")
        .eq("participante_id", user!.id)
        .eq("status", "confirmada");
      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
    },
  });

  const itens = useMemo<Item[]>(() => {
    const result: Item[] = eventos.map((e) => ({
      kind: "evento",
      id: "evento-" + e.id,
      data: e.data,
      titulo: e.titulo || "Evento",
      hora: e.hora,
      evento: e,
    }));
    for (const inscricao of inscricoes) {
      for (const data of gerarAulas(inscricao.turma)) {
        if (data >= inicioMes && data <= fimMes) {
          result.push({
            kind: "aula",
            id: "aula-" + inscricao.id + "-" + data,
            data,
            titulo: inscricao.livro?.titulo || "Aula",
            hora: inscricao.turma?.horario || null,
            inscricao,
          });
        }
      }
    }
    return result.sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
  }, [eventos, inscricoes, inicioMes, fimMes]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Item[]>();
    for (const item of itens) {
      const list = mapa.get(item.data) ?? [];
      list.push(item);
      mapa.set(item.data, list);
    }
    return mapa;
  }, [itens]);

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: primeiro.getDay() }, () => null), ...Array.from({ length: totalDias }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1))];
  }, [mes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Calendário</h1>
        <p className="text-sm text-muted-foreground">Quando sua vaga for confirmada, todas as aulas semanais da turma aparecem automaticamente aqui.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <p className="font-serif text-lg font-semibold">{MESES[mes.getMonth()]} {mes.getFullYear()}</p>
            <Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">{DIAS.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {celulas.map((dia, idx) => {
              if (!dia) return <div key={"v-"+idx} className="min-h-[92px] rounded-md bg-muted/20" />;
              const key = iso(dia);
              const doDia = porDia.get(key) ?? [];
              const eHoje = key === hojeIso;
              return (
                <div key={key} className={"min-h-[92px] rounded-md border p-1 text-left " + (eHoje ? "border-primary bg-primary/5" : "border-border/60")}>
                  <span className={"text-xs " + (eHoje ? "font-semibold text-primary" : "text-muted-foreground")}>{dia.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {doDia.map((item) => (
                      <button key={item.id} type="button" onClick={() => setDetalhe(item)} className={"w-full truncate rounded px-1 py-1 text-left text-[10px] " + (item.kind === "aula" ? "bg-gold/15 hover:bg-gold/25" : "bg-secondary hover:bg-secondary/80")}>
                        {item.hora ? item.hora.slice(0, 5) + " " : ""}{item.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {isLoading && <p className="mt-3 text-sm text-muted-foreground">Carregando calendário...</p>}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary" className="gap-1"><BookOpen className="h-3.5 w-3.5" /> Aula da sua turma</Badge>
        <Badge variant="outline" className="gap-1"><CalendarDays className="h-3.5 w-3.5" /> Evento</Badge>
        <Button asChild variant="outline" size="sm"><Link to="/presenca">Ver presença e justificar faltas</Link></Button>
      </div>

      <Dialog open={!!detalhe} onOpenChange={(open) => !open && setDetalhe(null)}>
        <DialogContent className="max-w-lg">
          {detalhe?.kind === "aula" && (
            <>
              <DialogHeader><DialogTitle>{detalhe.titulo}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <p><strong>Turma:</strong> {detalhe.inscricao.turma?.nome || "—"}</p>
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {localDate(detalhe.data).toLocaleDateString("pt-BR")}</p>
                {detalhe.hora && <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {detalhe.hora.slice(0,5)}</p>}
                {detalhe.inscricao.turma?.sala && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {detalhe.inscricao.turma.sala}</p>}
                <p className="text-xs text-muted-foreground">Para registrar ou justificar sua presença, use a aba Presença.</p>
              </div>
            </>
          )}
          {detalhe?.kind === "evento" && (
            <>
              <DialogHeader><DialogTitle>{detalhe.evento.titulo || "Evento"}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                {detalhe.evento.descricao && <p className="text-muted-foreground">{detalhe.evento.descricao}</p>}
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {localDate(detalhe.data).toLocaleDateString("pt-BR")}</p>
                {detalhe.hora && <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {detalhe.hora.slice(0,5)}</p>}
                {(detalhe.evento.local || detalhe.evento.cidade) && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {[detalhe.evento.local, detalhe.evento.cidade].filter(Boolean).join(" — ")}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
