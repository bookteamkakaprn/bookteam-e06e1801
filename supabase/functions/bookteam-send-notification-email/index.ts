import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailPayload {
  to: string;
  tipo: "pagamento_aprovado" | "pagamento_recusado" | "curso_iniciado" | "inscricao_aprovada" | "inscricao_recusada" | "customizado";
  nome: string;
  livro?: string;
  turma?: string;
  motivo?: string;
  valor?: number;
  data_inicio?: string;
  assunto?: string;
  mensagem?: string;
}

function getEmailTemplate(payload: EmailPayload) {
  switch (payload.tipo) {
    case "pagamento_aprovado":
      return {
        subject: "✅ Seu pagamento foi aprovado!",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#27ae60;margin:0">✅ PAGAMENTO APROVADO!</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Seu pagamento foi <strong style="color:#27ae60">APROVADO</strong>! 🎉</p><div style="background:#f5f5f5;padding:20px;border-left:4px solid #d4af37;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Curso:</strong> ${payload.livro}</p><p style="margin:10px 0;font-size:15px"><strong>Turma:</strong> ${payload.turma}</p>${payload.valor ? `<p style="margin:10px 0;font-size:15px"><strong>Valor:</strong> R$ ${payload.valor?.toFixed(2)}</p>` : ""}</div><p style="font-size:16px;color:#333;margin:20px 0">Você já pode acessar o curso! Aguarde a liberação do inicio.</p><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Book Team — Jornada de Transformação</p></div></div>`
      };
    case "pagamento_recusado":
      return {
        subject: "⚠️ Seu pagamento foi recusado",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#ef4444;margin:0">⚠️ PAGAMENTO RECUSADO</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Recebemos seu comprovante, mas houve um problema:</p><div style="background:#fff5f5;padding:20px;border-left:4px solid #ef4444;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Motivo:</strong> ${payload.motivo || "Dados incompletos"}</p></div><p style="font-size:16px;color:#333;margin:20px 0">Verifique se o valor, data e dados do comprovante estão corretos.</p><p style="font-size:16px;color:#333;margin:20px 0">Você pode reenviar o comprovante acessando sua conta.</p><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Dúvidas? Entre em contato conosco.</p></div></div>`
      };
    case "curso_iniciado":
      return {
        subject: "🚀 Seu Curso Começou!",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#d4af37;margin:0">🚀 SEU CURSO COMEÇOU!</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Sua inscrição foi <strong style="color:#27ae60">LIBERADA</strong>! 🎊</p><div style="background:#f5f5f5;padding:20px;border-left:4px solid #d4af37;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Curso:</strong> ${payload.livro}</p><p style="margin:10px 0;font-size:15px"><strong>Turma:</strong> ${payload.turma}</p>${payload.data_inicio ? `<p style="margin:10px 0;font-size:15px"><strong>Inicia em:</strong> ${new Date(payload.data_inicio).toLocaleDateString("pt-BR")}</p>` : ""}</div><p style="font-size:16px;color:#333;margin:20px 0"><strong>Você tem acesso total agora!</strong></p><ol style="font-size:15px;color:#333;line-height:1.8"><li>Acesse sua conta em https://ministeriobookteam.com.br</li><li>Vá para "Minhas Inscrições"</li><li>Comece a leitura e transforme sua vida! 📚</li></ol><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Book Team — Jornada de Transformação<br>ministeriobookteam.com.br</p></div></div>`
      };
    case "inscricao_aprovada":
      return {
        subject: "✅ Sua inscrição foi aprovada!",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#27ae60;margin:0">✅ INSCRIÇÃO APROVADA</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Sua inscrição foi <strong style="color:#27ae60">APROVADA</strong>! 🎉</p><div style="background:#f5f5f5;padding:20px;border-left:4px solid #d4af37;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Curso:</strong> ${payload.livro}</p><p style="margin:10px 0;font-size:15px"><strong>Turma:</strong> ${payload.turma}</p></div><p style="font-size:16px;color:#333;margin:20px 0">Você já pode começar! Acesse sua conta e aproveite!</p><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Book Team — Jornada de Transformação</p></div></div>`
      };
    case "inscricao_recusada":
      return {
        subject: "⚠️ Sua inscrição foi recusada",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#ef4444;margin:0">⚠️ INSCRIÇÃO RECUSADA</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Sua inscrição foi <strong style="color:#ef4444">RECUSADA</strong>.</p><div style="background:#fff5f5;padding:20px;border-left:4px solid #ef4444;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Motivo:</strong> ${payload.motivo || "Pré-requisitos não atendidos"}</p></div><p style="font-size:16px;color:#333;margin:20px 0">Entre em contato conosco para mais informações.</p><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Dúvidas? Entre em contato conosco.</p></div></div>`
      };
    case "customizado":
      return {
        subject: payload.assunto || "Book Team",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0;white-space:pre-wrap">${payload.mensagem}</p><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Book Team — Jornada de Transformação</p></div></div>`
      };
    default:
      return {
        subject: "Book Team",
        html: `<p>Olá ${payload.nome}!</p>`
      };
  }
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    console.log("📧 [EMAIL] Função chamada!");

    const body = await req.json() as EmailPayload;
    console.log("📧 [EMAIL] Tipo:", body.tipo);
    console.log("📧 [EMAIL] Para:", body.to);

    // Validar dados
    if (!body.to || !body.tipo || !body.nome) {
      console.error("❌ [EMAIL] Dados incompletos:", { to: body.to, tipo: body.tipo, nome: body.nome });
      return new Response(
        JSON.stringify({ error: "Dados incompletos (to, tipo, nome obrigatórios)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pegar credenciais
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");

    if (!resendKey || !from) {
      console.error("❌ [EMAIL] Secrets não configurados!");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY ou RESEND_FROM_EMAIL não configurados" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Gerar template
    const template = getEmailTemplate(body);
    console.log("📧 [EMAIL] Template gerado:", template.subject);

    // Enviar via Resend
    console.log("📧 [EMAIL] Enviando para Resend...");
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: body.to,
        subject: template.subject,
        html: template.html,
      }),
    });

    const resendResult = await resendResponse.text();
    console.log("📧 [EMAIL] Resposta Resend:", resendResponse.status);

    if (!resendResponse.ok) {
      console.error("❌ [EMAIL] Falha ao enviar:", resendResult);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar email", detail: resendResult }),
        { status: resendResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [EMAIL] Email enviado com sucesso!");
    return new Response(
      JSON.stringify({ ok: true, message: "Email enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ [EMAIL] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
