import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Edit2, Save, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

interface Depoimento {
  id: string;
  nome: string;
  cargo: string;
  depoimento: string;
  imagem_url: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

interface FAQ {
  id: string;
  pergunta: string;
  resposta: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
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
  const qc = useQueryClient();
  const salvarConfig = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("config_geral")
        .upsert({ ...configGeral, id: "1" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: ["admin-config"] });
    },
    onError: (err) => toast.error(\`Erro: \${err.message}\`),
  });

  if (configQuery.isLoading) return <p>Carregando…</p>;
  if (configQuery.data && !configQuery.isLoading) {
    setConfigGeral(configQuery.data);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie depoimentos, FAQ e dados do site</p>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configurações Gerais</TabsTrigger>
          <TabsTrigger value="depoimentos">Depoimentos</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        {/* ===== CONFIG GERAL ===== */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Rodapé e Contato</CardTitle>
              <CardDescription>Informações que aparecem no rodapé da página</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input
                    placeholder="@booktea"
                    value={configGeral.instagram}
                    onChange={(e) => setConfigGeral({ ...configGeral, instagram: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    placeholder="(41) 99999-9999"
                    value={configGeral.whatsapp}
                    onChange={(e) => setConfigGeral({ ...configGeral, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  placeholder="contato@bookteam.com.br"
                  value={configGeral.email}
                  onChange={(e) => setConfigGeral({ ...configGeral, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(41) 3333-3333"
                  value={configGeral.telefone}
                  onChange={(e) => setConfigGeral({ ...configGeral, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <Textarea
                  placeholder="Rua exemplo, 123 - Curitiba, PR"
                  value={configGeral.endereco}
                  onChange={(e) => setConfigGeral({ ...configGeral, endereco: e.target.value })}
                  rows={3}
                />
              </div>

              <Button
                onClick={() => salvarConfig.mutate()}
                disabled={salvarConfig.isPending}
                className="w-full bg-gold text-primary-foreground"
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DEPOIMENTOS ===== */}
        <TabsContent value="depoimentos" className="space-y-4">
          <DepoimentosTab />
        </TabsContent>

        {/* ===== FAQ ===== */}
        <TabsContent value="faq" className="space-y-4">
          <FaqTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== DEPOIMENTOS TAB =====
function DepoimentosTab() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", cargo: "", depoimento: "", imagem_url: "" });

  const { data: depoimentos = [] } = useQuery({
    queryKey: ["admin-depoimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depoimentos")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Depoimento[];
    },
  });

  const salvarDepoimento = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase
          .from("depoimentos")
          .update(form)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("depoimentos").insert([{ ...form, ativo: true, ordem: depoimentos.length }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Depoimento atualizado!" : "Depoimento criado!");
      setForm({ nome: "", cargo: "", depoimento: "", imagem_url: "" });
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["admin-depoimentos"] });
    },
    onError: (err) => toast.error(\`Erro: \${err.message}\`),
  });

  const deletarDepoimento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("depoimentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Depoimento deletado!");
      qc.invalidateQueries({ queryKey: ["admin-depoimentos"] });
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async (d: Depoimento) => {
      const { error } = await supabase
        .from("depoimentos")
        .update({ ativo: !d.ativo })
        .eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-depoimentos"] });
    },
  });

  return (
    <div className="space-y-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button className="bg-gold text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Novo Depoimento
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Novo"} Depoimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Nome da pessoa"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input
                placeholder="Cargo/Profissão"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              />
            </div>
            <div>
              <Label>Depoimento</Label>
              <Textarea
                placeholder="O que você achou do Book Team?"
                value={form.depoimento}
                onChange={(e) => setForm({ ...form, depoimento: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label>URL da Imagem</Label>
              <Input
                placeholder="https://..."
                value={form.imagem_url}
                onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
              />
            </div>
            <Button
              onClick={() => salvarDepoimento.mutate()}
              disabled={salvarDepoimento.isPending || !form.nome || !form.depoimento}
              className="w-full bg-gold"
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {depoimentos.map((d) => (
          <Card key={d.id} className={!d.ativo ? "opacity-50" : ""}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex-1">
                <p className="font-bold">{d.nome}</p>
                <p className="text-sm text-muted-foreground">{d.cargo}</p>
                <p className="mt-2 text-sm">{d.depoimento}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleAtivo.mutate(d)}
                >
                  {d.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(d.id);
                    setForm({ nome: d.nome, cargo: d.cargo, depoimento: d.depoimento, imagem_url: d.imagem_url || "" });
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deletarDepoimento.mutate(d.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ===== FAQ TAB =====
function FaqTab() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ pergunta: "", resposta: "" });

  const { data: faqs = [] } = useQuery({
    queryKey: ["admin-faq"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FAQ[];
    },
  });

  const salvarFaq = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase
          .from("faq")
          .update(form)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faq").insert([{ ...form, ativo: true, ordem: faqs.length }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "FAQ atualizado!" : "FAQ criado!");
      setForm({ pergunta: "", resposta: "" });
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["admin-faq"] });
    },
    onError: (err) => toast.error(\`Erro: \${err.message}\`),
  });

  const deletarFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("FAQ deletado!");
      qc.invalidateQueries({ queryKey: ["admin-faq"] });
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async (f: FAQ) => {
      const { error } = await supabase
        .from("faq")
        .update({ ativo: !f.ativo })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-faq"] });
    },
  });

  return (
    <div className="space-y-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button className="bg-gold text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Novo FAQ
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Novo"} FAQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Pergunta</Label>
              <Input
                placeholder="Como funciona o Book Club?"
                value={form.pergunta}
                onChange={(e) => setForm({ ...form, pergunta: e.target.value })}
              />
            </div>
            <div>
              <Label>Resposta</Label>
              <Textarea
                placeholder="Resposta da pergunta..."
                value={form.resposta}
                onChange={(e) => setForm({ ...form, resposta: e.target.value })}
                rows={4}
              />
            </div>
            <Button
              onClick={() => salvarFaq.mutate()}
              disabled={salvarFaq.isPending || !form.pergunta || !form.resposta}
              className="w-full bg-gold"
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {faqs.map((f) => (
          <Card key={f.id} className={!f.ativo ? "opacity-50" : ""}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-bold">{f.pergunta}</p>
                  <p className="mt-2 text-sm">{f.resposta}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleAtivo.mutate(f)}
                  >
                    {f.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(f.id);
                      setForm({ pergunta: f.pergunta, resposta: f.resposta });
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletarFaq.mutate(f.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
