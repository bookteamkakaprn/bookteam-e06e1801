/** Prazo máximo (em meses) para que a conclusão de um livro ainda libere o próximo. */
export const LIMITE_MESES = 12;

/** Data limite: conclusões anteriores a esta data estão vencidas. */
export function dataLimiteConclusao(hoje: Date = new Date()): string {
  const d = new Date(hoje);
  d.setMonth(d.getMonth() - LIMITE_MESES);
  return d.toISOString().slice(0, 10);
}

/** Uma conclusão (YYYY-MM-DD) só é válida se ocorreu dentro do prazo. */
export function conclusaoValida(dataConclusao: string, hoje: Date = new Date()): boolean {
  return dataConclusao >= dataLimiteConclusao(hoje);
}
