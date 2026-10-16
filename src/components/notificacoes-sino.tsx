import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida: boolean;
  created_at: string;
};

function tempoRelativo(v: string) {
  const min = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return new Date(v).toLocaleDateString("pt-BR");
}

export function NotificacoesSino({ destinatario }: { destinatario: "admin" | "aluno" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const chave = ["notificacoes-app", destinatario, user?.id ?? null];
  const habilitado = destinatario === "admin" || !!user?.id;

  const { data: notificacoes = [] } = useQuery({
    queryKey: chave,
    enabled: habilitado,
    refetchInterval: 60_000,
    queryFn: async () => {
      let query = (supabase as any)
        .from("notificacoes_app")
        .select("id,titulo,mensagem,link,lida,created_at")
        .eq("destinatario", destinatario)
        .order("created_at", { ascending: false })
        .limit(30);
      if (destinatario === "aluno") query = query.eq("participante_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Notificacao[];
    },
  });

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const marcar = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await (supabase as any)
        .from("notificacoes_app")
        .update({ lida: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="relative" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {naoLidas > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {naoLidas > 99 ? "99+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[90vw] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          {naoLidas > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => marcar.mutate(notificacoes.filter((n) => !n.lida).map((n) => n.id))}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notificacoes.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nenhuma notificação.</p>
          )}
          {notificacoes.map((n) => {
            const conteudo = (
              <div className={`px-3 py-2.5 text-left ${n.lida ? "" : "bg-primary/5"}`}>
                <p className="text-sm font-medium">{n.titulo}</p>
                {n.mensagem && <p className="text-xs text-muted-foreground">{n.mensagem}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">{tempoRelativo(n.created_at)}</p>
              </div>
            );
            return (
              <div key={n.id} className="border-b border-border last:border-0">
                {n.link ? (
                  <Link
                    to={n.link}
                    className="block hover:bg-secondary"
                    onClick={() => !n.lida && marcar.mutate([n.id])}
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="block w-full hover:bg-secondary"
                    onClick={() => !n.lida && marcar.mutate([n.id])}
                  >
                    {conteudo}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
