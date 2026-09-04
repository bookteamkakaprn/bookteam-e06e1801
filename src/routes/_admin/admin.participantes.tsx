import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Search, ShieldCheck, UserRound, Loader2, UserPlus, FileSpreadsheet, Upload, Download, Mail } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_admin/admin/participantes")({
  head: () => ({ meta: [{ title: "Alunos — Admin — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: AdminParticipantes,
});

type Participante = { id: string; nome: string; email: string; telefone: string | null; cidade: string | null; estado: string | null; status: string; created_at: string };
type RoleRow = { user_id: string; role: "admin" | "participante" };
type Perfil = "aluno" | "adm" | "aluno_adm";
type Cadastro = { nome: string; email: string; cpf: string; telefone: string; cidade: string; estado: string; perfil: Perfil };
type ImportRow = Cadastro & { linha: number };

const vazio: Cadastro = { nome: "", email: "", cpf: "", telefone: "", cidade: "", estado: "", perfil: "aluno" };

function normalizar(v: unknown) {
  return String(v ?? "").trim();
}
function chave(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function valorCol(row: Record<string, unknown>, aliases: string[]) {
  const wanted = new Set(aliases.map(chave));
  const key = Object.keys(row).find((k) => wanted.has(chave(k)));
  return key ? normalizar(row[key]) : "";
}
function perfilExcel(v: string): Perfil {
  const x = chave(v);
  if (x.includes("alunoadm") || x.includes("adminaluno") || x === "ambos") return "aluno_adm";
  if (x === "adm" || x.includes("administrador")) return "adm";
  return "aluno";
}

function AdminParticipantes() {
  const [busca, setBusca] = useState("");
  const [alterando, setAlterando] = useState<string | null>(null);
  const [modal, setModal] = useState<"manual" | "excel" | null>(null);
  const [form, setForm] = useState<Cadastro>(vazio);
  const [importadas, setImportadas] = useState<ImportRow[]>([]);
  const [arquivo, setArquivo] = useState("");
  const [resultadoImportacao, setResultadoImportacao] = useState<{ ok: number; erros: string[] } | null>(null);
  const inputExcel = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const alunosQuery = useQuery({
    queryKey: ["admin-alunos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("participantes").select("id, nome, email, telefone, cidade, estado, status, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Participante[];
    },
  });
  const rolesQuery = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });
  const adminIds = useMemo(() => new Set((rolesQuery.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id)), [rolesQuery.data]);
  const alunos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (alunosQuery.data ?? []).filter((a) => !termo || a.nome.toLowerCase().includes(termo) || a.email.toLowerCase().includes(termo) || (a.telefone ?? "").toLowerCase().includes(termo));
  }, [alunosQuery.data, busca]);

  async function alterarAdm(aluno: Participante, tornarAdm: boolean) {
    setAlterando(aluno.id);
    const { error } = tornarAdm
      ? await supabase.from("user_roles").insert({ user_id: aluno.id, role: "admin" })
      : await supabase.from("user_roles").delete().eq("user_id", aluno.id).eq("role", "admin");
    if (error && !(tornarAdm && error.message.toLowerCase().includes("duplicate"))) {
      toast.error(error.message.toLowerCase().includes("admin") ? "Não é possível remover o último ADM ou o próprio acesso." : "Não foi possível alterar o acesso ADM.");
    } else {
      toast.success(tornarAdm ? `${aluno.nome} agora é ADM.` : `Acesso ADM removido de ${aluno.nome}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
    }
    setAlterando(null);
  }

  const criarContas = useMutation({
    mutationFn: async (rows: Cadastro[]) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Sua sessão expirou. Entre novamente como ADM.");
      const { data, error } = await supabase.functions.invoke("bookteam-create-users", { body: { users: rows } });
      if (error) throw error;
      return data as { results: { email: string; ok: boolean; error?: string }[] };
    },
    onSuccess: async (data) => {
      const erros = (data.results ?? []).filter((r) => !r.ok).map((r) => `${r.email}: ${r.error ?? "erro"}`);
      const ok = (data.results ?? []).filter((r) => r.ok).length;
      toast.success(`${ok} cadastro(s) criado(s). O convite foi enviado por e-mail.`);
      if (erros.length) toast.error(`${erros.length} cadastro(s) não foram criados. Veja os detalhes na tela.`);
      setResultadoImportacao({ ok, erros });
      await queryClient.invalidateQueries({ queryKey: ["admin-alunos"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível criar os cadastros."),
  });

  async function salvarManual() {
    if (!form.nome.trim() || !form.email.trim()) { toast.error("Nome e e-mail são obrigatórios."); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { toast.error("Informe um e-mail válido."); return; }
    await criarContas.mutateAsync([form]);
    if (!resultadoImportacao?.erros.length) { setForm(vazio); setModal(null); }
  }

  async function lerExcel(file: File) {
    setArquivo(file.name); setResultadoImportacao(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const rows: ImportRow[] = raw.map((r, i) => ({
        linha: i + 2,
        nome: valorCol(r, ["nome", "nome completo", "aluno", "aluna"]),
        email: valorCol(r, ["email", "e-mail", "e mail"]),
        cpf: valorCol(r, ["cpf"]),
        telefone: valorCol(r, ["telefone", "celular", "fone"]),
        cidade: valorCol(r, ["cidade"]),
        estado: valorCol(r, ["estado", "uf"]),
        perfil: perfilExcel(valorCol(r, ["perfil", "perfil de acesso", "tipo", "acesso"])),
      })).filter((r) => r.nome || r.email);
      const invalidos = rows.filter((r) => !r.nome || !r.email);
      if (invalidos.length) toast.error(`${invalidos.length} linha(s) sem nome ou e-mail foram ignoradas.`);
      setImportadas(rows.filter((r) => r.nome && r.email));
    } catch { toast.error("Não foi possível ler o arquivo Excel."); setImportadas([]); }
  }

  async function importarExcel() {
    if (!importadas.length) { toast.error("Escolha um Excel com pelo menos um aluno."); return; }
    await criarContas.mutateAsync(importadas.map(({ linha: _linha, ...r }) => r));
    if (!criarContas.isPending) setImportadas([]);
  }

  function baixarModelo() {
    const ws = XLSX.utils.json_to_sheet([{ Nome: "Maria da Silva", Email: "maria@email.com", CPF: "", Telefone: "", Cidade: "Curitiba", Estado: "PR", Perfil: "Aluno" }]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Alunos"); XLSX.writeFile(wb, "modelo-importacao-book-team.xlsx");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-serif text-3xl font-bold">Alunos</h1><p className="text-muted-foreground">Cadastros, perfis de acesso e gerenciamento dos alunos.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setForm(vazio); setModal("manual"); }} className="gap-2"><UserPlus className="h-4 w-4" /> Cadastrar aluno</Button>
          <Button variant="outline" onClick={() => { setImportadas([]); setArquivo(""); setResultadoImportacao(null); setModal("excel"); }} className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Importar Excel</Button>
          <Badge variant="secondary" className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {alunos.length} aluno(s)</Badge>
        </div>
      </div>

      <Card><CardContent className="p-4"><Label htmlFor="busca">Buscar aluno</Label><div className="relative mt-1.5 max-w-xl"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="busca" placeholder="Nome, e-mail ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" /></div></CardContent></Card>

      {alunosQuery.isLoading || rolesQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando alunos…</p> : alunosQuery.isError || rolesQuery.isError ? <p className="text-sm text-destructive">Não foi possível carregar os alunos e perfis.</p> : (
        <Card><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Aluno</th><th className="px-4 py-3">Contato</th><th className="px-4 py-3">Cadastro</th><th className="px-4 py-3">Perfil de acesso</th></tr></thead><tbody>
          {alunos.map((aluno) => { const isAdm = adminIds.has(aluno.id); const isChanging = alterando === aluno.id; return <tr key={aluno.id} className="border-b border-border/60 last:border-0"><td className="px-4 py-4"><div className="font-medium">{aluno.nome}</div><div className="text-xs text-muted-foreground">Status: {aluno.status}</div></td><td className="px-4 py-4 text-muted-foreground"><div>{aluno.email}</div><div className="text-xs">{aluno.telefone ?? ""}</div>{aluno.cidade && <div className="text-xs">{aluno.cidade}/{aluno.estado ?? ""}</div>}</td><td className="px-4 py-4 text-muted-foreground">{new Date(aluno.created_at).toLocaleDateString("pt-BR")}</td><td className="px-4 py-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" /> Aluno</Badge><div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"><ShieldCheck className="h-4 w-4 text-primary" /><span className="text-sm font-medium">ADM</span><Switch checked={isAdm} disabled={isChanging} onCheckedChange={(v) => alterarAdm(aluno, v)} />{isChanging && <Loader2 className="h-4 w-4 animate-spin" />}</div></div><p className="mt-1 text-xs text-muted-foreground">{isAdm ? "Também pode acessar a Área Administrativa." : "Sem acesso administrativo."}</p></td></tr>; })}
        </tbody></table>{alunos.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhum aluno encontrado.</p>}</CardContent></Card>
      )}

      <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground"><strong className="text-foreground">Cadastro em massa:</strong> use <strong className="text-foreground">Importar Excel</strong>. Cada pessoa recebe seu próprio convite por e-mail para criar o acesso. Você também pode escolher <strong className="text-foreground">Aluno</strong>, <strong className="text-foreground">ADM</strong> ou <strong className="text-foreground">Aluno + ADM</strong>.</div>

      <Dialog open={modal === "manual"} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="font-serif text-2xl">Cadastrar aluno</DialogTitle><DialogDescription>Crie a conta manualmente. O sistema envia o convite para o e-mail informado; o usuário define a própria senha.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2">
        {([ ["nome","Nome completo"],["email","E-mail"],["cpf","CPF"],["telefone","Telefone"],["cidade","Cidade"],["estado","Estado / UF"] ] as const).map(([key,label]) => <div key={key} className="space-y-1.5"><Label>{label}</Label><Input type={key === "email" ? "email" : "text"} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} /></div>)}
        <div className="space-y-1.5 sm:col-span-2"><Label>Perfil de acesso</Label><Select value={form.perfil} onValueChange={(v) => setForm((f) => ({ ...f, perfil: v as Perfil }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="aluno">Aluno</SelectItem><SelectItem value="adm">ADM</SelectItem><SelectItem value="aluno_adm">Aluno + ADM</SelectItem></SelectContent></Select></div>
      </div><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button><Button disabled={criarContas.isPending} onClick={salvarManual} className="gap-2">{criarContas.isPending && <Loader2 className="h-4 w-4 animate-spin" />}<Mail className="h-4 w-4" /> Criar e enviar convite</Button></div></DialogContent></Dialog>

      <Dialog open={modal === "excel"} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle className="font-serif text-2xl">Importar alunos por Excel</DialogTitle><DialogDescription>Envie um .xlsx. O cabeçalho deve conter pelo menos Nome e Email. Os demais campos são opcionais.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={baixarModelo} className="gap-2"><Download className="h-4 w-4" /> Baixar modelo Excel</Button><Button variant="outline" size="sm" onClick={() => inputExcel.current?.click()} className="gap-2"><Upload className="h-4 w-4" /> Escolher Excel</Button><input ref={inputExcel} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && lerExcel(e.target.files[0])} /></div>
        {arquivo && <p className="text-sm text-muted-foreground">Arquivo: <strong className="text-foreground">{arquivo}</strong></p>}
        {importadas.length > 0 && <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[700px] text-xs"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-2">Linha</th><th className="p-2">Nome</th><th className="p-2">E-mail</th><th className="p-2">Telefone</th><th className="p-2">Cidade/UF</th><th className="p-2">Perfil</th></tr></thead><tbody>{importadas.slice(0, 50).map((r) => <tr key={r.linha} className="border-b last:border-0"><td className="p-2">{r.linha}</td><td className="p-2">{r.nome}</td><td className="p-2">{r.email}</td><td className="p-2">{r.telefone || "—"}</td><td className="p-2">{[r.cidade,r.estado].filter(Boolean).join("/") || "—"}</td><td className="p-2">{r.perfil === "aluno_adm" ? "Aluno + ADM" : r.perfil === "adm" ? "ADM" : "Aluno"}</td></tr>)}</tbody></table>{importadas.length > 50 && <p className="p-2 text-xs text-muted-foreground">Mostrando as primeiras 50 linhas. Todas as {importadas.length} linhas serão importadas.</p>}</div>}
        {resultadoImportacao && <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm"><strong>{resultadoImportacao.ok} cadastro(s) criado(s).</strong>{resultadoImportacao.erros.length > 0 && <ul className="mt-2 list-disc pl-5 text-destructive">{resultadoImportacao.erros.map((e) => <li key={e}>{e}</li>)}</ul>}</div>}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Colunas aceitas: <strong>Nome, Email, CPF, Telefone, Cidade, Estado/UF, Perfil</strong>. No Perfil, use Aluno, ADM ou Aluno + ADM.</div>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>Fechar</Button><Button disabled={!importadas.length || criarContas.isPending} onClick={importarExcel} className="gap-2">{criarContas.isPending && <Loader2 className="h-4 w-4 animate-spin" />}<FileSpreadsheet className="h-4 w-4" /> Importar {importadas.length ? `${importadas.length} aluno(s)` : "alunos"}</Button></div>
      </DialogContent></Dialog>
    </div>
  );
}
