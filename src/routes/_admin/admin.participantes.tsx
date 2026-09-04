import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Users, Search, ShieldCheck, UserRound, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/participantes")({
  head: () => ({
    meta: [
      { title: "Alunos — Admin — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminParticipantes,
});

type Participante = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  status: string;
  created_at: string;
};

type RoleRow = { user_id: string; role: "admin" | "participante" };

function AdminParticipantes() {
  const [busca, setBusca] = useState("");
  const [alterando, setAlterando] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const alunosQuery = useQuery({
    queryKey: ["admin-alunos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participantes")
        .select("id, nome, email, telefone, cidade, estado, status, created_at")
        .order("created_at", { ascending: false });
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

  const adminIds = useMemo(
    () => new Set((rolesQuery.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id)),
    [rolesQuery.data],
  );

  const alunos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (alunosQuery.data ?? []).filter((aluno) => {
      if (!termo) return true;
      return (
        aluno.nome.toLowerCase().includes(termo) ||
        aluno.email.toLowerCase().includes(termo) ||
        (aluno.telefone ?? "").toLowerCase().includes(termo)
      );
    });
  }, [alunosQuery.data, busca]);

  async function alterarAdm(aluno: Participante, tornarAdm: boolean) {
    setAlterando(aluno.id);

    if (tornarAdm) {
      const { error } = await supabase.from("user_roles").insert({
        user_id: aluno.id,
        role: "admin",
      });
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        toast.error(`Não foi possível aprovar ${aluno.nome} como ADM.`);
        setAlterando(null);
        return;
      }
      toast.success(`${aluno.nome} agora é ADM.`);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", aluno.id)
        .eq("role", "admin");
      if (error) {
        toast.error(error.message.includes("admin") ? "Não é possível remover o último ADM ou o próprio acesso." : "Não foi possível remover o acesso ADM.");
        setAlterando(null);
        return;
      }
      toast.success(`Acesso ADM removido de ${aluno.nome}.`);
    }

    await queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-alunos"] });
    setAlterando(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Alunos</h1>
          <p className="text-muted-foreground">Cadastros, perfil de acesso e aprovação de administradores.</p>
        </div>
        <Badge variant="secondary" className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> {alunos.length} aluno(s)
        </Badge>
      </div>

      <Card>
        <CardContent className="p-4">
          <Label htmlFor="busca">Buscar aluno</Label>
          <div className="relative mt-1.5 max-w-xl">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="busca"
              placeholder="Nome, e-mail ou telefone"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {alunosQuery.isLoading || rolesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando alunos…</p>
      ) : alunosQuery.isError || rolesQuery.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar os alunos e perfis.</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3">Perfil de acesso</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => {
                  const isAdm = adminIds.has(aluno.id);
                  const isChanging = alterando === aluno.id;
                  return (
                    <tr key={aluno.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-4">
                        <div className="font-medium">{aluno.nome}</div>
                        <div className="text-xs text-muted-foreground">Status: {aluno.status}</div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <div>{aluno.email}</div>
                        <div className="text-xs">{aluno.telefone ?? ""}</div>
                        {aluno.cidade && <div className="text-xs">{aluno.cidade}/{aluno.estado ?? ""}</div>}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {new Date(aluno.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="inline-flex items-center gap-1">
                            <UserRound className="h-3 w-3" /> Aluno
                          </Badge>
                          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">ADM</span>
                            <Switch
                              checked={isAdm}
                              disabled={isChanging}
                              onCheckedChange={(checked) => alterarAdm(aluno, checked)}
                              aria-label={`Alterar perfil ADM de ${aluno.nome}`}
                            />
                            {isChanging && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isAdm ? "Este aluno também pode acessar a área administrativa." : "Aluno sem acesso administrativo."}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {alunos.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhum aluno encontrado.</p>}
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Como funciona:</strong> todo novo cadastro entra como <strong className="text-foreground">Aluno</strong>. O ADM pode ativar o botão <strong className="text-foreground">ADM</strong> no perfil da pessoa. A partir daí, ela passa a enxergar e acessar a Área Administrativa.
      </div>
    </div>
  );
}
