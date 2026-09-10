import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface EmailPayload {
  to: string;
  tipo: "pagamento_aprovado" | "pagamento_recusado" | "inscricao_aprovada";
  nome: string;
  livro?: string;
  turma?: string;
  motivo?: string;
  valor?: number;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const templates = {
  pagamento_aprovado: (data: EmailPayload) => ({
    subject: "✅ Seu pagamento foi aprovado!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 12px; padding: 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d4af37; margin: 0;">✅ Pagamento Aprovado!</h1>
          </div>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">Olá <strong>${data.nome}</strong>,</p>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">
            Seu pagamento foi <strong style="color: #27ae60;">APROVADO</strong>! 🎉
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #d4af37; border-radius: 4px; margin: 30px 0;">
            <p style="margin: 10px 0; font-size: 15px;"><strong>Curso:</strong> ${data.livro}</p>
            <p style="margin: 10px 0; font-size: 15px;"><strong>Turma:</strong> ${data.turma}</p>
            ${data.valor ? `<p style="margin: 10px 0; font-size: 15px;"><strong>Valor:</strong> R$ ${data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>` : ""}
          </div>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">
            Você já pode acessar o curso!
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ministeriobookteam.com.br/cursos" style="background: #d4af37; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              📖 Acessar Curso
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Book Team — Jornada de Transformação<br>
            ministeriobookteam.com.br
          </p>
        </div>
      </div>
    `
  }),
  
  pagamento_recusado: (data: EmailPayload) => ({
    subject: "⚠️ Seu pagamento foi recusado",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 12px; padding: 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ef4444; margin: 0;">⚠️ Pagamento Recusado</h1>
          </div>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">Olá <strong>${data.nome}</strong>,</p>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">
            Recebemos seu comprovante, mas houve um problema:
          </p>
          
          <div style="background: #fff5f5; padding: 20px; border-left: 4px solid #ef4444; border-radius: 4px; margin: 30px 0;">
            <p style="margin: 10px 0; font-size: 15px;"><strong>Motivo:</strong> ${data.motivo}</p>
            <p style="margin: 10px 0; font-size: 12px; color: #666;">
              Verifique se o valor, data e dados do comprovante estão corretos.
            </p>
          </div>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">
            Você pode reenviar o comprovante:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ministeriobookteam.com.br/minhas-inscricoes" style="background: #d4af37; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              💳 Reenviar Comprovante
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Dúvidas? Entre em contato conosco.
          </p>
        </div>
      </div>
    `
  }),
  
  inscricao_aprovada: (data: EmailPayload) => ({
    subject: "✅ Sua inscrição foi aprovada!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 12px; padding: 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d4af37; margin: 0;">✅ Inscrição Aprovada!</h1>
          </div>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">Olá <strong>${data.nome}</strong>,</p>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">
            Sua inscrição foi <strong style="color: #27ae60;">APROVADA</strong>! Bem-vindo ao curso! 🎊
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #d4af37; border-radius: 4px; margin: 30px 0;">
            <p style="margin: 10px 0; font-size: 15px;"><strong>Curso:</strong> ${data.livro}</p>
            <p style="margin: 10px 0; font-size: 15px;"><strong>Turma:</strong> ${data.turma}</p>
          </div>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">
            <strong>Próximos passos:</strong>
          </p>
          
          <ol style="font-size: 15px; color: #333; line-height: 1.8;">
            <li>Faça login em <a href="https://ministeriobookteam.com.br" style="color: #d4af37; text-decoration: none;">ministeriobookteam.com.br</a></li>
            <li>Clique em "Cursos" ou "Minhas Inscrições"</li>
            <li>Comece a leitura! 📚</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ministeriobookteam.com.br/inicio" style="background: #d4af37; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              🚀 Começar Agora
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Book Team — Jornada de Transformação<br>
            ministeriobookteam.com.br
          </p>
        </div>
      </div>
    `
  })
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const payload: EmailPayload = await req.json();

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurado");
    }

    const template = templates[payload.tipo](payload);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Book Team <noreply@ministeriobookteam.com.br>",
        to: payload.to,
        subject: template.subject,
        html: template.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Email error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
