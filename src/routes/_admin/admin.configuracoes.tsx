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

interface ConfigGeral {
  id: string;
  instagram: string;
  whatsapp: string;
  email: string;
  endereco: string;
  telefone: string;
}

function ConfiguracoesAdmin() {
  const [configGeral, setConfigGeral] = useState<ConfigGeral>({
    id: "1",
    instagram: "",
    whatsapp: "",
    email: "",
    endereco: "",
    telefone: "",
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
        <p className="text-muted-foreground">Gerencie dados do site</p>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="config">Configurações Gerais</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
