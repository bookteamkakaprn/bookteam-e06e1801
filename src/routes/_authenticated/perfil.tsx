import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: PerfilPage,
});

type PerfilForm = { nome: string; telefone: string; cidade: string; estado: string; cpf: string; email: string };
const emptyForm: PerfilForm = { nome: "", telefone: "", cidade: "", estado: "", cpf: "", email: "" };

function PerfilPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PerfilForm>(emptyForm);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (authLoading) return;
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [userSnap, participantSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDoc(doc(db, "participants", user.uid)),
        ]);

        if (!active) return;
        const userData = userSnap.exists() ? userSnap.data() : {};
        const participantData = participantSnap.exists() ? participantSnap.data() : {};
        setForm({
          nome: participantData.nome ?? userData.nome ?? user.displayName ?? "",
          telefone: participantData.telefone ?? userData.telefone ?? "",
          cidade: participantData.cidade ?? userData.cidade ?? "",
          estado: participantData.estado ?? userData.estado ?? "",
          cpf: participantData.cpf ?? userData.cpf ?? "",
          email: user.email ?? userData.email ?? "",
        });
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        if (active) toast.error("Não foi possível carregar seus dados. Verifique as permissões do Firestore.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => { active = false; };
  }, [user, authLoading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Sua sessão não está disponível. Faça login novamente.");
      return;
    }
    try {
      setSaving(true);
      const now = new Date().toISOString();
      const estado = form.estado.toUpperCase();
      await Promise.all([
        setDoc(doc(db, "users", user.uid), { email: user.email ?? form.email, nome: form.nome, telefone: form.telefone, cidade: form.cidade, estado, cpf: form.cpf, updated_at: now }, { merge: true }),
        setDoc(doc(db, "participants", user.uid), { user_id: user.uid, email: user.email ?? form.email, nome: form.nome, telefone: form.telefone, cidade: form.cidade, estado, cpf: form.cpf, updated_at: now }, { merge: true }),
      ]);
      setForm((current) => ({ ...current, estado }));
      toast.success("Perfil atualizado com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast.error("Não foi possível salvar suas alterações. Verifique as permissões do Firestore.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="font-serif text-3xl font-bold">Meu perfil</h1><p className="text-muted-foreground">Atualize seus dados pessoais.</p></div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required /></div>
        <div className="space-y-2"><Label>Email</Label><Input value={form.email} disabled /></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} /></div><div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} /></div></div>
        <div className="grid grid-cols-[1fr_100px] gap-3"><div className="space-y-2"><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} /></div><div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase() }))} /></div></div>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>
      </form>
    </div>
  );
}
