import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/certificados")({
  head: () => ({ meta: [{ title: "Certificados — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: CertificadosPage,
});

type Cert = { id:string; evento_titulo?:string; livro_titulo?:string; data_emissao?:string; carga_horaria?:number; pdf_url?:string };
function CertificadosPage(){
  const {user, loading: authLoading}=useAuth();
  const q=useQuery({enabled:!authLoading&&!!user,queryKey:["meus-certificados",user?.uid],queryFn:async()=>{const s=await getDocs(query(collection(db,"certificados"),where("participante_id","==",user!.uid)));return s.docs.map(d=>({id:d.id,...d.data()})) as Cert[];}});
  return <div className="space-y-5"><div><h1 className="font-serif text-3xl font-bold">Certificados</h1><p className="text-muted-foreground">Seus certificados ficam disponíveis aqui após a conclusão das atividades.</p></div>{authLoading&&<p className="text-sm text-muted-foreground"><Loader2 className="mr-1 inline h-4 w-4 animate-spin"/>Carregando sessão…</p>}{q.isLoading&&<p className="text-sm text-muted-foreground"><Loader2 className="mr-1 inline h-4 w-4 animate-spin"/>Carregando…</p>}{q.error&&<p className="text-sm text-destructive">Não foi possível carregar seus certificados.</p>}{!authLoading&&!q.isLoading&&!q.error&&(q.data??[]).length===0&&<Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><Award className="h-5 w-5"/>Nenhum certificado disponível ainda.</CardContent></Card>)}{(q.data??[]).map(c=><Card key={c.id}><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-serif text-lg font-semibold">{c.evento_titulo??c.livro_titulo??"Certificado"}</p><p className="text-xs text-muted-foreground">{c.data_emissao?`Emitido em ${new Date(c.data_emissao+"T00:00:00").toLocaleDateString("pt-BR")}`:"Certificado emitido"}{c.carga_horaria?` · ${c.carga_horaria}h`:""}</p></div>{c.pdf_url&&<Button asChild variant="outline" size="sm"><a href={c.pdf_url} target="_blank" rel="noreferrer">Abrir PDF<ExternalLink className="ml-2 h-4 w-4"/></a></Button>}</CardContent></Card>)}</div>;
}
