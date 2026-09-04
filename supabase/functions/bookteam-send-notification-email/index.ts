import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await admin.auth.getUser(token);
    if (!authData.user) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", authData.user.id).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "Acesso administrativo necessário" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    const body = await req.json();
    const participanteId = String(body.participante_id || "");
    const assunto = String(body.assunto || "Book Team");
    const mensagem = String(body.mensagem || "");
    if (!participanteId || !mensagem) return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    const { data: participante } = await admin.from("participantes").select("nome,email").eq("id", participanteId).maybeSingle();
    if (!participante?.email) return new Response(JSON.stringify({ error: "E-mail do aluno não encontrado" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    if (!resendKey || !from) return new Response(JSON.stringify({ error: "RESEND_API_KEY e RESEND_FROM_EMAIL ainda não foram configurados." }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b211d"><h2>${assunto}</h2><p>Olá, ${participante.nome || "aluno(a)"}!</p><p>${mensagem.replaceAll("\n", "<br>")}</p><p>Book Team — Amor & Honra</p></div>`;
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [participante.email], subject: assunto, html }) });
    if (!response.ok) return new Response(JSON.stringify({ error: "Falha ao enviar e-mail", detail: await response.text() }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } }); }
});