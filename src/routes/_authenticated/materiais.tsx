import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FolderOpen } from "lucide-react";
import { toast } from "sonner";

export const Route=createFileRoute("/_authenticated/materiais")({component:MateriaisPage});
type Material={id:string;livro_id:string;modulo:number;titulo:string;arquivo_nome:string|null;tamanho_bytes:number|null;mime_type:string|null;url:string};
type Livro={id:string;titulo:string};
function MateriaisPage(){
 const {user}=useAuth(); const [livros,setLivros]=useState<Livro[]>([]);
 const q=useQuery({enabled:!!user,queryKey:["meus-materiais",user?.id],queryFn:async()=>{const {data:ins,error}=await supabase.from("inscricoes").select("livro_id, status, livros(id,titulo)").eq("participante_id",user!.id).eq("status","confirmada");if(error)throw error;const ids=[...new Set((ins??[]).map((x:any)=>x.livro_id).filter(Boolean))];if(!ids.length)return[] as Material[];setLivros((ins??[]).map((x:any)=>x.livros).filter(Boolean));const {data,error:e}=await supabase.from("materiais").select("id,livro_id,modulo,titulo,arquivo_nome,tamanho_bytes,mime_type,url").in("livro_id",ids).order("livro_id").order("modulo").order("created_at");if(e)throw e;return(data??[]) as Material[]}});
 async function abrir(m:Material){const {data,error}=await supabase.storage.from("book-materiais").createSignedUrl(m.url,300);if(error||!data?.signedUrl){toast.error("Não foi possível abrir o material.");return}window.open(data.signedUrl,"_blank","noopener,noreferrer")}
 const groups=new Map<string,Material[]>();for(const m of q.data??[]){const a=groups.get(m.livro_id)??[];a.push(m);groups.set(m.livro_id,a)}
 return <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Área do aluno</p><h1 className="font-serif text-2xl font-semibold sm:text-3xl">Materiais dos módulos</h1><p className="mt-1 text-sm text-muted-foreground">Acesse os materiais disponibilizados para os seus cursos.</p></div>{q.isLoading&&<p className="text-sm text-muted-foreground">Carregando…</p>}{!q.isLoading&&groups.size===0&&<Card><CardContent className="flex min-h-48 flex-col items-center justify-center text-center"><FolderOpen className="mb-2 h-8 w-8 text-muted-foreground"/><p className="font-medium">Nenhum material disponível</p><p className="mt-1 text-sm text-muted-foreground">Os materiais aparecem aqui quando o ADM os disponibilizar.</p></CardContent></Card>}{[...groups.entries()].map(([livroId,items])=>{const livro=livros.find(l=>l.id===livroId);const modulos=new Map<number,Material[]>();for(const m of items){const a=modulos.get(m.modulo)??[];a.push(m);modulos.set(m.modulo,a)}return <Card key={livroId}><CardHeader><CardTitle className="text-lg">{livro?.titulo??"Curso"}</CardTitle></CardHeader><CardContent className="space-y-5">{[...modulos.entries()].map(([mod,ms])=><section key={mod} className="space-y-2"><div className="flex items-center gap-2"><Badge>Módulo {mod}</Badge></div>{ms.map(m=><div key={m.id} className="flex items-center gap-3 rounded-lg border p-3"><FileText className="h-5 w-5 shrink-0 text-primary"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.titulo}</p><p className="text-xs text-muted-foreground">{m.arquivo_nome||"Arquivo"}{m.tamanho_bytes?` · ${(m.tamanho_bytes/1024/1024).toFixed(2)} MB`:""}</p></div><Button size="sm" variant="outline" onClick={()=>abrir(m)}><Download className="mr-2 h-4 w-4"/>Abrir</Button></div>)}</section>)}</CardContent></Card>})}</div>;
}
