import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Search } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/participantes")({
  head: () => ({
    meta: [
      { title: "Cadastro de inscritos — Admin — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminParticipantes,
});

/** Linha de inscrição enriquecida com participante, evento, livro e trilha. */
interface InscritoRow {
  id: string;
  status: string;
  created_at: string;
  participante: {
    nome: string | null;
    email: string | null;
    telefone: string | null;
    cidade: string | null;
    estado: string | null;
  } | null;
  evento: {
    id: string;
    titulo: string;
    data: string;
    livro: { titulo: string; trilha: { id: string; nome: string } | null } | null;
  } | null;
}

const SELECT =
  "id, status, created_at, participante:participantes(nome, email, telefone, cidade, estado), evento:eventos(id, titulo, data, livro:livros(titulo, trilha:trilhas(id, nome)))";

function AdminParticipantes() {
  const [busca, setBusca] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [trilhaId, setTrilhaId] = useState<string>("todas");

  const trilhasQuery = useQuery({
    queryKey: ["admin-trilhas-filtro"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trilhas").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const inscritosQuery = useQuery({
    queryKey: ["admin-inscritos", de, ate],
    queryFn: async () => {
      const q = supabase
        .from("inscricoes")
        .select(SELECT as string)
        .order("created_at", { ascending: false });
      if (de) q.gte("created_at", `${de}T00:00:00`);
      if (ate) q.lte("created_at", `${ate}T23:59:59`);
      const { data, error } = await q.returns<InscritoRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (inscritosQuery.data ?? []).filter((r) => {
      if (trilhaId !== "todas" && r.evento?.livro?.trilha?.id !== trilhaId) return false;
      if (!termo) return true;
      return (
        (r.participante?.nome ?? "").toLowerCase().includes(termo) ||
        (r.participante?.email ?? "").toLowerCase().includes(termo) ||
        (r.evento?.titulo ?? "").toLowerCase().includes(termo)
      );
    });
  }, [inscritosQuery.data, busca, trilhaId]);

  function limpar() {
    setBusca("");
    setDe("");
    setAte("");
    setTrilhaId("todas");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-3xl font-bold">Cadastro de inscritos</h1>
        <Badge variant="secondary" className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> {linhas.length} inscrito(s)
        </Badge>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="busca">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="busca"
                placeholder="Nome, email ou encontro"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="de">De</Label>
            <Input id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ate">Até</Label>
            <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trilha">Trilha</Label>
            <select
              id="trilha"
              value={trilhaId}
              onChange={(e) => setTrilhaId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="todas">Todas as trilhas</option>
              {(trilhasQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" onClick={limpar}>
            Limpar
          </Button>
        </CardContent>
      </Card>

      {inscritosQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {inscritosQuery.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os inscritos.</p>
      )}
      {!inscritosQuery.isLoading && linhas.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum inscrito para os filtros selecionados.</p>
      )}

      {linhas.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Encontro</th>
                  <th className="px-4 py-3">Trilha / Livro</th>
                  <th className="px-4 py-3">Inscrição</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{r.participante?.nome ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{r.participante?.email ?? "—"}</div>
                      <div className="text-xs">
                        {r.participante?.telefone ?? ""}
                        {r.participante?.cidade ? ` · ${r.participante.cidade}/${r.participante.estado ?? ""}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{r.evento?.titulo ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.evento?.data ? new Date(`${r.evento.data}T12:00:00`).toLocaleDateString("pt-BR") : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{r.evento?.livro?.trilha?.nome ?? "—"}</div>
                      <div className="text-xs">{r.evento?.livro?.titulo ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={r.status === "confirmada" ? "default" : "secondary"}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
