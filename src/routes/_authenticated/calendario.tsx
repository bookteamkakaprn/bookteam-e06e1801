import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário de encontros — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: CalendarioPage,
});

type Evento = { id: string; titulo: string; descricao?: string | null; data: string; hora?: string | null; cidade?: string | null; local?: string | null; vagas?: number | null; livro_titulo?: string | null };
type Inscricao = { id: string; evento_id: string; status: string };
type Presenca = { id: string; evento_id: string; inscricao_id?: string; presente: boolean };
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtData = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

function CalendarioPage() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const hoje = new Date(); const hojeIso = iso(hoje);
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [detalhe, setDetalhe] = useState<Evento | null>(null);
  const inicio = iso(new Date(mes.getFullYear(), mes.getMonth(), 1)); const fim = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));

  const eventosQ = useQuery({ enabled: !authLoading && !!user, queryKey: ["aluno-calendario", inicio], queryFn: async () => {
    const snap = await getDocs(collection(db, "eventos"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((e) => String(e.data ?? "") >= inicio && String(e.data ?? "") <= fim).sort((a,b) => String(a.data).localeCompare(String(b.data))) as Evento[];
  }});
  const inscricoesQ = useQuery({ enabled: !authLoading && !!user, queryKey: ["aluno-inscricoes-cal", user?.uid], queryFn: async () => {
    const snap = await getDocs(query(collection(db, "inscricoes"), where("participante_id", "==", user!.uid)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inscricao[];
  }});
  const presencasQ = useQuery({ enabled: !authLoading && !!user, queryKey: ["aluno-presencas-cal", user?.uid], queryFn: async () => {
    const snap = await getDocs(query(collection(db, "presencas"), where("participante_id", "==", user!.uid)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Presenca[];
  }});

  const eventos = eventosQ.data ?? []; const inscricoes = inscricoesQ.data ?? []; const presencas = presencasQ.data ?? [];
  const porDia = useMemo(() => { const m = new Map<string, Evento[]>(); eventos.forEach((e) => m.set(e.data, [...(m.get(e.data) ?? []), e])); return m; }, [eventos]);
  const celulas = useMemo(() => { const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1); const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate(); return [...Array.from({length: primeiro.getDay()}, () => null), ...Array.from({length: total}, (_,i) => new Date(mes.getFullYear(), mes.getMonth(), i+1))]; }, [mes]);
  const inscricaoDe = (id: string) => inscricoes.find((i) => i.evento_id === id) ?? null;
  const presencaDe = (id: string) => presencas.find((p) => p.evento_id === id) ?? null;

  const marcar = useMutation({ mutationFn: async (evento: Evento) => {
    if (!user) throw new Error("Sessão expirada."); const ins = inscricaoDe(evento.id);
    if (!ins) throw new Error("Você não está inscrito neste encontro.");
    if (ins.status !== "confirmada") throw new Error("Sua inscrição ainda não foi confirmada.");
    if (evento.data !== hojeIso) throw new Error("A presença só pode ser marcada no dia do encontro.");
    const atual = presencaDe(evento.id);
    if (atual) await updateDoc(doc(db, "presencas", atual.id), { presente: true, horario_checkin: new Date().toISOString() });
    else await addDoc(collection(db, "presencas"), { participante_id: user.uid, evento_id: evento.id, inscricao_id: ins.id, presente: true, horario_checkin: new Date().toISOString(), created_at: new Date().toISOString() });
  }, onSuccess: () => { toast.success("Presença confirmada!"); qc.invalidateQueries({ queryKey: ["aluno-presencas-cal"] }); }, onError: (e: Error) => toast.error(e.message) });

  const proximos = eventos.filter((e) => e.data >= hojeIso);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-serif text-3xl font-bold">Calendário de encontros</h1><p className="text-sm text-muted-foreground">Veja os encontros e marque sua presença no dia.</p></div><Button asChild variant="outline" size="sm"><Link to="/eventos">Encontros abertos</Link></Button></div>
    <Card><CardContent className="p-4"><div className="mb-4 flex items-center justify-between"><Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth()-1, 1))}><ChevronLeft className="h-4 w-4" /></Button><p className="font-serif text-lg font-semibold">{MESES[mes.getMonth()]} {mes.getFullYear()}</p><Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth()+1, 1))}><ChevronRight className="h-4 w-4" /></Button></div><div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-muted-foreground">{DIAS.map((d) => <div key={d} className="py-1">{d}</div>)}</div><div className="mt-1 grid grid-cols-7 gap-1">{celulas.map((dia,i) => dia ? <div key={iso(dia)} className={`min-h-[84px] rounded-md border p-1 ${iso(dia)===hojeIso ? "border-primary bg-primary/5" : "border-border/60"}`}><span className="text-xs text-muted-foreground">{dia.getDate()}</span><div className="mt-1 space-y-1">{(porDia.get(iso(dia)) ?? []).map((e) => <button key={e.id} type="button" onClick={() => setDetalhe(e)} className={`w-full truncate rounded px-1 py-0.5 text-left text-[11px] ${inscricaoDe(e.id) ? "bg-primary/20" : "bg-secondary"}`}>{e.hora?.slice(0,5)} {e.titulo}</button>)}</div></div> : <div key={`v-${i}`} className="min-h-[84px] rounded-md bg-muted/20" />)}</div>{eventosQ.isLoading && <p className="mt-3 text-sm text-muted-foreground"><Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />Carregando encontros…</p>}{eventosQ.error && <p className="mt-3 text-sm text-destructive">Não foi possível carregar o calendário.</p>}</CardContent></Card>
    <section className="space-y-3"><h2 className="font-serif text-xl font-semibold">Próximos encontros deste mês</h2>{proximos.length===0 && <p className="text-sm text-muted-foreground">Nenhum encontro programado para o restante do mês.</p>}{proximos.map((e) => <Card key={e.id}><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-serif text-lg font-semibold">{e.titulo}</p><div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground"><span><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{fmtData(e.data)} {e.hora?.slice(0,5)}</span>{(e.local||e.cidade)&&<span><MapPin className="mr-1 inline h-3.5 w-3.5" />{[e.local,e.cidade].filter(Boolean).join(" — ")}</span>}</div></div><div className="flex gap-2">{presencaDe(e.id)?.presente && <Badge><CheckCircle2 className="mr-1 h-3.5 w-3.5"/>Presença registrada</Badge>}<Button size="sm" variant="outline" onClick={()=>setDetalhe(e)}>Ver detalhes</Button></div></CardContent></Card>)}</section>
    <Dialog open={!!detalhe} onOpenChange={(o)=>!o&&setDetalhe(null)}><DialogContent><DialogHeader><DialogTitle className="font-serif text-xl">{detalhe?.titulo}</DialogTitle></DialogHeader>{detalhe && <div className="space-y-3 text-sm">{detalhe.descricao&&<p className="text-muted-foreground">{detalhe.descricao}</p>}<p><CalendarDays className="mr-2 inline h-4 w-4"/>{fmtData(detalhe.data)} {detalhe.hora?.slice(0,5)}</p>{(detalhe.local||detalhe.cidade)&&<p><MapPin className="mr-2 inline h-4 w-4"/>{[detalhe.local,detalhe.cidade].filter(Boolean).join(" — ")}</p>}<p><Users className="mr-2 inline h-4 w-4"/>{detalhe.vagas ?? 0} vagas</p>{presencaDe(detalhe.id)?.presente ? <p className="rounded bg-primary/10 p-3"><CheckCircle2 className="mr-2 inline h-4 w-4"/>Presença já registrada.</p> : !inscricaoDe(detalhe.id) ? <Button asChild className="w-full"><Link to="/inscricao/$eventoId" params={{eventoId: detalhe.id}}>Inscrever-se neste encontro</Link></Button> : inscricaoDe(detalhe.id)!.status !== "confirmada" ? <p className="rounded bg-secondary p-3">Sua inscrição está como <strong>{inscricaoDe(detalhe.id)!.status.replace(/_/g," ")}</strong>.</p> : detalhe.data !== hojeIso ? <p className="rounded bg-secondary p-3"><Clock className="mr-2 inline h-4 w-4"/>A presença poderá ser marcada no dia do encontro.</p> : <Button className="w-full" disabled={marcar.isPending} onClick={()=>marcar.mutate(detalhe)}>Marcar minha presença</Button>}</div>}</DialogContent></Dialog>
  </div>;
}
