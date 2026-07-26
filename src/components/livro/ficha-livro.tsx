import type { ReactNode } from "react";

export interface FichaItem {
  label: string;
  value?: string | number | null;
}

/** Bloco de texto longo (descrição, objetivo, conteúdo…) preservando quebras de linha. */
export function BlocoTexto({ titulo, texto }: { titulo: string; texto?: string | null }) {
  if (!texto || !texto.trim()) return null;
  return (
    <section className="rounded-lg border border-border/60 bg-card/40 p-5">
      <h2 className="font-serif text-lg font-semibold text-foreground">{titulo}</h2>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground/80">{texto}</p>
    </section>
  );
}

/** Grade de metadados curtos (professor, turma, sala, valor…). */
export function GradeInfo({ itens, children }: { itens: FichaItem[]; children?: ReactNode }) {
  const visiveis = itens.filter(
    (i) => i.value !== null && i.value !== undefined && String(i.value).trim() !== "",
  );
  if (visiveis.length === 0 && !children) return null;
  return (
    <section className="rounded-lg border border-border/60 bg-card/40 p-5">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((i) => (
          <div key={i.label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {i.label}
            </dt>
            <dd className="mt-1 break-words text-sm text-foreground">{String(i.value)}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}