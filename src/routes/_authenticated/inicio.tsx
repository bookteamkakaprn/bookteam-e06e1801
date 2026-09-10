import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/inicio")({ head: () => ({ meta: [{ title: "Meu painel — Book Team" }, { name: "robots", content: "noindex" }] }), component: InicioPage });

function InicioPage() {
  const { user } = useAuth(); 
  const nome = (user?.user_metadata?.nome as string | undefined) ?? user?.email;
  
  // Versículos diários - um por dia
  const versiculos = [
    { texto: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", referencia: "João 3:16" },
    { texto: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", referencia: "Mateus 11:28" },
    { texto: "Porque nele vivemos, e nos movemos, e existimos; como também alguns dos vossos poetas disseram: Porque somos também geração dele.", referencia: "Atos 17:28" },
    { texto: "O Senhor é a minha luz e a minha salvação; a quem terei medo?", referencia: "Salmos 27:1" },
    { texto: "Confiai no Senhor de todo o vosso coração e não vos apoieis na vossa prudência.", referencia: "Provérbios 3:5" },
    { texto: "Porque o Senhor conhece o caminho dos justos; mas o caminho dos ímpios perecerá.", referencia: "Salmos 1:6" },
    { texto: "Bem-aventurados os que têm fome e sede de justiça, porque serão fartos.", referencia: "Mateus 5:6" },
    { texto: "Assim resplandeça a vossa luz diante dos homens, para que vejam as vossas boas obras.", referencia: "Mateus 5:16" },
    { texto: "A graça e a paz sejam convosco de Deus nosso Pai, e do Senhor Jesus Cristo.", referencia: "1 Coríntios 1:3" },
    { texto: "Porque em Cristo Jesus nem a circuncisão nem a incircuncisão tem valor algum, mas sim a fé que atua por meio do amor.", referencia: "Gálatas 5:6" },
  ];
  
  // Selecionar versículo baseado no dia (para ser consistente)
  const hoje = new Date();
  const diaDano = (hoje.getFullYear() * 10000) + ((hoje.getMonth() + 1) * 100) + hoje.getDate();
  const versiculo = versiculos[diaDano % versiculos.length];

  return <div className="min-w-0 space-y-7 overflow-hidden">
    <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-background p-5 sm:p-6">
      <p className="text-sm text-muted-foreground">Bem-vindo(a) ao painel do aluno</p>
      <h1 className="break-words font-serif text-2xl font-bold sm:text-3xl">{nome}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Aqui você acompanha suas inscrições, próximas turmas, pagamentos, encontros e certificados.</p>
    </div>

    {/* Versículo Diário */}
    <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-background">
      <CardContent className="p-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">Versículo do Dia</p>
          <p className="font-serif text-lg leading-relaxed italic text-foreground">"{versiculo.texto}"</p>
          <p className="text-sm text-muted-foreground">— {versiculo.referencia}</p>
        </div>
      </CardContent>
    </Card>
  </div>;
}
