import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { conclusaoValida, LIMITE_MESES } from "@/lib/prerequisito";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Meu histórico — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: HistoricoPage,
});

type Livro = { id: string; titulo: string; ordem?: number | null };
type Registro = { id: string; livro_id: string; data_conclusao: string; observacao?: string | null; livro?: Livro | null };

function HistoricoPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [livroId, setLivroId] = useState("");
  const [data, setData] = useState("");
  const [obs, setObs] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);

  const livrosQ = useQuery({
    queryKey: ["livros-select"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "livros"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0)) as Livro[];
    },
  });

  const histQ = useQuery({
    enabled: !!user,
    queryKey: ["meu-historico", user?.id],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "historico_livros"), where("participante_id", "==", user!.id)));
      const registros = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Registro[];
      const livros = livrosQ.data ?? [];
      return registros
        .map((r) => ({ ...r, livro: livros.find((l) => l.id === r.livro_id) ?? null }))
        .sort((a, b) => String(b.data_conclusao).localeCompare(String(a.data_conclusao)));
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sessão expirada.");
      if (!livroId) throw new Error("Selecione o livro.");
      if (!data) throw new Error("Informe a data de conclusão.");
      if (data > hoje) throw new Error("A data precisa ser retroativa.");
      const existente = await getDocs(query(collection(db, "historico_livros"), where("participante_id", "==", user.id), where("livro_id", "==", livroId)));
      if (!existente.empty) throw new Error("Este livro já está no seu histórico.");
      const id = `${user.id}_${livroId}`;
      await setDoc(doc(db, "historico_livros", id), { participante_id: user.id, livro_id: livroId, data_conclusao: data, observacao: obs || null, created_at: new Date().toISOString() });
    },
    onSuccess: () => { toast.success("Livro registrado no seu histórico."); setLivroId(""); setData(""); setObs(""); qc.invalidateQueries({ queryKey: ["meu-historico"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => { await deleteDoc(doc(db, "historico_livros", id)); },
    onSuccess: () => { toast.success("Registro removido."); qc.invalidateQueries({ queryKey: ["meu-historico"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const registros = histQ.data ?? [];
  return (
    <div className="space-y-8">
      <div><h1 className="font-serif text-3xl font-bold">Meu histórico</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Registre livros que você já concluiu. A conclusão é válida por {LIMITE_MESES / 12} ano para a jornada.</p></div>
      <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2">
        <div className="space-y-1.5"><Label>Livro concluído</Label><Select value={livroId} onValueChange={setLivroId}><SelectTrigger><SelectValue placeholder="Selecione o livro" /></SelectTrigger><SelectContent>{(livrosQ.data ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.ordem}. {l.titulo}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="data">Data de conclusão</Label><Input id="data" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label htmlFor="obs">Observação (opcional)</Label><Textarea id="obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Turma, professor, local…" /></div>
        <div className="md:col-span-2"><Button className="bg-gold text-primary-foreground hover:bg-gold/90" disabled={criar.isPending} onClick={() => criar.mutate()}>{criar.isPending ? "Salvando…" : "Registrar conclusão"}</Button></div>
      </CardContent></Card>
      <section className="space-y-3"><h2 className="font-serif text-xl font-semibold">Livros registrados</h2>
        {histQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!histQ.isLoading && registros.length === 0 && <p className="text-sm text-muted-foreground">Nenhum livro registrado ainda.</p>}
        {registros.map((r) => { const valido = conclusaoValida(r.data_conclusao); return <Card key={r.id}><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-serif text-lg font-semibold">{r.livro ? `${r.livro.ordem}. ${r.livro.titulo}` : "Livro"}</p><p className="text-xs text-muted-foreground">Concluído em {new Date(r.data_conclusao + "T00:00:00").toLocaleDateString("pt-BR")}{r.observacao ? ` — ${r.observacao}` : ""}</p></div><div className="flex items-center gap-3"><Badge variant={valido ? "default" : "destructive"} className="inline-flex items-center gap-1">{valido ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}{valido ? "Válido" : "Vencido — refazer"}</Badge><Button size="icon" variant="ghost" onClick={() => remover.mutate(r.id)} aria-label="Remover registro"><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>; })}
      </section>
    </div>
  );
}
