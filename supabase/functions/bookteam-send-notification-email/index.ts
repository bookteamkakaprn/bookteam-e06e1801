import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

interface EmailPayload {
  to: string;
  tipo: "pagamento_aprovado" | "pagamento_recusado" | "inscricao_aprovada" | "inscricao_recusada" | "curso_iniciado" | "customizado";
  nome: string;
  livro?: string;
  turma?: string;
  motivo?: string;
  valor?: number;
  data_inicio?: string;
  assunto?: string;
  mensagem?: string;
}

const getTemplate = (payload: EmailPayload) => {
  switch (payload.tipo) {
    case "pagamento_aprovado":
      return {
        subject: "✅ Seu pagamento foi aprovado!",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#d4af37;margin:0">✅ Pagamento Aprovado!</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Seu pagamento foi <strong style="color:#27ae60">APROVADO</strong>! 🎉</p><div style="background:#f5f5f5;padding:20px;border-left:4px solid #d4af37;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Curso:</strong> ${payload.livro}</p><p style="margin:10px 0;font-size:15px"><strong>Turma:</strong> ${payload.turma}</p>${payload.valor ? `<p style="margin:10px 0;font-size:15px"><strong>Valor:</strong> R$ ${payload.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>` : ""}</div><p style="font-size:16px;color:#333;margin:20px 0">Você já pode acessar o curso!</p><div style="text-align:center;margin:30px 0"><a href="https://ministeriobookteam.com.br/cursos" style="background:#d4af37;color:#000;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">📖 Acessar Curso</a></div><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Book Team — Jornada de Transformação<br>ministeriobookteam.com.br</p></div></div>`
      };
    case "pagamento_recusado":
      return {
        subject: "⚠️ Seu pagamento foi recusado",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#ef4444;margin:0">⚠️ Pagamento Recusado</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Recebemos seu comprovante, mas houve um problema:</p><div style="background:#fff5f5;padding:20px;border-left:4px solid #ef4444;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Motivo:</strong> ${payload.motivo || "Valor ou dados incorretos"}</p><p style="margin:10px 0;font-size:12px;color:#666">Verifique se o valor, data e dados do comprovante estão corretos.</p></div><p style="font-size:16px;color:#333;margin:20px 0">Você pode reenviar o comprovante:</p><div style="text-align:center;margin:30px 0"><a href="https://ministeriobookteam.com.br/minhas-inscricoes" style="background:#d4af37;color:#000;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">💳 Reenviar Comprovante</a></div><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Dúvidas? Entre em contato conosco.</p></div></div>`
      };
    case "inscricao_aprovada":
      return {
        subject: "✅ Sua inscrição foi aprovada!",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#d4af37;margin:0">✅ Inscrição Aprovada!</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Sua inscrição foi <strong style="color:#27ae60">APROVADA</strong>! Bem-vindo ao curso! 🎊</p><div style="background:#f5f5f5;padding:20px;border-left:4px solid #d4af37;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Curso:</strong> ${payload.livro}</p><p style="margin:10px 0;font-size:15px"><strong>Turma:</strong> ${payload.turma}</p></div><p style="font-size:16px;color:#333;margin:20px 0"><strong>Próximos passos:</strong></p><ol style="font-size:15px;color:#333;line-height:1.8"><li>Faça login em <a href="https://ministeriobookteam.com.br" style="color:#d4af37;text-decoration:none">ministeriobookteam.com.br</a></li><li>Clique em "Cursos" ou "Minhas Inscrições"</li><li>Comece a leitura! 📚</li></ol><div style="text-align:center;margin:30px 0"><a href="https://ministeriobookteam.com.br/inicio" style="background:#d4af37;color:#000;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">🚀 Começar Agora</a></div><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Book Team — Jornada de Transformação<br>ministeriobookteam.com.br</p></div></div>`
      };
    case "inscricao_recusada":
      return {
        subject: "⚠️ Sua inscrição foi recusada",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#ef4444;margin:0">⚠️ Inscrição Recusada</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Sua inscrição foi <strong style="color:#ef4444">RECUSADA</strong>.</p><div style="background:#fff5f5;padding:20px;border-left:4px solid #ef4444;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Motivo:</strong> ${payload.motivo || "Pré-requisitos não atendidos"}</p></div><p style="font-size:16px;color:#333;margin:20px 0">Entre em contato conosco para mais informações.</p><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Dúvidas? Entre em contato conosco.</p></div></div>`
      };
    case "curso_iniciado":
      return {
        subject: "🚀 Seu curso começou!",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px"><div style="background:white;border-radius:12px;padding:30px"><h1 style="color:#d4af37;margin:0">🚀 Seu Curso Começou!</h1><p style="font-size:16px;color:#333;margin:20px 0">Olá <strong>${payload.nome}</strong>,</p><p style="font-size:16px;color:#333;margin:20px 0">Seu curso foi <strong style="color:#27ae60">LIBERADO</strong>! É hora de começar sua jornada de transformação! 🎊</p><div style="background:#f5f5f5;padding:20px;border-left:4px solid #d4af37;border-radius:4px;margin:30px 0"><p style="margin:10px 0;font-size:15px"><strong>Curso:</strong> ${payload.livro}</p><p style="margin:10px 0;font-size:15px"><strong>Turma:</strong> ${payload.turma}</p>${payload.data_inicio ? `<p style="margin:10px 0;font-size:15px"><strong>Inicia em:</strong> ${new Date(payload.data_inicio).toLocaleDateString("pt-BR")}</p>` : ""}</div><p style="font-size:16px;color:#333;margin:20px 0"><strong>Você tem acesso total agora!</strong></p><ol style="font-size:15px;color:#333;line-height:1.8"><li>Acesse sua conta</li><li>Vá para "Minhas Inscrições"</li><li>Comece a leitura e transforme sua vida! 📚</li></ol><div style="text-align:center;margin:30px 0"><a href="https://ministeriobookteam.com.br/minhas-inscricoes" style="background:#d4af37;color:#000;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">✨ Acessar Curso</a></div><hr style="border:none;border-top:1px solid #ddd;margin:30px 0"><p style="font-size:12px;color:#999;text-align:center;margin:0">Book Team — Jornada de Transformação<br>ministeriobookteam.com.br</p></div></div>`
      };
    case "customizado":
    default:
      return {
        subject: payload.assunto || "Book Team",
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b211d"><h2>${payload.assunto || "Book Team"}</h2><p>Olá, ${payload.nome || "aluno(a)"}!</p><p>${(payload.mensagem || "").replaceAll("\n", "<br>")}</p><p>Book Team — Amor & Honra</p></div>`
      };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  try {
    const body: EmailPayload = await req.json();
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    
    if (!resendKey || !from) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY e RESEND_FROM_EMAIL não configurados" }), { 
        status: 503, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    if (!body.to || !body.nome) {
      return new Response(JSON.stringify({ error: "Email e nome são obrigatórios" }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    const template = getTemplate(body);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: body.to,
        subject: template.subject,
        html: template.html
      })
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Falha ao enviar e-mail", detail: await response.text() }), { 
        status: 502, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ ok: true }), { 
      headers: { ...cors, "Content-Type": "application/json" } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), { 
      status: 500, 
      headers: { ...cors, "Content-Type": "application/json" } 
    });
  }
});