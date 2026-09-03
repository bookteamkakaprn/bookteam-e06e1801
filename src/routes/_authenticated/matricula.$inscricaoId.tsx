import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDoc, getDocs, query, updateDoc, where, addDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Loader2, Upload, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/matricula/$inscricaoId")({
  head: () => ({ meta: [{ title: "Matrícula — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: MatriculaPage,
});
const MAX_SIZE=10*1024*1024; const ALLOWED=["application/pdf","image/jpeg","image/jpg","image/png"];

type Inscricao={id:string; participante_id:string; evento_id:string; status:string; codigo?:string; turma_id?:string|null};
type Evento={id:string; titulo:string; valor?:number; pix_chave?:string|null; pix_qrcode_url?:string|null; pix_copia_cola?:string|null; data?:string; hora?:string|null};
type Pag={id:string;status:string;valor?:number;comprovante_url?:string|null;created_at?:string;observacao?:string|null};

function MatriculaPage(){
  const {inscricaoId}=Route.useParams(); const {user, loading: authLoading}=useAuth(); const qc=useQueryClient(); const [file,setFile]=useState<File|null>(null); const [obs,setObs]=useState("");
  const q=useQuery({enabled:!authLoading&&!!user,queryKey:["matricula",inscricaoId,user?.uid],queryFn:async()=>{const s=await getDoc(doc(db,"inscricoes",inscricaoId)); if(!s.exists()||s.data().participante_id!==user!.uid)return null; const i={id:s.id,...s.data()} as Inscricao; const ev=await getDoc(doc(db,"eventos",i.evento_id)); const ps=await getDocs(query(collection(db,"pagamentos"),where("inscricao_id","==",inscricaoId))); return {inscricao:i,evento:ev.exists()?({id:ev.id,...ev.data()} as Evento):null,pagamento:ps.empty?null:({id:ps.docs[0].id,...ps.docs[0].data()} as Pag)};});
  const enviar=useMutation({mutationFn:async()=>{if(!user||!q.data)throw new Error("Matrícula não encontrada");if(!file)throw new Error("Selecione o comprovante");if(file.size>MAX_SIZE)throw new Error("Arquivo maior que 10 MB");if(!ALLOWED.includes(file.type))throw new Error("Formato inválido — use PDF, JPG, JPEG ou PNG");const ext=file.name.split(".").pop()?.toLowerCase()??"bin";const path=`comprovantes/${user.uid}/${inscricaoId}/${Date.now()}.${ext}`;const storageRef=ref(storage,path);await uploadBytes(storageRef,file,{contentType:file.type});const url=await getDownloadURL(storageRef);if(q.data.pagamento){await updateDoc(doc(db,"pagamentos",q.data.pagamento.id),{comprovante_url:url,observacao:obs||null,status:"aguardando",updated_at:new Date().toISOString()});}else{await addDoc(collection(db,"pagamentos"),{inscricao_id:inscricaoId,participante_id:user.uid,evento_id:q.data.inscricao.evento_id,evento_titulo:q.data.evento?.titulo??"Encontro",valor:Number(q.data.evento?.valor??0),comprovante_url:url,status:"aguardando",observacao:obs||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});}},onSuccess:()=>{toast.success("Comprovante enviado!");setFile(null);setObs("");qc.invalidateQueries({queryKey:["matricula",inscricaoId]});},onError:(e:Error)=>toast.error(e.message)});
  if(authLoading)return <p className="text-muted-foreground">Carregando sessão…</p>; if(q.isLoading)return <p className="text-muted-foreground">Carregando…</p>; if(!q.data)return <div className="space-y-3"><p className="text-muted-foreground">Matrícula não encontrada.</p><Button asChild variant="link" className="px-0"><Link to="/inicio">Voltar ao painel</Link></Button></div>;
  const {inscricao,evento,pagamento}=q.data;
  return <div className="space-y-6"><div><h1 className="font-serif text-2xl font-semibold">{evento?.titulo??"Matrícula"}</h1><p className="text-sm text-muted-foreground">{evento?.data?new Date(evento.data+"T00:00:00").toLocaleDateString("pt-BR"):""}{evento?.hora?` · ${evento.hora.slice(0,5)}`:""}</p>{inscricao.codigo&&<p className="mt-1 text-xs text-muted-foreground">Código: {inscricao.codigo}</p>}</div>
    {pagamento&&<Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-semibold">Status do pagamento</p><p className="text-sm text-muted-foreground">{pagamento.status==="aprovado"?"Pagamento aprovado — inscrição confirmada.":pagamento.status==="rejeitado"?"Comprovante recusado. Envie um novo.":"Aguardando validação financeira."}</p></div><Badge variant={pagamento.status==="aprovado"?"secondary":"outline"}><Clock className="mr-1 h-3.5 w-3.5"/>{pagamento.status==="aprovado"?"Pago":pagamento.status==="rejeitado"?"Recusado":"Pendente"}</Badge></CardContent></Card>}
    {(evento?.pix_chave||evento?.pix_copia_cola||evento?.pix_qrcode_url)&&<Card><CardHeader><CardTitle className="text-base">Dados para PIX</CardTitle></CardHeader><CardContent className="space-y-3">{evento.pix_qrcode_url&&<img src={evento.pix_qrcode_url} alt="QR Code PIX" className="h-40 w-40 object-contain"/>}{evento.pix_chave&&<p className="break-all text-sm"><strong>Chave:</strong> {evento.pix_chave}</p>}{evento.pix_copia_cola&&<p className="break-all rounded bg-muted p-3 text-xs">{evento.pix_copia_cola}</p>}</CardContent></Card>}
    <Card><CardHeader><CardTitle className="text-base">Enviar comprovante</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Valor: <strong className="text-foreground">{Number(evento?.valor??0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong></p><div className="space-y-1.5"><Label htmlFor="arquivo">Arquivo (PDF, PNG, JPG ou JPEG — até 10 MB)</Label><Input id="arquivo" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e)=>setFile(e.target.files?.[0]??null)}/></div><div className="space-y-1.5"><Label htmlFor="obs">Observação</Label><Textarea id="obs" value={obs} onChange={(e)=>setObs(e.target.value)}/></div><Button className="gap-2 bg-gold text-primary-foreground hover:bg-gold/90" disabled={enviar.isPending} onClick={()=>enviar.mutate()}>{enviar.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4"/>}Enviar comprovante</Button>{pagamento?.comprovante_url&&<p className="text-xs text-muted-foreground"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5"/>Comprovante já enviado.</p>}</CardContent></Card>
  </div>;
}
