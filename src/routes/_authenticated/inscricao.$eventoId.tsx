import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inscricao/$eventoId")({
  head: () => ({ meta: [{ title: "Inscrição em Encontro — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: InscricaoEventoPage,
});

type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  data: string;
  hora: string | null;
  local: string | null;
  cidade: string | null;
  valor: number;
  vagas: number;
  status: string;
  livro_id: string | null;
};

const getBadgeCategoria = (categoria: string | null) => {
  const cores: Record<string, string> = {
    "Mulheres": "bg-pink-500",
    "Homens": "bg-blue-500",
    "Mulheres solteiras": "bg-rose-500",
    "Misto": "bg-purple-500",
    "Família": "bg-green-500",
    "Ministério (Staff)": "bg-orange-500",
  };
  return cores[categoria || ""] || "bg-gray-500";
};

function InscricaoEventoPage() {
  const { eventoId } = Route.useParams();
  const { user } = useAuth();
  const [confirmando, setConfirmando] = useState(false);

  const { data: evento, isLoading } = useQuery({
    enabled: !!eventoId && !!user,
    queryKey: ["evento-inscricao", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("id, titulo, descricao, categoria, data, hora, local, cidade, valor, vagas, status, livro_id")
        .eq("id", eventoId)
        .single();

      if (error) throw error;
      return data as unknown as Evento;
    },
  });

  const inscrever = useMutation({
    mutationFn: async () => {
      if (!evento || !user) throw new Error("Dados incompletos");

      // Verificar se já está inscrito
      const { data: existente } = await supabase
        .from("inscricoes")
        .select("id")
        .eq("participante_id", user.id)
        .eq("evento_id", evento.id)
        .maybeSingle();

      if (existente) {
        throw new Error("Você já está inscrito neste encontro!");
      }

      // Criar inscrição
      const { data: inscricao, error: errInsc } = await supabase
        .from("inscricoes")
        .insert({
          participante_id: user.id,
          evento_id: evento.id,
          status: evento.valor === 0 ? "confirmada" : "aguardando_pagamento",
        })
        .select()
        .single();

      if (errInsc) throw errInsc;

      // Criar pagamento
      const { error: errPag } = await supabase
        .from("pagamentos")
        .insert({
          inscricao_id: inscricao.id,
          participante_id: user.id,
          evento_id: evento.id,
          valor: evento.valor,
          status: evento.valor === 0 ? "aprovado" : "aguardando",
        });

      if (errPag) throw errPag;

      return inscricao;
    },
    onSuccess: () => {
      toast.success("Inscrição realizada com sucesso!");
      setTimeout(() => {
        window.location.href = "/minhas-inscricoes";
      }, 1500);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao se inscrever");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Carregando encontro…</p>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Encontro não encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/eventos">Voltar aos encontros</Link>
        </Button>
      </div>
    );
  }

  const dataBR = (data: string) =>
    new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm" className="gap-1">
        <Link to="/eventos">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {evento.categoria && (
                <Badge className={`${getBadgeCategoria(evento.categoria)} text-white mb-3`}>
                  {evento.categoria}
                </Badge>
              )}
              <CardTitle className="text-2xl">{evento.titulo}</CardTitle>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">
                {Number(evento.valor).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Descrição */}
          {evento.descricao && (
            <div>
              <p className="text-sm text-muted-foreground">{evento.descricao}</p>
            </div>
          )}

          {/* Detalhes */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Calendar className="h-5 w-5 text-gold" />
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-semibold">{dataBR(evento.data)}</p>
                {evento.hora && <p className="text-sm text-muted-foreground">{evento.hora}</p>}
              </div>
            </div>

            {(evento.local || evento.cidade) && (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <MapPin className="h-5 w-5 text-gold" />
                <div>
                  <p className="text-xs text-muted-foreground">Local</p>
                  <p className="font-semibold">
                    {[evento.local, evento.cidade].filter(Boolean).join(" — ")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Users className="h-5 w-5 text-gold" />
              <div>
                <p className="text-xs text-muted-foreground">Vagas disponíveis</p>
                <p className="font-semibold">{evento.vagas}</p>
              </div>
            </div>
          </div>

          {/* Confirmação */}
          {!confirmando ? (
            <Button
              size="lg"
              className="w-full bg-gold text-primary-foreground hover:bg-gold/90"
              onClick={() => setConfirmando(true)}
              disabled={inscrever.isPending}
            >
              Confirmar Inscrição
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
              <p className="text-sm font-semibold text-foreground">
                Tem certeza que deseja se inscrever?
              </p>
              <p className="text-sm text-muted-foreground">
                Você receberá um e-mail de confirmação com os detalhes do encontro.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmando(false)}
                  disabled={inscrever.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gold text-primary-foreground hover:bg-gold/90"
                  onClick={() => inscrever.mutate()}
                  disabled={inscrever.isPending}
                >
                  {inscrever.isPending ? "Inscrevendo…" : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
