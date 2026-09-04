import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

export const Route=createFileRoute("/_authenticated/mensagens")({component:MensagensPage});
type Msg={id:string;remetente_id:string;remetente_tipo:string;assunto:string|null;mensagem:string;lida:boolean;created_at:string};
function MensagensPage(){
 const {user}=useAuth(); const qc=useQueryClient(); const [assunto,setAssunto]=useState(""); const [mensagem,setMensagem]=useState("");
 const q=useQuery({enabled:!!user,queryKey:["minhas-mensagens",user?.id],queryFn:async()=>{const {data,error}=await supabase.from("mensagens_admin").select("id,remetente_id,remetente_tipo,assunto,mensagem,lida,created_at").eq("participante_id",user!.id).order("created_at");if(error)throw error;return(data??[]) as Msg[]}});
 const enviar=useMutation({mutationFn:async()=>{if(!user||!mensagem.trim())throw new Error("Digite sua mensagem.");const {error}=await supabase.from("mensagens_admin").insert({participante_id:user.id,remetente_id:user.id,remetente_tipo:"aluno",assunto:assunto.trim()||null,mensagem:mensagem.trim()});if(error)throw error},onSuccess:()=>{toast.success("Mensagem enviada ao ADM.");setAssunto("");setMensagem("");qc.invalidateQueries({queryKey:["minhas-mensagens",user?.id]})},onError:(e:unknown)=>toast.error(e instanceof Error?e.message:"Não foi possível enviar.")});
 return <div className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Comunicação</p><h1 className="font-serif text-2xl font-semibold sm:text-3xl">Fale com o ADM</h1><p className="mt-1 text-sm text-muted-foreground">Envie dúvidas, pedidos ou informações diretamente para a administração.</p></div><Card><CardHeader><CardTitle className="text-lg">Nova mensagem</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={assunto} onChange={e=>setAssunto(e.target.value)} placeholder="Assunto (opcional)"/><Textarea rows={5} value={mensagem} onChange={e=>setMensagem(e.target.value)} placeholder="Escreva sua mensagem…"/><Button disabled={enviar.isPending} onClick={()=>enviar.mutate()}><Send className="mr-2 h-4 w-4"/>Enviar ao ADM</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-lg">Conversa</CardTitle></CardHeader><CardContent className="space-y-3">{q.isLoading&&<p className="text-sm text-muted-foreground">Carregando…</p>}{!q.isLoading&&(q.data??[]).length===0&&<p className="text-sm text-muted-foreground">Você ainda não enviou nenhuma mensagem.</p>}{(q.data??[]).map(m=><div key={m.id} className={`rounded-lg border p-3 ${m.remetente_tipo==="admin"?"bg-primary/5":"bg-muted/40"}`}><div className="flex items-center justify-between gap-2"><Badge variant={m.remetente_tipo==="admin"?"default":"outline"}>{m.remetente_tipo==="admin"?"ADM":"Você"}</Badge><span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</span></div>{m.assunto&&<p className="mt-2 text-sm font-semibold">{m.assunto}</p>}<p className="mt-1 whitespace-pre-wrap text-sm">{m.mensagem}</p></div>)}</CardContent></Card></div>;
}
