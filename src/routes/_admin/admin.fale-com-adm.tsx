import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_admin/admin/fale-com-adm")({
  component: FaleComADM,
});

type Mensagem = {
  id: string;
  participante_id: string;
  assunto: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
  participante: { nome: string; email: string } | null;
};

function FaleComADM() {
  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ["admin-fale-com-adm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contato_admin")
        .select(
          `id, participante_id, assunto, mensagem, lida, created_at,
           participante:participantes(nome, email)`
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Mensagem[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Fale com ADM</h1>
        <p className="text-muted-foreground">Mensagens dos alunos</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}

      {!isLoading && mensagens.length === 0 && (
        <p className="text-muted-foreground">Nenhuma mensagem.</p>
      )}

      <div className="space-y-3">
        {mensagens.map((msg) => (
          <Card key={msg.id} className={msg.lida ? "" : "border-gold/50 bg-gold/5"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{msg.assunto}</CardTitle>
                  <CardDescription>
                    {msg.participante?.nome} • {msg.participante?.email}
                  </CardDescription>
                </div>
                {!msg.lida && (
                  <Badge variant="default" className="bg-gold text-primary-foreground">
                    Não lida
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-sm">{msg.mensagem}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(msg.created_at).toLocaleDateString("pt-BR")}{" "}
                {new Date(msg.created_at).toLocaleTimeString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
