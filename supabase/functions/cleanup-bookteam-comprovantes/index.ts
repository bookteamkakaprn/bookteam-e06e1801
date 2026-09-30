import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "comprovantes";
const RETENTION_DAYS = 15;

Deno.serve(async () => {
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!secretKey) {
    return Response.json({ ok: false, error: "Supabase secret key não configurada." }, { status: 500 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secretKey);
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: pagamentos, error } = await supabase
    .from("pagamentos")
    .select("id, comprovante_url, inscricao:inscricoes(id, turma:turmas(id, nome, status, updated_at))")
    .not("comprovante_url", "is", null);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const expirados = (pagamentos ?? []).filter((pagamento: any) => {
    const turma = Array.isArray(pagamento.inscricao?.turma)
      ? pagamento.inscricao.turma[0]
      : pagamento.inscricao?.turma;

    return turma?.status === "finalizada" && turma?.updated_at && turma.updated_at < cutoff && pagamento.comprovante_url;
  });

  let removidos = 0;
  const erros: string[] = [];

  for (let i = 0; i < expirados.length; i += 1000) {
    const lote = expirados.slice(i, i + 1000);
    const paths = lote.map((p: any) => p.comprovante_url).filter(Boolean);
    if (!paths.length) continue;

    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) { erros.push(storageError.message); continue; }

    const ids = lote.map((p: any) => p.id);
    const { error: dbError } = await supabase
      .from("pagamentos")
      .update({ comprovante_url: null, comprovante_enviado_em: null })
      .in("id", ids);

    if (dbError) { erros.push(dbError.message); continue; }
    removidos += lote.length;
  }

  return Response.json({ ok: erros.length === 0, encontrados: expirados.length, removidos, erros });
});