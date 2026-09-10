import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2, Plus, Edit2, Save } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_admin/admin/configuracoes")({
  component: ConfiguracoesAdmin,
});

interface Depoimento {
  id?: string;
  pergunta: string;
  resposta: string;
  autor: string;
  cidade: string;
  nota: number;
}

interface ConfigGeral {
  id: string;
  instagram: string;
  whatsapp: string;
  email: string;
  endereco: string;
  telefone: string;
}

function ConfiguracoesAdmin() {
  const [editingDepoimento, setEditingDepoimento] = useState<Depoimento | null>(null);
  const [novoDepoimento, setNovoDepoimento] = useState<Depoimento>({ pergunta: "", resposta: "", autor: "", cidade: "", nota: 5 });
  const [configGeral, setConfigGeral] = useState<ConfigGeral>({
    id: "1",
    instagram: "",
    whatsapp: "",
    email: "",
    endereco: "",
    telefone: "",
  });

  // Query Depoimentos
  const depoimentosQuery = useQuery({
    queryKey: ["admin-depoimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depoimentos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Depoimento[];
    },
  });

  // Query Config Geral
  const configQuery = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_geral")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as ConfigGeral | null;
    },
  });

  // Mutation Depoimento
  const salvarDepoimento = useMutation({
    mutationFn: async (depo: Depoimento) => {
      if (depo.id) {
        // Atualizar
        const { error } = await supabase
          .from("depoimentos")
          .update(depo)
          .eq("id", depo.id);
        if (error) throw error;
      } else {
        // Criar
        const { error } = await supabase.from("depoimentos").insert([depo]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Depoimento salvo!");
      depoimentosQuery.refetch();
      setEditingDepoimento(null);
      setNovoDepoimento({ pergunta: "", resposta: "", autor: "", cidade: "", nota: 5 });
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  // Mutation Delete Depoimento
  const deletarDepoimento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("depoimentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Depoimento removido!");
      depoimentosQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao deletar: ${err.message}`);
    },
  });

  // Mutation Config
  const salvarConfig = useMutation({
    mutationFn: async (config: ConfigGeral) => {
      if (!config.id) {
        const { error } = await supabase.from("config_geral").insert([config]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("config_geral").update(config).eq("id", config.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      configQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie depoimentos e dados do site</p>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config">Configurações Gerais</TabsTrigger>
          <TabsTrigger value="depoimentos">Depoimentos</TabsTrigger>
        </TabsList>

        {/* ===== CONFIG GERAL ===== */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Rodapé e Contato</CardTitle>
              <CardDescription>
                Informações que aparecem no rodapé da página
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Instagram</label>
                  <Input
                    placeholder="@bookteam"
                    value={configGeral.instagram}
                    onChange={(e) =>
                      setConfigGeral({ ...configGeral, instagram: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">WhatsApp</label>
                  <Input
                    placeholder="(41) 99999-9999"
                    value={configGeral.whatsapp}
                    onChange={(e) =>
                      setConfigGeral({ ...configGeral, whatsapp: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    placeholder="contato@bookteam.com.br"
                    value={configGeral.email}
                    onChange={(e) =>
                      setConfigGeral({ ...configGeral, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    placeholder="(41) 3333-3333"
                    value={configGeral.telefone}
                    onChange={(e) =>
                      setConfigGeral({ ...configGeral, telefone: e.target.value })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Endereço</label>
                  <Textarea
                    placeholder="Rua exemplo, 123 - Curitiba, PR"
                    value={configGeral.endereco}
                    onChange={(e) =>
                      setConfigGeral({ ...configGeral, endereco: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>

              <Button
                onClick={() => salvarConfig.mutate(configGeral)}
                disabled={salvarConfig.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DEPOIMENTOS ===== */}
        <TabsContent value="depoimentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Novo Depoimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Pergunta/Título</label>
                  <Input
                    placeholder="Ex: Como foi sua experiência?"
                    value={novoDepoimento.pergunta}
                    onChange={(e) =>
                      setNovoDepoimento({ ...novoDepoimento, pergunta: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Autor</label>
                  <Input
                    placeholder="Nome do autor"
                    value={novoDepoimento.autor}
                    onChange={(e) =>
                      setNovoDepoimento({ ...novoDepoimento, autor: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Cidade</label>
                  <Input
                    placeholder="Curitiba - PR"
                    value={novoDepoimento.cidade}
                    onChange={(e) =>
                      setNovoDepoimento({ ...novoDepoimento, cidade: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Nota (1-5)</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={novoDepoimento.nota}
                    onChange={(e) =>
                      setNovoDepoimento({
                        ...novoDepoimento,
                        nota: parseInt(e.target.value),
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} estrelas
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Depoimento</label>
                  <Textarea
                    placeholder="Escreva o depoimento aqui..."
                    value={novoDepoimento.resposta}
                    onChange={(e) =>
                      setNovoDepoimento({ ...novoDepoimento, resposta: e.target.value })
                    }
                    rows={4}
                  />
                </div>
              </div>

              <Button
                onClick={() => salvarDepoimento.mutate(novoDepoimento)}
                disabled={salvarDepoimento.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Depoimento
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {depoimentosQuery.data?.map((depo) => (
              <Card key={depo.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold">{depo.pergunta}</h3>
                    <p className="text-sm text-foreground/80">{depo.resposta}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>👤 {depo.autor}</span>
                      <span>📍 {depo.cidade}</span>
                      <span>⭐ {depo.nota}/5</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingDepoimento(depo)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => depo.id && deletarDepoimento.mutate(depo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
