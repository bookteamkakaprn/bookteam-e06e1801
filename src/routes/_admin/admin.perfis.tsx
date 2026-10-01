import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Save, ShieldCheck, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/perfis")({
  component: AdminPerfisPage,
});

type Perfil = {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: string[];
  ativo: boolean;
  sistema: boolean;
};

type UsuarioPerfil = {
  user_id: string;
  perfil_id: string;
};

const ABAS = [
  ["visao_geral", "Visão geral"],
  ["participantes", "Alunos"],
  ["inscricoes", "Aprovar inscrições / pagamentos"],
  ["cursos", "Cursos"],
  ["turmas", "Turmas"],
  ["materiais", "Materiais dos cursos"],
  ["pedido_materiais", "Pedido de materiais"],
  ["presencas", "Lista de presença"],
  ["eventos", "Eventos"],
  ["calendario", "Calendário"],
  ["pagamentos", "Controle de pagamentos"],
  ["configuracoes", "Configurações"],
  ["fale_com_adm", "Fale com ADM"],
  ["tutorial", "Tutorial"],
] as const;

function AdminPerfisPage() {
  const qc = useQueryClient();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState("");
  const [perfilParaUsuario, setPerfilParaUsuario] = useState("");

  const perfisQ = useQuery({
    queryKey: ["admin-perfis-acesso"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_perfis")
        .select("id,nome,descricao,permissoes,ativo,sistema")
        .order("sistema", { ascending: false })
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Perfil[];
    },
  });

  const alunosQ = useQuery({
    queryKey: ["admin-perfis-alunos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participantes")
        .select("id,nome,email,status")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const atribuicoesQ = useQuery({
    queryKey: ["admin-usuario-perfis"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_usuario_perfis")
        .select("user_id,perfil_id");
      if (error) throw error;
      return (data ?? []) as UsuarioPerfil[];
    },
  });

  const atribuicaoPorUsuario = useMemo(
    () => new Map((atribuicoesQ.data ?? []).map((a) => [a.user_id, a.perfil_id])),
    [atribuicoesQ.data],
  );

  const abrirPerfil = (p: Perfil) => {
    setSelecionado(p.id);
    setNovo(false);
    setNome(p.nome);
    setDescricao(p.descricao ?? "");
    setPermissoes(p.permissoes ?? []);
  };

  const novoPerfil = () => {
    setSelecionado(null);
    setNovo(true);
    setNome("");
    setDescricao("");
    setPermissoes([]);
  };

  const salvar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome do perfil.");

      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        permissoes,
        ativo: true,
      };

      if (selecionado) {
        const { error } = await (supabase as any)
          .from("admin_perfis")
          .update(payload)
          .eq("id", selecionado);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("admin_perfis")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Perfil salvo.");
      qc.invalidateQueries({ queryKey: ["admin-perfis-acesso"] });
      setNovo(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar perfil."),
  });

  const atribuir = useMutation({
    mutationFn: async () => {
      if (!usuarioSelecionado || !perfilParaUsuario) {
        throw new Error("Selecione o aluno/usuário e o perfil.");
      }
      const { error } = await (supabase as any)
        .from("admin_usuario_perfis")
        .upsert(
          { user_id: usuarioSelecionado, perfil_id: perfilParaUsuario },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atribuído.");
      qc.invalidateQueries({ queryKey: ["admin-usuario-perfis"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao atribuir perfil."),
  });

  const removerAtribuicao = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any)
        .from("admin_usuario_perfis")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil removido.");
      qc.invalidateQueries({ queryKey: ["admin-usuario-perfis"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao remover perfil."),
  });

  const excluir = useMutation({
    mutationFn: async (p: Perfil) => {
      if (p.sistema) throw new Error("Perfis do sistema não podem ser excluídos.");
      const { error } = await (supabase as any)
        .from("admin_perfis")
        .delete()
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil excluído.");
      setSelecionado(null);
      setNovo(false);
      qc.invalidateQueries({ queryKey: ["admin-perfis-acesso"] });
      qc.invalidateQueries({ queryKey: ["admin-usuario-perfis"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao excluir perfil."),
  });

  const alternarPermissao = (key: string, checked: boolean) => {
    setPermissoes((atual) =>
      checked ? [...new Set([...atual, key])] : atual.filter((item) => item !== key),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Perfis de acesso</h1>
          <p className="text-sm text-muted-foreground">
            Crie perfis e escolha exatamente quais abas do painel administrativo cada perfil pode acessar.
          </p>
        </div>
        <Button onClick={novoPerfil} className="gap-2">
          <Plus className="h-4 w-4" /> Novo perfil
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Perfis</CardTitle>
            <CardDescription>Administradores têm acesso completo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(perfisQ.data ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => abrirPerfil(p)}
                className={`flex min-h-12 w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${selecionado === p.id ? "border-primary bg-primary/10" : "hover:bg-secondary"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.sistema ? "Sistema" : "Personalizado"} · {p.permissoes.length} aba(s)
                  </span>
                </span>
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{novo ? "Novo perfil" : "Configurar perfil"}</CardTitle>
            <CardDescription>
              Marque as abas que este perfil poderá visualizar no painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!novo && !selecionado ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Selecione um perfil à esquerda ou clique em “Novo perfil”.
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome do perfil</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Secretária" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que essa pessoa faz?" rows={2} />
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Abas do painel administrativo</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ABAS.map(([key, label]) => (
                      <label key={key} className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2">
                        <Checkbox
                          checked={permissoes.includes(key)}
                          onCheckedChange={(checked) => alternarPermissao(key, checked === true)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="gap-2">
                    <Save className="h-4 w-4" /> Salvar perfil
                  </Button>
                  {selecionado && (perfisQ.data ?? []).find((p) => p.id === selecionado)?.sistema === false && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const p = (perfisQ.data ?? []).find((item) => item.id === selecionado);
                        if (p && window.confirm(`Excluir o perfil "${p.nome}"?`)) excluir.mutate(p);
                      }}
                      disabled={excluir.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Atribuir perfil a usuário</CardTitle>
          <CardDescription>
            Um usuário pode ter um perfil administrativo por vez. O ADM continua com acesso total independentemente do perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Aluno / usuário</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={usuarioSelecionado}
                onChange={(e) => {
                  const id = e.target.value;
                  setUsuarioSelecionado(id);
                  setPerfilParaUsuario(atribuicaoPorUsuario.get(id) ?? "");
                }}
              >
                <option value="">Selecione...</option>
                {(alunosQ.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.nome} — {a.email}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={perfilParaUsuario}
                onChange={(e) => setPerfilParaUsuario(e.target.value)}
              >
                <option value="">Selecione...</option>
                {(perfisQ.data ?? []).filter((p) => p.ativo).map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={() => atribuir.mutate()} disabled={atribuir.isPending}>Atribuir perfil</Button>
              {usuarioSelecionado && atribuicaoPorUsuario.has(usuarioSelecionado) && (
                <Button
                  variant="outline"
                  onClick={() => removerAtribuicao.mutate(usuarioSelecionado)}
                  disabled={removerAtribuicao.isPending}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {(alunosQ.data ?? []).filter((a) => atribuicaoPorUsuario.has(a.id)).map((a) => {
              const pid = atribuicaoPorUsuario.get(a.id);
              const perfil = (perfisQ.data ?? []).find((p) => p.id === pid);
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div>
                    <div className="font-medium">{a.nome}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </div>
                  <Badge variant="secondary">{perfil?.nome ?? "Perfil não encontrado"}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
