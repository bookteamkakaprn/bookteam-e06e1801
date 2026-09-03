import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, Clock, Copy, Check, MapPin, Users, CreditCard, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inscricao/$eventoId")({
  head: () => ({ meta: [{ title: "Inscrição — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: InscricaoPage,
});

type Evento = { id: string; titulo: string; descricao?: string | null; cidade?: string | null; local?: string | null; data: string; hora?: string | null; valor?: number | null; vagas?: number | null; status?: string; pix_chave?: string | null; pix_qrcode_url?: string | null; pix_copia_cola?: string | null };

function moeda(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function InscricaoPage() {
  const { eventoId } = Route.useParams(); const { user } = useAuth(); const navigate = useNavigate();
  const [aceite, setAceite] = useState(false); const [pixCopiado, setPixCopiado] = useState(false); const [resultado, setResultado] = useState<{ id: string } | null>(null);
  const qEvento = useQuery({ queryKey: ["inscricao-evento", eventoId], enabled: !!eventoId, queryFn: async () => { const snap = await getDocs(query(collection(db, "eventos"), where("id", "==", eventoId))); if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() } as Evento; const d = await import("firebase/firestore").then(({getDoc,doc})=>getDoc(doc(db,"eventos",eventoId))); return d.exists() ? ({id:d.id,...d.data()} as Evento) : null; } });
  const criar = useMutation({ mutationFn: async () => {
    if (!user) throw new Error("Faça login para continuar."); if (!qEvento.data) throw new Error("Encontro não encontrado."); if (!aceite) throw new Error("Aceite os termos para continuar.");
    const existente = await getDocs(query(collection(db,"inscricoes"), where("participante_id","==",user.id), where("evento_id","==",qEvento.data.id)));
    if (!existente.empty) return { id: existente.docs[0].id };
    const ref = await addDoc(collection(db,"inscricoes"), { participante_id:user.id, evento_id:qEvento.data.id, status:"aguardando_pagamento", created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    await addDoc(collection(db,"pagamentos"), { inscricao_id:ref.id, participante_id:user.id, evento_id:qEvento.data.id, evento_titulo:qEvento.data.titulo, evento_data:qEvento.data.data, valor:Number(qEvento.data.valor??0), status:"aguardando", created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
    return { id: ref.id };
  }, onSuccess:(r)=>{setResultado(r);toast.success("Inscrição criada! Agora faça o pagamento via PIX.");}, onError:(e:Error)=>toast.error(e.message)});
  if(qEvento.isLoading) return <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/><p className="mt-2 text-sm text-muted-foreground">Carregando encontro…</p></div>;
  const e=qEvento.data; if(!e) return <div className="py-12 text-center"><AlertCircle className="mx-auto h-10 w-10 text-gold"/><h1 className="mt-4 font-serif text-2xl font-semibold">Encontro não encontrado</h1><Button asChild className="mt-5"><Link to="/eventos">Voltar aos encontros</Link></Button></div>;
  const pix=e.pix_copia_cola; const valor=Number(e.valor??0);
  const copiar=async()=>{if(!pix)return;try{await navigator.clipboard.writeText(pix);setPixCopiado(true);toast.success("Código PIX copiado.");setTimeout(()=>setPixCopiado(false),2000);}catch{toast.error("Não foi possível copiar.");}};
  return <div className="space-y-6">
    <Button asChild variant="ghost" size="sm"><Link to="/eventos"><ArrowLeft className="mr-2 h-4 w-4"/>Voltar aos encontros</Link></Button>
    <Card><CardHeader><CardTitle className="font-serif text-2xl">{e.titulo}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span><Calendar className="mr-1 inline h-4 w-4"/>{new Date(e.data+"T00:00:00").toLocaleDateString("pt-BR")}</span>{e.hora&&<span><Clock className="mr-1 inline h-4 w-4"/>{e.hora.slice(0,5)}</span>}{(e.local||e.cidade)&&<span><MapPin className="mr-1 inline h-4 w-4"/>{[e.local,e.cidade].filter(Boolean).join(" — ")}</span>}<span><Users className="mr-1 inline h-4 w-4"/>{e.vagas??0} vagas</span></div>{e.descricao&&<p className="text-sm text-muted-foreground">{e.descricao}</p>}<Badge variant="secondary">{moeda(valor)}</Badge></CardContent></Card>
    {!resultado ? <Card><CardHeader><CardTitle className="text-base">Confirmar inscrição</CardTitle></CardHeader><CardContent className="space-y-5"><div className="flex items-start gap-3"><Checkbox id="aceite" checked={aceite} onCheckedChange={(v)=>setAceite(v===true)}/><Label htmlFor="aceite" className="cursor-pointer text-sm leading-5">Confirmo meus dados e quero me inscrever neste encontro. Estou ciente de que a inscrição ficará aguardando pagamento até a validação.</Label></div><Button className="w-full bg-gold text-primary-foreground hover:bg-gold/90" disabled={criar.isPending} onClick={()=>criar.mutate()}>{criar.isPending?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Criando…</>:"Confirmar inscrição"}</Button></CardContent></Card> : <Card><CardHeader><CardTitle className="text-base">Pagamento via PIX</CardTitle></CardHeader><CardContent className="space-y-4">{e.pix_qrcode_url&&<img src={e.pix_qrcode_url} alt="QR Code PIX" className="mx-auto h-48 w-48 object-contain"/>}{e.pix_chave&&<p className="break-all text-sm"><strong>Chave PIX:</strong> {e.pix_chave}</p>}{pix?<div className="space-y-2"><p className="break-all rounded bg-muted p-3 text-xs">{pix}</p><Button variant="outline" onClick={copiar}>{pixCopiado?<><Check className="mr-2 h-4 w-4"/>Copiado</>:<><Copy className="mr-2 h-4 w-4"/>Copiar PIX</>}</Button></div>:<p className="text-sm text-muted-foreground">O PIX ainda não foi cadastrado para este encontro. Entre em contato com a organização.</p>}<Button variant="outline" onClick={()=>navigate({to:"/pagamentos"})}><CreditCard className="mr-2 h-4 w-4"/>Ver meus pagamentos</Button></CardContent></Card>}
  </div>;
}
