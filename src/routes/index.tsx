import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Users,
  Calendar,
  Award,
  CheckCircle2,
  Instagram,
  MessageCircle,
  ArrowRight,
  Phone,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoAsset from "@/assets/book-team-logo.png.asset.json";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Book Clube — Trilhas de leitura, encontros e certificados" },
      {
        name: "description",
        content:
          "Escolha uma trilha, inscreva-se em encontros presenciais, leia com propósito e receba seu certificado. Bem-vindo ao Book Clube.",
      },
      { property: "og:title", content: "Book Clube — Trilhas de leitura" },
      {
        property: "og:description",
        content:
          "Comunidade de leitura com trilhas guiadas, encontros presenciais e certificados de participação.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <HowItWorks />
      <LivrosSection />
      <EventosSection />
      <EventosEspeciaisSection />
      <ContatoEventosSection />
      <Testimonials />
      <FaqSection />
      <Footer />
    </div>
  );
}

function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Book Team — amor e honra"
      className={`${className} rounded-full object-cover`}
    />
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <Logo />
          <span className="font-serif text-lg font-semibold tracking-tight">Book Team</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
          <a href="#livros" className="hover:text-foreground">Livros</a>
          <a href="#eventos" className="hover:text-foreground">Encontros</a>
          <a href="#contato" className="hover:text-foreground">Contato</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>Quero participar</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}


function Hero() {
  return (
    <section className="gradient-hero relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <span className="inline-flex items-center rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            Clube de leitura & desenvolvimento
          </span>
          <h1 className="mt-6 font-serif text-4xl font-bold leading-tight md:text-5xl">
            O Ministério <span className="text-accent">Book Team</span> estuda livros cristãos que ensinam Homens e Mulheres a viver uma cultura de <span className="text-accent">AMOR & HONRA</span>!
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Trilhas guiadas, encontros presenciais e uma comunidade que
            transforma páginas em conversas — e conversas em jornada.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Quero participar <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#livros">Ver livros</a>
            </Button>
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 -z-10 rounded-full bg-accent/10 blur-3xl" />
          <img
            src={logoAsset.url}
            alt="Book Team — amor e honra"
            className="w-full max-w-sm rounded-full shadow-book"
          />
        </div>

      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, title: "Escolha uma trilha", desc: "Selecione o tema que faz sentido para você." },
    { n: 2, title: "Inscreva-se em um encontro", desc: "Reserve sua vaga com poucos cliques." },
    { n: 3, title: "Pague via PIX", desc: "Envie o comprovante e receba a confirmação." },
    { n: 4, title: "Participe do encontro", desc: "Presencial, com pessoas incríveis." },
    { n: 5, title: "Continue sua jornada", desc: "Próximo livro, próxima conversa." },
  ];
  return (
    <section id="como-funciona" className="border-t border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-accent">Como funciona</p>
          <h2 className="mt-2 font-serif text-4xl font-bold">Cinco passos simples</h2>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-5">
          {steps.map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-serif text-lg font-bold">
                {s.n}
              </div>
              <p className="mt-4 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function LivrosSection() {
  const { data: livros = [] } = useQuery({
    queryKey: ["landing-livros"],
    queryFn: async () => {
      const { data } = await supabase
        .from("livros")
        .select("id, titulo, autor, imagem_url")
        .eq("status", "ativo")
        .order("ordem")
        .limit(12);
      return data ?? [];
    },
  });

  return (
    <section id="livros" className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-accent">Biblioteca</p>
            <h2 className="mt-2 font-serif text-4xl font-bold">Nossos livros</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Leituras cristãs que sustentam nossos encontros e formam a cultura de amor e honra.
            </p>
          </div>
        </div>

        {livros.length === 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shadow-book flex aspect-[2/3] items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-3 text-center text-xs text-muted-foreground"
              >
                Espaço para foto do livro
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {livros.map((l) => (
              <article key={l.id} className="group">
                <div className="shadow-book overflow-hidden rounded-xl border border-border bg-card">
                  <div
                    className="aspect-[2/3] w-full bg-secondary"
                    style={
                      l.imagem_url
                        ? { background: `url(${l.imagem_url}) center/cover` }
                        : undefined
                    }
                  >
                    {!l.imagem_url && (
                      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                        Foto em breve
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 font-serif text-sm font-semibold">{l.titulo}</p>
                {l.autor && (
                  <p className="text-xs text-muted-foreground">{l.autor}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EventosSection() {
  const { data: eventos = [] } = useQuery({
    queryKey: ["landing-eventos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("id, titulo, cidade, local, data, hora, vagas")
        .eq("status", "aberto")
        .gte("data", new Date().toISOString().slice(0, 10))
        .order("data")
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <section id="eventos" className="border-t border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Próximos encontros</p>
        <h2 className="mt-2 font-serif text-4xl font-bold">Reserve seu lugar</h2>

        {eventos.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            Nenhum encontro agendado no momento. Cadastre-se para ser avisado.
          </div>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {eventos.map((e) => (
              <div key={e.id} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {format(new Date(e.data + "T00:00:00"), "dd 'de' MMMM", { locale: ptBR })}
                  {e.hora ? ` · ${e.hora.slice(0, 5)}` : ""}
                </p>
                <h3 className="mt-2 font-serif text-lg font-semibold">{e.titulo}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[e.cidade, e.local].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {e.vagas > 0 ? `${e.vagas} vagas` : "Vagas limitadas"}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/auth" search={{ mode: "signup" }}>Inscrever-se</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EventosEspeciaisSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 rounded-3xl border border-border bg-card p-8 md:grid-cols-[1.1fr_1fr] md:p-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Encontros especiais
            </span>
            <h2 className="mt-4 font-serif text-3xl font-semibold md:text-4xl">
              Momentos abertos para todos
            </h2>
            <p className="mt-4 text-muted-foreground">
              Além das trilhas dos livros, promovemos encontros especiais —
              retiros, celebrações, conferências e eventos temáticos —
              abertos ao público, mesmo para quem ainda não faz parte de uma
              trilha. Um convite para viver a cultura de amor e honra.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href="#contato">Reservar um evento</a>
              </Button>
              <Button asChild variant="outline">
                <a href="#eventos">Ver agenda</a>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              "Retiros",
              "Conferências",
              "Celebrações",
              "Eventos temáticos",
            ].map((tag) => (
              <div
                key={tag}
                className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-border bg-secondary text-center text-sm text-muted-foreground"
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContatoEventosSection() {
  const phone = "41 3082-5553";
  const whatsappHref = `https://wa.me/554130825553`;
  return (
    <section id="contato" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Contato para eventos</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">
          Vamos organizar um encontro?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Para agendar um evento, tirar dúvidas sobre próximas datas ou levar o
          Book Team para a sua cidade, fale com a nossa equipe.
        </p>
        <div className="mt-8 inline-flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-6 sm:flex-row">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Phone className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Eventos
            </p>
            <a
              href={`tel:+554130825553`}
              className="block font-serif text-2xl font-semibold text-foreground"
            >
              {phone}
            </a>
          </div>
          <Button asChild variant="outline" className="sm:ml-6">
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}



function Testimonials() {
  const items = [
    {
      q: "Voltei a ler no ritmo que sempre quis, com gente que topa conversar de verdade.",
      a: "Marina R.",
    },
    {
      q: "Os encontros presenciais são o diferencial. Saio de cada um com ideias novas.",
      a: "Bruno L.",
    },
    {
      q: "A trilha de liderança mudou como eu conduzo meu time.",
      a: "Camila F.",
    },
  ];
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Depoimentos</p>
        <h2 className="mt-2 font-serif text-4xl font-bold">Quem vive, conta</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((i) => (
            <blockquote
              key={i.a}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <CheckCircle2 className="h-5 w-5 text-accent" />
              <p className="mt-3 font-serif text-lg leading-snug">"{i.q}"</p>
              <footer className="mt-4 text-sm text-muted-foreground">— {i.a}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const items = [
    {
      q: "Preciso pagar mensalidade?",
      a: "Não. Você paga apenas pelos encontros em que se inscrever, via PIX.",
    },
    {
      q: "Os encontros são online?",
      a: "Não. Todos os encontros são presenciais. A cidade é indicada em cada evento.",
    },
    {
      q: "Como recebo o certificado?",
      a: "Ao concluir uma trilha (todos os encontros com presença registrada), o certificado é emitido pela administração e fica disponível na sua área.",
    },
    {
      q: "Posso escolher qualquer livro?",
      a: "As leituras seguem a ordem da trilha escolhida — assim a comunidade caminha junta.",
    },
  ];
  return (
    <section id="faq" className="border-t border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-3xl px-4">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Perguntas frequentes</p>
        <h2 className="mt-2 font-serif text-4xl font-bold">Dúvidas comuns</h2>
        <Accordion type="single" collapsible className="mt-8">
          {items.map((i, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left font-medium">{i.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{i.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-serif text-lg font-semibold">Book Clube</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Ler em boa companhia muda tudo.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Contato</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Instagram className="h-4 w-4" /> @bookclube</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Comece agora</p>
          <div className="mt-3">
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Criar minha conta</Link>
            </Button>
          </div>
        </div>
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Book Clube. Todos os direitos reservados.
      </p>
    </footer>
  );
}
