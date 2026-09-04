import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/cadastro/$turmaId")({
  head: () => ({ meta: [{ title: "Cadastro — Book Team" }, { name: "description", content: "Preencha seus dados para garantir a vaga na turma." }, { name: "robots", content: "noindex" }] }),
  component: CadastroPage,
});

const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo").max(120),
  cpf: z.string().trim().min(11, "CPF inválido").max(20),
  nascimento: z.string().min(1, "Informe a data de nascimento"),
  telefone: z.string().trim().min(8, "Telefone inválido").max(20),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(255),
  cidade: z.string().trim().min(2, "Informe a cidade").max(80),
  estado: z.string().trim().min(2, "Informe o estado").max(40),
  igreja: z.string().trim().max(120).optional().or(z.literal("")),
  como_conheceu: z.string().trim().max(200).optional().or(z.literal("")),
});
type Form = z.infer<typeof schema>;
const campos: { key: keyof Form; label: string; type?: string }[] = [
  { key: "nome", label: "Nome completo" }, { key: "cpf", label: "CPF" }, { key: "nascimento", label: "Nascimento", type: "date" }, { key: "telefone", label: "Telefone" }, { key: "whatsapp", label: "WhatsApp" }, { key: "email", label: "E-mail", type: "email" }, { key: "cidade", label: "Cidade" }, { key: "estado", label: "Estado" }, { key: "igreja", label: "Igreja" }, { key: "como_conheceu", label: "Como conheceu o Book Team" },
];
function senhaProvisoria() { const bytes = new Uint8Array(9); crypto.getRandomValues(bytes); return "BT" + btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "") + "1!"; }

function CadastroPage() {
  const { turmaId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>({ nome: "", cpf: "", nascimento: "", telefone: "", whatsapp: "", email: "", cidade: "", estado: "", igreja: "", como_conheceu: "" });
  const [aceite, setAceite] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);

  const { data: turma, isLoading: carregandoTurma } = useQuery({
    queryKey: ["turma-cadastro", turmaId],
    queryFn: async () => { const { data, error } = await supabase.from("turmas").select("*, livros(id, titulo)").eq("id", turmaId).maybeSingle(); if (error) throw error; return data; },
  });
  const esgotada = !!turma && turma.vagas > 0 && (turma.vagas_restantes ?? 0) <= 0;

  const inscreverAlunoLogado = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Faça login para continuar.");
      if (!turma) throw new Error("Turma não encontrada.");

      const { data: existente, error: consultaError } = await supabase
        .from("inscricoes")
        .select("id,status")
        .eq("participante_id", user.id)
        .eq("turma_id", turmaId)
        .maybeSingle();
      if (consultaError) throw consultaError;

      if (existente) return { existente: true, status: existente.status };

      const status = esgotada ? "lista_espera" : "aguardando_pagamento";
      const { error } = await supabase.from("inscricoes").insert({
        participante_id: user.id,
        turma_id: turmaId,
        livro_id: turma.livro_id ?? null,
        status,
      });
      if (error) throw error;
      return { existente: false, status };
    },
    onSuccess: (res) => {
      toast.success(res.existente ? "Você já está inscrito nesta turma." : esgotada ? "Você entrou na lista de espera!" : "Inscrição realizada com sucesso!");
      navigate({ to: "/inicio" });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível realizar a inscrição."),
  });

  useEffect(() => {
    if (user?.id && turma && !inscreverAlunoLogado.isPending && !inscreverAlunoLogado.isSuccess) {
      inscreverAlunoLogado.mutate();
    }
  }, [user?.id, turma?.id]);

  const enviar = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form); if (!parsed.success) throw new Error(parsed.error.issues[0].message); if (!aceite) throw new Error("É necessário aceitar os termos"); const d = parsed.data;
      let userId = user?.id ?? null; let senha: string | null = null;
      if (!userId) {
        senha = senhaProvisoria();
        const { data: signUpData, error } = await supabase.auth.signUp({ email: d.email, password: senha, options: { emailRedirectTo: window.location.origin, data: { nome: d.nome, cpf: d.cpf, telefone: d.telefone, cidade: d.cidade, estado: d.estado, aceite_lgpd: true } } });
        if (error) throw new Error(error.message); userId = signUpData.user?.id ?? null;
        if (!signUpData.session) return { pendenteConfirmacao: true, senha, inscricaoId: null as string | null };
      }
      if (!userId) throw new Error("Não foi possível criar o acesso");
      const { error: participanteError } = await supabase.from("participantes").update({ nome: d.nome, cpf: d.cpf, nascimento: d.nascimento, telefone: d.telefone, whatsapp: d.whatsapp || null, cidade: d.cidade, estado: d.estado, igreja: d.igreja || null, como_conheceu: d.como_conheceu || null, aceite_lgpd: true }).eq("id", userId);
      if (participanteError) throw new Error(participanteError.message);
      const { data: insc, error: errInsc } = await supabase.from("inscricoes").insert({ participante_id: userId, turma_id: turmaId, livro_id: turma?.livro_id ?? null, status: esgotada ? "lista_espera" : "aguardando_pagamento" }).select("id").single();
      if (errInsc) throw new Error(errInsc.message);
      return { pendenteConfirmacao: false, senha, inscricaoId: insc.id };
    },
    onSuccess: (res) => {
      if (res.senha) setSenhaGerada(res.senha);
      if (res.pendenteConfirmacao) { toast.success("Cadastro criado. Confirme seu e-mail para continuar."); return; }
      toast.success(esgotada ? "Você entrou na lista de espera!" : "Inscrição realizada com sucesso!");
      navigate({ to: "/inicio" });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao cadastrar"),
  });

  if (user) {
    return <div className="min-h-screen bg-background text-foreground"><div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10"><Card className="w-full"><CardContent className="flex flex-col items-center p-8 text-center"><CheckCircle2 className="h-12 w-12 text-gold" /><h1 className="mt-4 font-serif text-2xl font-semibold">Processando sua inscrição</h1><p className="mt-2 text-sm text-muted-foreground">Seus dados já estão cadastrados na Área do Aluno. Não é necessário preencher nada novamente.</p><p className="mt-2 text-sm text-muted-foreground">{turma?.nome ?? "Carregando turma…"}</p><Loader2 className="mt-5 h-5 w-5 animate-spin text-gold" /></CardContent></Card></div></div>;
  }

  if (carregandoTurma) return <div className="min-h-screen bg-background px-4 py-16 text-center text-muted-foreground">Carregando turma…</div>;

  return <div className="min-h-screen min-w-0 overflow-x-hidden bg-background text-foreground"><div className="mx-auto max-w-3xl px-3 py-7 sm:px-4 sm:py-10">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
    <div className="mt-5 flex flex-wrap items-center gap-2"><h1 className="font-serif text-2xl font-semibold sm:text-3xl">Inscreva-se</h1>{turma && <Badge variant="secondary">{turma.nome}</Badge>}{esgotada && <Badge variant="destructive">ESGOTADO — lista de espera</Badge>}</div>
    {turma?.livros && <p className="mt-1 text-sm text-muted-foreground">{turma.livros.titulo}</p>}
    <Card className="mt-5"><CardContent className="p-4 sm:p-5"><form className="space-y-5" onSubmit={(e) => { e.preventDefault(); enviar.mutate(); }}>
      <div className="grid gap-4 sm:grid-cols-2">{campos.map(({ key, label, type }) => <div key={key} className="min-w-0 space-y-1.5"><Label htmlFor={key}>{label}</Label><Input id={key} type={type ?? "text"} value={form[key] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} /></div>)}</div>
      <label className="flex items-start gap-3 text-sm text-foreground/80"><Checkbox checked={aceite} onCheckedChange={(v) => setAceite(v === true)} /><span>Li e aceito os termos de uso e a política de privacidade do Book Team.</span></label>
      <Button type="submit" disabled={enviar.isPending} className="w-full gap-2 bg-gold text-primary-foreground hover:bg-gold/90 sm:w-auto">{enviar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{esgotada ? "Entrar na lista de espera" : "Concluir inscrição"}</Button>
    </form>{senhaGerada && <div className="mt-5 rounded-md border border-gold/40 bg-gold/10 p-4 text-sm"><p className="font-semibold">Seu acesso foi criado</p><p className="text-foreground/80">Login: {form.email}<br />Senha provisória: <span className="font-mono">{senhaGerada}</span></p><p className="mt-1 text-xs text-muted-foreground">Altere a senha no seu perfil após o primeiro acesso.</p></div>}</CardContent></Card>
  </div></div>;
}
