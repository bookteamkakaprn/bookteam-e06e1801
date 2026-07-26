import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Config = Tables<"configuracoes_pagamento">;

export const Route = createFileRoute("/_admin/admin/conta")({
  head: () => ({ meta: [{ title: "Conta PIX — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminContaPage,
});

function AdminContaPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Config>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["config-pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_pagamento")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Config | null;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        beneficiario: form.beneficiario || null,
        banco: form.banco || null,
        tipo_chave: form.tipo_chave || null,
        pix_chave: form.pix_chave || null,
        pix_copia_cola: form.pix_copia_cola || null,
        pix_qrcode_url: form.pix_qrcode_url || null,
        instrucoes: form.instrucoes || null,
      };
      if (data?.id) {
        const { error } = await supabase.from("configuracoes_pagamento").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("configuracoes_pagamento").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Dados da conta salvos");
      qc.invalidateQueries({ queryKey: ["config-pagamento"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const campo = (key: keyof Config, label: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(key)}>{label}</Label>
      <Input
        id={String(key)}
        placeholder={placeholder}
        value={(form[key] as string | null) ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Conta para pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          Estes dados aparecem para o aluno na tela de pagamento da matrícula.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados do PIX</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {campo("beneficiario", "Nome do beneficiário")}
            {campo("banco", "Banco")}
            {campo("tipo_chave", "Tipo da chave", "CPF/CNPJ, e-mail, telefone, aleatória")}
            {campo("pix_chave", "Chave PIX")}
            {campo("pix_qrcode_url", "URL da imagem do QR Code")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pix_copia_cola">PIX copia e cola</Label>
            <Textarea
              id="pix_copia_cola"
              rows={3}
              value={form.pix_copia_cola ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, pix_copia_cola: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instrucoes">Instruções para o aluno</Label>
            <Textarea
              id="instrucoes"
              rows={3}
              value={form.instrucoes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, instrucoes: e.target.value }))}
            />
          </div>
          <Button className="gap-2" disabled={salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar dados
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}