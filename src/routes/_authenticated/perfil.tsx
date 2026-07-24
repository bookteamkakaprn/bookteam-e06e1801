import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Book Clube" }, { name: "robots", content: "noindex" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "", telefone: "", cidade: "", estado: "", cpf: "", email: "",
  });

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("participantes")
        .select("nome, telefone, cidade, estado, cpf, email")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (data) setForm({
        nome: data.nome ?? "",
        telefone: data.telefone ?? "",
        cidade: data.cidade ?? "",
        estado: data.estado ?? "",
        cpf: data.cpf ?? "",
        email: data.email ?? "",
      });
      setLoading(false);
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase
      .from("participantes")
      .update({
        nome: form.nome,
        telefone: form.telefone,
        cidade: form.cidade,
        estado: form.estado.toUpperCase(),
        cpf: form.cpf,
      })
      .eq("id", userData.user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil atualizado.");
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Meu perfil</h1>
        <p className="text-muted-foreground">Atualize seus dados pessoais.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={form.email} disabled />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input value={form.cpf} onChange={(e) => setForm(f => ({ ...f, cpf: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm(f => ({ ...f, telefone: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.cidade} onChange={(e) => setForm(f => ({ ...f, cidade: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>UF</Label>
            <Input maxLength={2} value={form.estado} onChange={(e) => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} />
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </form>
    </div>
  );
}
