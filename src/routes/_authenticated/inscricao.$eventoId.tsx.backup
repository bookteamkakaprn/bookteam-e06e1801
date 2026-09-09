import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Calendar, Clock, Copy, Check, CreditCard, MapPin, Users, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inscricao/$eventoId")({
  head: () => ({ meta: [{ title: "Inscrição — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: InscricaoPage,
});

type Evento = { id: string; nome: string; livro_id: string | null; descricao: string | null; local: string | null; data_evento: string; valor: number; status: string };
type Livro = { id: string; titulo: string; autor: string | null; ordem: number | null; imagem_url: string | null };
type Turma = { id: string; livro_id: string; nome: string | null; data_inicio: string | null; data_fim: string | null; horario: string | null; professor: string | null; coordenador: string | null; sala: string | null; vagas: number; inscritos: number; vagas_restantes: number; ativo: boolean };
type InscricaoCriada = { id: string; codigo: string | null };
function moeda(v: number | null | undefined) { return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function dataBR(v: string | null | undefined) { return v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR") : ""; }
function formatarDataLonga(v: string | null | undefined) { return v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : ""; }

function InscricaoPage() {
  const { eventoId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [livrosConcluidos, setLivrosConcluidos] = useState<number[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [etapa, setEtapa] = useState<"confirmacao" | "pagamento">("confirmacao");
  const [inscricao, setInscricao] = useState<InscricaoCriada | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [criando, setCriando] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["inscricao-evento", eventoId],
    enabled: !!eventoId,
    queryFn: async () => {
      const eventoRes = await supabase.from("eventos").select("*").eq("id", eventoId).maybeSingle();
      if (eventoRes.error) throw eventoRes.error;
      if (!eventoRes.data) return { evento: null, livro: null, turmas: [] as Turma[] };
      const evento = eventoRes.data as unknown as Evento & { pix_copia_cola: string | null; pix_qrcode_url: string | null };
      let livro: Livro | null = null;
      if (evento.livro_id) {
        const livroRes = await supabase.from("livros").select("id,titulo,autor,ordem,imagem_url").eq("id", evento.livro_id).maybeSingle();
        if (livroRes.error) throw livroRes.error;
        livro = livroRes.data as Livro | null;
      }
      let turmas: Turma[] = [];
      if (evento.livro_id) {
        const turmasRes = await supabase.from("turmas").select("*").eq("livro_id", evento.livro_id).eq("ativo", true).order("data_inicio", { ascending: true });
        if (turmasRes.error) throw turmasRes.error;
        turmas = (turmasRes.data ?? []) as Turma[];
      }
      return { evento, livro, turmas };
    },
  });

  const jornada = ["Mantenha Seu Amor Aceso", "Cultura da Honra", "Livro 3", "Livro 4", "Organize a Sua Desordem Mental", "O Despertar da Leoa", "Livro 7", "Os Caminhos Sobrenaturais da Realeza", "O Poder Sobrenatural de uma Mente Transformada", "Impunível"];
  const ultimoLivroConcluido = (() => { let ultimo = 0; for (let i = 1; i <= 10; i++) { if (livrosConcluidos.includes(i)) ultimo = i; else break; } return ultimo; })();
  const proximoLivro = ultimoLivroConcluido + 1;
  const possuiSequenciaInvalida = livrosConcluidos.some(n => n > ultimoLivroConcluido + 1);
  function alternarLivro(numero: number) { setLivrosConcluidos(atual => atual.includes(numero) ? atual.filter(i => i !== numero) : [...atual, numero].sort((a,b) => a-b)); }
  function validarJornada() {
    if (possuiSequenciaInvalida) { toast.error("Marque os livros concluídos em sequência, começando pelo Livro 1."); return false; }
    const ordemAtual = data?.livro?.ordem ?? null;
    if (!ordemAtual || ordemAtual <= 1) return true;
    if (ultimoLivroConcluido < ordemAtual - 1) { toast.error(`Para se inscrever no Livro ${ordemAtual}, informe primeiro que você já concluiu os livros anteriores.`); return false; }
    return true;
  }
  async function copiarPix() {
    const pix = data?.evento?.pix_copia_cola;
    if (!pix) { toast.error("O código PIX ainda não foi cadastrado."); return; }
    try { await navigator.clipboard.writeText(pix); setPixCopiado(true); toast.success("Código PIX copiado."); window.setTimeout(() => setPixCopiado(false), 2500); } catch { toast.error("Não foi possível copiar automaticamente."); }
  }
  const criarInscricao = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth", search: { mode: "signin" } }); throw new Error("Você precisa estar logado para continuar."); }
      if (!data?.evento) throw new Error("Evento não encontrado.");
      if (!validarJornada()) throw new Error("Jornada inválida.");
      if (data.turmas.length > 0 && !turmaSelecionada) throw new Error("Selecione a turma da qual deseja participar.");
      const existenteRes = await supabase.from("inscricoes").select("id,codigo").eq("participante_id", user.id).eq("evento_id", data.evento.id).maybeSingle();
      if (existenteRes.error) throw existenteRes.error;
      let inscricaoCriada: InscricaoCriada;
      if (existenteRes.data) inscricaoCriada = existenteRes.data as InscricaoCriada;
      else {
        const codigo = `BT-${Date.now().toString(36).toUpperCase()}`;
        const res = await supabase.from("inscricoes").insert({ participante_id: user.id, evento_id: data.evento.id, turma_id: turmaSelecionada || null, livro_id: data.evento.livro_id, status: "aguardando_pagamento", codigo }).select("id,codigo").single();
        if (res.error) throw res.error;
        inscricaoCriada = res.data as InscricaoCriada;
      }
      const pagamentoExistente = await supabase.from("pagamentos").select("id").eq("inscricao_id", inscricaoCriada.id).maybeSingle();
      if (pagamentoExistente.error) throw pagamentoExistente.error;
      if (!pagamentoExistente.data) {
        const pagamentoRes = await supabase.from("pagamentos").insert({ inscricao_id: inscricaoCriada.id, valor: Number(data.evento.valor ?? 0), status: "aguardando" });
        if (pagamentoRes.error) throw pagamentoRes.error;
      }
      return inscricaoCriada;
    },
    onSuccess: (res) => { setInscricao(res); setEtapa("pagamento"); toast.success("Inscrição criada. Agora faça o pagamento via PIX."); },
    onError: (e: unknown) => { if (e instanceof Error && e.message !== "Você precisa estar logado para continuar.") toast.error(e.message || "Não foi possível criar sua inscrição."); setCriando(false); },
  });

  if (isLoading) return <div className="min-h-screen bg-background px-4 py-16"><div className="mx-auto max-w-4xl animate-pulse space-y-5"><div className="h-8 w-40 rounded bg-muted" /><div className="h-12 w-2/3 rounded bg-muted" /><div className="h-40 rounded-2xl bg-muted" /><div className="h-60 rounded-2xl bg-muted" /></div></div>;
  if (error || !data?.evento) return <div className="min-h-screen bg-background px-4 py-16"><div className="mx-auto max-w-3xl text-center"><AlertCircle className="mx-auto h-12 w-12 text-gold" /><h1 className="mt-5 font-serif text-3xl font-semibold">Inscrição não encontrada</h1><p className="mt-3 text-muted-foreground">Não conseguimos encontrar este encontro.</p><Button asChild className="mt-6 bg-gold text-primary-foreground"><Link to="/">Voltar para os livros</Link></Button></div></div>;

  const { evento, livro, turmas } = data;
  const turmaEscolhida = turmas.find(t => t.id === turmaSelecionada);
  const temPix = Boolean(evento.pix_copia_cola);

  return <div className="min-h-screen bg-background text-foreground"><header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-8"><Link to="/livros/$id" params={{ id: livro?.id ?? "" }} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Voltar para o livro</Link><div className="text-right"><p className="font-serif text-sm font-semibold">BOOK TEAM</p><p className="text-[9px] uppercase tracking-[0.2em] text-gold">inscrição</p></div></div></header><main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12"><div className="mx-auto mb-8 flex max-w-xl items-center justify-center gap-2"><div className={`flex items-center gap-2 ${etapa === "confirmacao" ? "text-gold" : "text-muted-foreground"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-full border ${etapa === "confirmacao" ? "border-gold bg-gold text-primary-foreground" : "border-gold/50"}`}>1</span><span className="hidden text-sm font-medium sm:inline">Confirmar inscrição</span></div><div className="h-px w-10 bg-border sm:w-20" /><div className={`flex items-center gap-2 ${etapa === "pagamento" ? "text-gold" : "text-muted-foreground"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-full border ${etapa === "pagamento" ? "border-gold bg-gold text-primary-foreground" : "border-border"}`}>2</span><span className="hidden text-sm font-medium sm:inline">Pagamento PIX</span></div></div><div className="grid gap-6 md:grid-cols-[1fr_1.4fr]"><Card className="overflow-hidden border-gold/20"><div className="aspect-[2/3] max-h-[420px] bg-gradient-to-br from-[oklch(0.4_0.12_25)] to-[oklch(0.2_0.05_20)]">{livro?.imagem_url ? <img src={livro.imagem_url} alt={livro.titulo} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center p-8 text-center"><BookOpen className="h-14 w-14 text-gold" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Livro {livro?.ordem ?? ""}</p></div>}</div><CardContent className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Livro {livro?.ordem ?? ""}</p><h2 className="mt-2 font-serif text-xl font-semibold">{livro?.titulo ?? "Livro Book Team"}</h2>{livro?.autor && <p className="mt-1 text-sm text-muted-foreground">{livro.autor}</p>}</CardContent></Card><div className="space-y-5"><Card className="border-gold/20"><CardHeader><CardTitle className="font-serif text-2xl">{evento.nome}</CardTitle></CardHeader><CardContent className="space-y-3">{evento.data_evento && <div className="flex items-start gap-3"><Calendar className="h-5 w-5 text-gold" /><div><p className="text-xs text-muted-foreground">Data</p><p className="font-medium capitalize">{formatarDataLonga(evento.data_evento)}</p></div></div>}{evento.local && <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-gold" /><div><p className="text-xs text-muted-foreground">Local</p><p className="font-medium">{evento.local}</p></div></div>}<div className="flex items-start gap-3"><Users className="h-5 w-5 text-gold" /><div><p className="text-xs text-muted-foreground">Vagas</p><p className="font-medium">{turmaEscolhida?.vagas_restantes ?? 0} vagas disponíveis</p></div></div><div className="border-t border-border/50 pt-4"><p className="text-xs text-muted-foreground">Investimento</p><p className="font-serif text-2xl font-semibold text-gold">{moeda(evento.valor)}</p></div></CardContent></Card>{etapa === "confirmacao" && <Card className="border-gold/20"><CardHeader><div className="flex items-start gap-3"><BookOpen className="h-5 w-5 text-gold" /><div><CardTitle className="font-serif text-xl">Sua jornada</CardTitle><p className="mt-1 text-sm text-muted-foreground">Marque os livros que você já concluiu.</p></div></div></CardHeader><CardContent><div className="space-y-2">{jornada.map((titulo,index) => { const numero=index+1; const marcado=livrosConcluidos.includes(numero); const bloqueado=numero>1&&!livrosConcluidos.includes(numero-1); return <label key={numero} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${marcado ? "border-gold/50 bg-gold/10" : "border-border/60"}`}><Checkbox checked={marcado} disabled={bloqueado} onCheckedChange={() => alternarLivro(numero)} /><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold">Livro {numero}</p><p className="truncate text-sm font-medium">{titulo}</p></div>{marcado && <Check className="h-4 w-4 text-gold" />}</label>; })}</div><div className="mt-4 rounded-xl bg-muted/50 p-4 text-sm">{ultimoLivroConcluido===0 ? <><strong>Você está começando a jornada.</strong><br/>O Livro 1 será o seu primeiro passo.</> : ultimoLivroConcluido>=10 ? <>Você informou que já concluiu os 10 livros.</> : <><strong>Último livro concluído: Livro {ultimoLivroConcluido}</strong><br/>Seu próximo passo é o <strong>Livro {proximoLivro}</strong>.</>}</div></CardContent></Card>}{etapa === "confirmacao" && turmas.length > 0 && <Card className="border-gold/20"><CardHeader><CardTitle className="font-serif text-xl">Escolha sua turma</CardTitle></CardHeader><CardContent className="space-y-3">{turmas.map(t => { const sel=turmaSelecionada===t.id; const sem=t.vagas>0&&t.vagas_restantes<=0; const indis=sem; return <button key={t.id} type="button" disabled={indis} onClick={()=>setTurmaSelecionada(t.id)} className={`w-full rounded-2xl border p-4 text-left ${sel ? "border-gold bg-gold/10" : "border-border/60"} ${indis ? "opacity-50" : ""}`}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{t.nome ?? "Turma"}</p></div>{sel&&<Check className="h-5 w-5 text-gold"/>}</div><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">{t.data_inicio&&<span>Início: {dataBR(t.data_inicio)}</span>}{t.data_fim&&<span>Final: {dataBR(t.data_fim)}</span>}{t.horario&&<span>Horário: {t.horario}</span>}{t.sala&&<span>Sala: {t.sala}</span>}{t.professor&&<span>Professor: {t.professor}</span>}{t.vagas>0&&<span>{t.vagas_restantes} vagas restantes</span>}</div></button>; })}</CardContent></Card>}{etapa === "confirmacao" && <Card className="border-gold/30 bg-gold/5"><CardContent className="p-5"><div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs text-muted-foreground">Valor da inscrição</p><p className="font-serif text-2xl font-semibold text-gold">{moeda(evento.valor)}</p></div><Button size="lg" onClick={()=>criarInscricao.mutate()} disabled={criando||criarInscricao.isPending} className="w-full bg-gold text-primary-foreground sm:w-auto">{criando||criarInscricao.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processando...</> : <>Continuar<ArrowRight className="ml-2 h-4 w-4"/></>}</Button></div></CardContent></Card>}{etapa === "pagamento" && <Card className="border-gold/30"><CardHeader><Badge className="w-fit bg-gold text-primary-foreground">Inscrição criada</Badge><CardTitle className="font-serif text-2xl">Agora faça o pagamento</CardTitle><p className="text-sm text-muted-foreground">Sua vaga foi reservada. Copie o código PIX e faça o pagamento no seu banco.</p></CardHeader><CardContent className="space-y-5"><div className="rounded-2xl border border-gold/30 bg-gold/5 p-5"><p className="text-xs text-muted-foreground">Valor</p><p className="font-serif text-2xl font-semibold text-gold">{moeda(evento.valor)}</p></div>{inscricao?.codigo&&<div className="rounded-xl border border-border/60 bg-card p-4"><p className="text-xs text-muted-foreground">Código da inscrição</p><p className="mt-1 font-mono text-sm font-semibold">{inscricao.codigo}</p></div>}{temPix ? <div><Label className="text-sm font-semibold">PIX copia e cola</Label><div className="mt-2 flex gap-2"><div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border/60 bg-muted p-3"><p className="break-all font-mono text-xs leading-relaxed text-muted-foreground">{evento.pix_copia_cola}</p></div><Button type="button" variant="outline" onClick={copiarPix} className="shrink-0">{pixCopiado?<><Check className="mr-2 h-4 w-4"/>Copiado</>:<><Copy className="mr-2 h-4 w-4"/>Copiar</>}</Button></div></div> : <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5"><p className="font-semibold">PIX ainda não cadastrado</p></div>}{evento.pix_qrcode_url&&<div className="text-center"><p className="mb-3 text-sm font-semibold">Ou escaneie o QR Code</p><img src={evento.pix_qrcode_url} alt="QR Code para pagamento PIX" className="mx-auto h-56 w-56 rounded-2xl border border-border bg-white p-3"/></div>}<div className="border-t border-border/50 pt-5"><p className="text-sm text-muted-foreground">Depois de realizar o pagamento, envie o comprovante pela sua área do aluno.</p><Button asChild className="mt-4 w-full bg-gold text-primary-foreground"><Link to="/pagamentos">Ir para pagamentos<ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></CardContent></Card>}</div></div></main></div>;
}
