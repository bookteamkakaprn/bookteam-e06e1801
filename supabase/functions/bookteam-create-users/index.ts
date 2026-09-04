import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type Perfil = "aluno" | "adm" | "aluno_adm";
type UserInput = {
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  perfil?: Perfil;
};

function clean(v: unknown) { return String(v ?? "").trim(); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers: cors });

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) return new Response(JSON.stringify({ error: "Sessão inválida." }), { status: 401, headers: cors });

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: role } = await adminClient.from("user_roles").select("role").eq("user_id", callerData.user.id).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "Apenas ADM pode criar contas." }), { status: 403, headers: cors });

    const body = await req.json();
    const users = Array.isArray(body?.users) ? body.users as UserInput[] : [];
    if (!users.length || users.length > 500) return new Response(JSON.stringify({ error: "Envie entre 1 e 500 alunos." }), { status: 400, headers: cors });

    const results: { email: string; ok: boolean; error?: string }[] = [];
    const redirectTo = `${req.headers.get("origin") || supabaseUrl}/auth`;

    for (const raw of users) {
      const nome = clean(raw.nome);
      const email = clean(raw.email).toLowerCase();
      const perfil: Perfil = raw.perfil === "adm" || raw.perfil === "aluno_adm" ? raw.perfil : "aluno";
      if (!nome || !/^\S+@\S+\.\S+$/.test(email)) {
        results.push({ email: email || "(sem e-mail)", ok: false, error: "Nome e e-mail válidos são obrigatórios." });
        continue;
      }

      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          nome,
          cpf: clean(raw.cpf),
          telefone: clean(raw.telefone),
          cidade: clean(raw.cidade),
          estado: clean(raw.estado),
          aceite_lgpd: true,
        },
      });

      if (inviteError || !invited.user) {
        results.push({ email, ok: false, error: inviteError?.message || "Não foi possível enviar o convite." });
        continue;
      }

      const userId = invited.user.id;
      const { error: participantError } = await adminClient.from("participantes").update({
        nome,
        cpf: clean(raw.cpf) || null,
        telefone: clean(raw.telefone) || null,
        cidade: clean(raw.cidade) || null,
        estado: clean(raw.estado) || null,
        aceite_lgpd: true,
        status: "inscrito",
      }).eq("id", userId);

      if (participantError) {
        results.push({ email, ok: false, error: participantError.message });
        continue;
      }

      if (perfil === "adm" || perfil === "aluno_adm") {
        const { error: adminRoleError } = await adminClient.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
        if (adminRoleError) {
          results.push({ email, ok: false, error: adminRoleError.message });
          continue;
        }
      }

      results.push({ email, ok: true });
    }

    return new Response(JSON.stringify({ results }), { status: 200, headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno." }), { status: 500, headers: cors });
  }
});
