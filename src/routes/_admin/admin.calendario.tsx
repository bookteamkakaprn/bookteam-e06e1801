import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/calendario")({
  component: AdminCalendarioPage,
});

type Evento = {
  id: string;
  titulo: string;
  data: string;
  hora: string | null;
  local: string | null;
  cidade: string | null;
  categoria: string | null;
};

type Livro = {
  id: string;
  titulo: string;
  ordem: number | null;
};

type Turma = {
  id: string;
  livro_id: string;
  nome: string;
  data_inicio: string | null;
  data_fim: string | null;
  horario: string | null;
  categoria: string | null;
};

type ItemCalendario = {
  id: string;
  data: string;
  fim?: string | null;
  hora?: string | null;
  titulo: string;
  subtitulo: string;
  tipo: "evento" | "curso";
  categoria?: string | null;
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function AdminCalendarioPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
  );

  const inicio = iso(new Date(mes.getFullYear(), mes.getMonth(), 1));
  const fim = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));

  const livrosQ = useQuery({
    queryKey: ["admin-calendario-livros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("id,titulo,ordem")
        .order("ordem");

      if (error) throw error;
      return (data ?? []) as Livro[];
    },
  });

  const eventosQ = useQuery({
    queryKey: ["admin-calendario-eventos", inicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("id,titulo,data,hora,local,cidade,categoria,livro_id")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data")
        .order("hora");

      if (error) throw error;
      return (data ?? []) as (Evento & { livro_id: string | null })[];
    },
  });

  const turmasQ = useQuery({
    queryKey: ["admin-calendario-turmas", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id,livro_id,nome,data_inicio,data_fim,horario,categoria")
        .or(`data_inicio.gte.${inicio},data_fim.gte.${inicio}`)
        .or(`data_inicio.lte.${fim},data_fim.lte.${fim}`)
        .order("data_inicio");

      if (error) throw error;
      return (data ?? []) as Turma[];
    },
  });

  const livros = livrosQ.data ?? [];
  const eventos = eventosQ.data ?? [];
  const turmas = turmasQ.data ?? [];

  const itens = useMemo<ItemCalendario[]>(() => {
    const porLivro = new Map(livros.map((livro) => [livro.id, livro]));

    const resultado: ItemCalendario[] = [];

    for (const turma of turmas) {
      if (!turma.data_inicio) continue;
      const livro = porLivro.get(turma.livro_id);
      if (!livro) continue;

      resultado.push({
        id: `curso-${turma.id}`,
        data: turma.data_inicio,
        fim: turma.data_fim,
        hora: turma.horario,
        titulo: livro.titulo,
        subtitulo: turma.nome,
        tipo: "curso",
        categoria: turma.categoria,
      });
    }

    for (const evento of eventos) {
      // Registros vinculados a curso aparecem como curso no calendário,
      // e os eventos independentes aparecem como eventos.
      if (evento.livro_id) {
        const livro = porLivro.get(evento.livro_id);
        resultado.push({
          id: `evento-${evento.id}`,
          data: evento.data,
          hora: evento.hora,
          titulo: livro?.titulo ?? evento.titulo,
          subtitulo: evento.titulo,
          tipo: "curso",
          categoria: evento.categoria,
        });
      } else {
        resultado.push({
          id: `evento-${evento.id}`,
          data: evento.data,
          hora: evento.hora,
          titulo: evento.titulo,
          subtitulo: "Evento",
          tipo: "evento",
          categoria: evento.categoria,
        });
      }
    }

    return resultado.sort((a, b) => {
      const d = a.data.localeCompare(b.data);
      if (d !== 0) return d;
      return (a.hora ?? "").localeCompare(b.hora ?? "");
    });
  }, [eventos, livros, turmas]);

  const porDia = useMemo(() => {
    const mapa: Record<string, ItemCalendario[]> = {};
    for (const item of itens) {
      (mapa[item.data] ??= []).push(item);
    }
    return mapa;
  }, [itens]);

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const dias = new Date(
      mes.getFullYear(),
      mes.getMonth() + 1,
      0,
    ).getDate();

    return [
      ...Array.from({ length: primeiro.getDay() }, () => null),
      ...Array.from(
        { length: dias },
        (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1),
      ),
    ];
  }, [mes]);

  const carregando =
    livrosQ.isLoading || eventosQ.isLoading || turmasQ.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Visão geral
        </p>
        <h1 className="font-serif text-2xl font-semibold">
          Calendário geral
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui aparecem juntos livros/cursos e eventos.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() =>
                setMes(
                  new Date(mes.getFullYear(), mes.getMonth() - 1, 1),
                )
              }
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <p className="font-serif text-lg font-semibold">
              {MESES[mes.getMonth()]} {mes.getFullYear()}
            </p>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() =>
                setMes(
                  new Date(mes.getFullYear(), mes.getMonth() + 1, 1),
                )
              }
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted-foreground">
            {DIAS.map((dia) => (
              <div key={dia} className="py-1">
                {dia}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celulas.map((data, index) =>
              !data ? (
                <div key={`vazio-${index}`} className="min-h-24" />
              ) : (
                <div
                  key={iso(data)}
                  className="min-h-24 rounded-md border border-border p-1"
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    {data.getDate()}
                  </span>

                  <div className="mt-1 space-y-1">
                    {(porDia[iso(data)] ?? []).map((item) => (
                      <div
                        key={item.id}
                        title={
                          item.fim
                            ? `${item.titulo} — ${item.subtitulo}\n${item.data} a ${item.fim}`
                            : `${item.titulo} — ${item.subtitulo}`
                        }
                        className={`truncate rounded px-1 py-0.5 text-[10px] ${
                          item.tipo === "curso"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {item.hora ? `${item.hora.slice(0, 5)} ` : ""}
                        {item.tipo === "curso" ? item.titulo : item.titulo}
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>

          {carregando && (
            <p className="mt-3 text-sm text-muted-foreground">
              <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
              Carregando calendário…
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-secondary align-middle" />
          Cursos / turmas
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-primary align-middle" />
          Eventos
        </span>
      </div>
    </div>
  );
}
