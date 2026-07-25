import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Heart,
  Instagram,
  MessageCircle,
  ArrowRight,
  Phone,
  Sparkles,
  BookOpen,
  Users,
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronDown,

  Menu,
  X,
  Play,
  Star,
  MapPin,
  Compass,
  Target,
  Eye,
  BookMarked,
  UserPlus,
  Receipt,
  Mail,
  CheckCircle2,
} from "lucide-react";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoAsset from "@/assets/book-team-logo.png.asset.json";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Book Team — Amor & Honra | Trilhas de leitura cristã" },
      {
        name: "description",
        content:
          "Ministério Book Team: trilhas de leitura, encontros presenciais e uma comunidade que vive amor e honra todos os dias.",
      },
      { property: "og:title", content: "Book Team — Amor & Honra" },
      {
        property: "og:description",
        content:
          "Trilhas de leitura, encontros presenciais e uma comunidade cristã que vive amor e honra.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <HeroQuemSomos />

      <HowItWorks />
      <TrilhasNetflix />
      <JornadaLivros />
      <EventosSection />

      <EventosEspeciais />
      <Testimonials />
      <ContatoEventos />
      <FaqSection />
      <Footer />
    </div>
  );
}

/* ———————————————— HEADER ———————————————— */

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#quem-somos", label: "Quem somos" },
    { href: "#trilhas", label: "Trilhas" },
    { href: "#livros", label: "Livros" },
    { href: "#eventos", label: "Encontros" },
    { href: "#contato", label: "Contato" },
  ];

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "border-b border-border/60 bg-background/85 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={logoAsset.url}
            alt="Book Team"
            className="h-9 w-9 rounded-full ring-1 ring-gold/40"
          />
          <div className="leading-none">
            <p className="font-serif text-[15px] font-semibold tracking-wide">BOOK TEAM</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold">amor & honra</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative text-[15px] font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gold transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-foreground/90 hover:bg-white/5 hover:text-foreground sm:inline-flex"
          >
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="hidden bg-gold text-primary-foreground hover:bg-gold/90 sm:inline-flex"
          >
            <Link to="/auth" search={{ mode: "signup" }}>
              Quero participar
            </Link>
          </Button>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground/80 hover:bg-white/5 hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border/60 pt-3">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild className="flex-1 bg-gold text-primary-foreground hover:bg-gold/90">
                <Link to="/auth" search={{ mode: "signup" }}>Participar</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ———————————————— HERO + QUEM SOMOS (merged) ———————————————— */

function HeroQuemSomos() {
  const pilares = [
    {
      icon: Eye,
      title: "Visão",
      text:
        "Todas as pessoas precisam conhecer o amor de Deus, independente da placa de igreja ou título pessoal.",
    },
    {
      icon: Target,
      title: "Missão",
      text:
        "Mostrar a possibilidade de viver o amor de Deus na sua plenitude, sendo cada um seu Perfeito Eu.",
    },
    {
      icon: Compass,
      title: "Objetivo",
      text:
        "Ajudar homens e mulheres a encontrar sua real identidade em Cristo.",
    },
  ];

  return (
    <section id="quem-somos" className="relative overflow-hidden">
      {/* Ambient glow behind the logo */}
      <div className="absolute inset-x-0 top-0 h-[100vh] bg-gradient-to-b from-background via-background to-background" />
      <div
        className="pointer-events-none absolute left-1/2 top-[38vh] h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.45 0.13 25 / 0.55) 0%, transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[38vh] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.78 0.14 82 / 0.35) 0%, transparent 70%)",
        }}
      />

      {/* ———— HERO ———— */}
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-32 text-center md:px-8 md:pt-40">
        <div className="animate-fade-in flex flex-col items-center">
          <img
            src={logoAsset.url}
            alt="Book Team — Amor & Honra"
            className="h-40 w-40 rounded-full shadow-2xl ring-1 ring-gold/40 md:h-56 md:w-56"
          />

          <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-background/40 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gold backdrop-blur">
            <Sparkles className="h-3 w-3" /> Ministério Book Team
          </span>

          <h1 className="mt-6 max-w-4xl font-serif text-3xl font-semibold leading-[1.1] text-foreground md:text-4xl lg:text-5xl">
            O Ministério Book Team estuda livros cristãos que ensinam Homens e Mulheres a viver uma cultura de{" "}
            <span className="text-gradient-gold italic">amor & honra</span>!
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/75 md:text-[17px]">
            Trilhas de leitura cristã, encontros presenciais e uma comunidade
            que transforma livros em conversas — e conversas em jornada.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 bg-gold px-6 text-[15px] font-semibold text-primary-foreground shadow-glow-gold hover:bg-gold/90"
              >
                <a href="#como-funciona">
                  Quero participar <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-foreground/20 bg-background/30 px-6 text-[15px] text-foreground backdrop-blur hover:bg-background/60"
              >
                <a href="#trilhas">
                  <Play className="mr-2 h-4 w-4" /> Conheça as trilhas
                </a>
              </Button>
            </div>
            <a
              href="#como-funciona"
              aria-label="Ver como funciona"
              className="group mt-2 flex flex-col items-center text-gold/70 transition hover:text-gold"
            >
              <ChevronDown className="h-6 w-6 animate-bounce" />
            </a>
          </div>


          <div className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-white/10 pt-6 text-sm">
            <Stat n="4" label="Trilhas guiadas" />
            <Stat n="+200" label="Participantes" />
            <Stat n="+30" label="Encontros por ano" />
          </div>
        </div>
      </div>

      {/* ———— PILARES: Visão / Missão / Objetivo ———— */}
      <div id="quem-somos" className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 md:px-8 md:pb-32">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            Quem somos
          </span>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {pilares.map((p) => (
            <div
              key={p.title}
              className="group rounded-2xl border border-border/60 bg-card/60 p-6 transition-all hover:border-gold/40 hover:bg-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-primary-foreground">
                <p.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-serif text-lg font-semibold">{p.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/70">
                {p.text}
              </p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="font-serif text-2xl font-semibold text-gold">{n}</p>
      <p className="text-xs uppercase tracking-wider text-foreground/60">{label}</p>
    </div>
  );
}


/* ———————————————— CRONOGRAMA ———————————————— */

/* ———————————————— JORNADA EM LIVROS (Cronograma + Biblioteca — carrossel) ———————————————— */

type JornadaLivro = {
  id: string;
  titulo: string;
  autor: string;
  trilha: string;
  ordem: number;
  total: number;
  imagem_url?: string | null;
  cor: string;
};

function JornadaLivros() {
  const livros: JornadaLivro[] = [
    { id: "b1", titulo: "Mantenha Seu Amor Aceso", autor: "Danny Silk", trilha: "Book Team Básico", ordem: 1, total: 2, cor: "from-[oklch(0.4_0.12_25)] to-[oklch(0.22_0.06_25)]" },
    { id: "b2", titulo: "Cultura da Honra", autor: "Danny Silk", trilha: "Book Team Básico", ordem: 2, total: 2, cor: "from-[oklch(0.38_0.11_20)] to-[oklch(0.2_0.05_20)]" },
    { id: "a1", titulo: "Seu Perfeito Você", autor: "Dra. Caroline Leaf", trilha: "Book Team Avançado", ordem: 1, total: 2, cor: "from-[oklch(0.42_0.1_45)] to-[oklch(0.24_0.05_45)]" },
    { id: "a2", titulo: "Ative Seu Cérebro", autor: "Dra. Caroline Leaf", trilha: "Book Team Avançado", ordem: 2, total: 2, cor: "from-[oklch(0.36_0.09_40)] to-[oklch(0.2_0.04_40)]" },
  ];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section
      id="cronograma"
      className="relative border-t border-border/40 bg-gradient-to-b from-background via-card/30 to-background py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
              Cronograma & Biblioteca
            </span>
            <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">
              Uma jornada em livros
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/70">
              Cada trilha segue uma ordem — para começar o próximo livro, é
              preciso concluir o anterior. Seu histórico registra todo o
              caminho percorrido.
            </p>
          </div>
          <div className="hidden gap-2 md:flex">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/60 text-foreground/80 backdrop-blur transition-all hover:border-gold/40 hover:text-gold"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Próximo"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/60 text-foreground/80 backdrop-blur transition-all hover:border-gold/40 hover:text-gold"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-hidden mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:px-8"
      >
        {livros.map((l) => (
          <JornadaLivroCard key={l.id} l={l} />
        ))}
        <div className="shrink-0 pr-2 md:pr-4" />
      </div>
    </section>
  );
}

function JornadaLivroCard({ l }: { l: JornadaLivroCardProps }) {
  return (
    <article
      className={`group poster-hover relative aspect-[2/3] w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br ${l.cor} shadow-book md:w-[280px]`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />

      {l.imagem_url && (
        <img
          src={l.imagem_url}
          alt={l.titulo}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {/* corações de posição na trilha (topo direito) */}
      <div className="absolute right-3 top-3 flex gap-0.5">
        {Array.from({ length: l.total }).map((_, i) => (
          <Heart
            key={i}
            className={`h-3.5 w-3.5 ${
              i < l.ordem ? "fill-gold text-gold" : "text-white/40"
            }`}
          />
        ))}
      </div>

      {!l.imagem_url && (
        <BookOpen className="absolute left-1/2 top-[38%] h-9 w-9 -translate-x-1/2 text-gold/70" />
      )}

      {/* conteúdo */}
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/90">
          {l.trilha}
        </p>
        <p className="mt-1 font-serif text-xl font-semibold italic leading-tight text-foreground drop-shadow-md">
          {l.titulo}
        </p>
        <p className="mt-1 text-[12px] text-foreground/75">{l.autor}</p>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="text-foreground/60">Livro {l.ordem} de {l.total}</span>
          <span className="text-gold">{l.ordem}/{l.total}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-gold"
            style={{ width: `${(l.ordem / l.total) * 100}%` }}
          />
        </div>
      </div>
    </article>
  );
}

type JornadaLivroCardProps = JornadaLivro;


/* ———————————————— HOW IT WORKS (TIMELINE) ———————————————— */

function HowItWorks() {
  const steps = [
    {
      icon: BookMarked,
      title: "Inicie pelo livro 1",
      desc: "Toda jornada começa no primeiro livro da trilha — a ordem preserva o sentido da leitura.",
    },
    {
      icon: Compass,
      title: "Escolha sua trilha",
      desc: "Selecione entre Básico, Avançado ou os próximos módulos que fazem sentido para você.",
      href: "/auth",
      cta: "Entrar na sua conta",
    },

    {
      icon: UserPlus,
      title: "Faça sua inscrição",
      desc: "Preencha seus dados e reserve sua vaga no próximo encontro presencial.",
    },
    {
      icon: Receipt,
      title: "Pague e envie o comprovante",
      desc: "Faça o PIX e anexe o comprovante direto no seu painel — é rápido e seguro.",
    },
    {
      icon: Mail,
      title: "Aguarde a confirmação",
      desc: "Você receberá no seu e-mail a confirmação e todos os dados da inscrição.",
    },
  ];

  return (
    <section id="como-funciona" className="relative border-t border-border/40 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            Como funciona
          </span>
        </div>

        {/* ——— Timeline horizontal (md+) / vertical (mobile) ——— */}
        <div className="relative mt-16">
          {/* Trilho horizontal */}
          <div className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-gold/0 via-gold/50 to-gold/0 md:block" />
          {/* Trilho vertical (mobile) */}
          <div className="pointer-events-none absolute left-10 top-2 bottom-2 w-px bg-gradient-to-b from-gold/10 via-gold/50 to-gold/10 md:hidden" />

          <ol className="grid gap-8 md:grid-cols-5 md:gap-6">
            {steps.map((s, i) => (
              <li key={s.title} className="group relative pl-24 md:pl-0">
                {/* Nó com logo do Book Team */}
                <span className="absolute left-0 top-0 z-10 flex h-20 w-20 items-center justify-center rounded-full border border-gold/50 bg-background shadow-glow-gold md:relative md:mx-auto md:mb-6">
                  <img
                    src={logoAsset.url}
                    alt="Book Team"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-gold/50 bg-background text-[11px] font-bold text-gold">
                    {i + 1}
                  </span>
                </span>

                <div className="rounded-2xl border border-border/60 bg-card/70 p-5 text-left shadow-book backdrop-blur transition-all group-hover:border-gold/40 md:text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                    Passo {i + 1}
                  </p>
                  <p className="mt-1 font-serif text-lg font-semibold md:text-[17px]">
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/70">
                    {s.desc}
                  </p>
                  {"href" in s && s.href ? (
                    <Link
                      to={s.href}
                      search={{ mode: "signup" }}
                      className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold hover:text-gold/80"
                    >
                      {(s as { cta?: string }).cta ?? "Acessar"} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          {/* Encerramento */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-gold" />
            <p className="text-sm font-medium text-foreground/80">
              Inscrição confirmada — pronto para viver o encontro.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}


/* ———————————————— TRILHAS NETFLIX ———————————————— */

type TrilhaCard = {
  id: string;
  nome: string;
  descricao: string;
  livros: number;
  progresso: number; // 0..livros
  cor: string;
};

function TrilhasNetflix() {
  // Trilhas de exibição na landing (visual). Regras de negócio permanecem intactas no backend.
  const trilhas: TrilhaCard[] = [
    { id: "identidade", nome: "Identidade", descricao: "Descubra quem Deus diz que você é.", livros: 4, progresso: 2, cor: "from-[oklch(0.4_0.12_25)] to-[oklch(0.25_0.08_25)]" },
    { id: "relacionamentos", nome: "Relacionamentos", descricao: "Construa relações saudáveis e verdadeiras.", livros: 5, progresso: 0, cor: "from-[oklch(0.38_0.11_20)] to-[oklch(0.22_0.06_20)]" },
    { id: "proposito", nome: "Propósito", descricao: "Viva com propósito e direção.", livros: 6, progresso: 1, cor: "from-[oklch(0.42_0.1_50)] to-[oklch(0.26_0.05_50)]" },
    { id: "lideranca", nome: "Liderança", descricao: "Inspire, influencie e transforme.", livros: 6, progresso: 3, cor: "from-[oklch(0.36_0.09_40)] to-[oklch(0.22_0.04_40)]" },
    { id: "familia", nome: "Família", descricao: "Fortaleça sua casa, sua base, seu legado.", livros: 4, progresso: 0, cor: "from-[oklch(0.42_0.11_30)] to-[oklch(0.25_0.07_30)]" },
    { id: "fe-carater", nome: "Fé e Caráter", descricao: "Seja cada dia mais parecido com Cristo.", livros: 5, progresso: 4, cor: "from-[oklch(0.35_0.1_15)] to-[oklch(0.2_0.05_15)]" },
  ];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section id="trilhas" className="relative border-t border-border/40 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-end gap-4">

          <div className="hidden gap-2 md:flex">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/60 text-foreground/80 backdrop-blur transition-all hover:border-gold/40 hover:text-gold"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Próximo"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/60 text-foreground/80 backdrop-blur transition-all hover:border-gold/40 hover:text-gold"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-hidden mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:px-8"
      >
        {trilhas.map((t) => (
          <TrilhaCardItem key={t.id} t={t} />
        ))}
        <div className="shrink-0 pr-2 md:pr-4" />
      </div>
    </section>
  );
}

function TrilhaCardItem({ t }: { t: TrilhaCard }) {
  return (
    <Link
      to="/auth"
      search={{ mode: "signup" }}
      className={`group poster-hover relative aspect-[2/3] w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br ${t.cor} shadow-book md:w-[280px]`}
    >
      {/* padrão sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />

      {/* corações de progresso topo direito */}
      <div className="absolute right-3 top-3 flex gap-0.5">
        {Array.from({ length: t.livros }).map((_, i) => (
          <Heart
            key={i}
            className={`h-3.5 w-3.5 ${
              i < t.progresso ? "fill-gold text-gold" : "text-white/40"
            }`}
          />
        ))}
      </div>

      {/* conteúdo */}
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/90">
          Trilha
        </p>
        <p className="mt-1 font-serif text-2xl font-semibold italic leading-tight text-foreground drop-shadow-md">
          {t.nome}
        </p>
        <p className="mt-2 line-clamp-2 text-[12px] text-foreground/80">
          {t.descricao}
        </p>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="text-foreground/60">{t.livros} livros</span>
          {t.progresso > 0 && (
            <span className="text-gold">
              {t.progresso}/{t.livros}
            </span>
          )}
        </div>
        {t.progresso > 0 && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-gold"
              style={{ width: `${(t.progresso / t.livros) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* overlay hover */}
      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
    </Link>
  );
}

/* ———————————————— LIVROS (POSTERS) ———————————————— */


/* ———————————————— ENCONTROS ———————————————— */

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
    <section id="eventos" className="relative border-t border-border/40 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
              Próximos encontros
            </span>
            <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">
              Reserve seu lugar
            </h2>
          </div>
        </div>

        {eventos.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-border/60 bg-card/30 p-14 text-center">
            <Calendar className="mx-auto h-8 w-8 text-gold/70" />
            <p className="mt-4 text-[15px] text-foreground/70">
              Nenhum encontro agendado no momento.
            </p>
            <Button asChild className="mt-6 bg-gold text-primary-foreground hover:bg-gold/90">
              <Link to="/auth" search={{ mode: "signup" }}>
                Quero ser avisado
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {eventos.map((e) => (
              <article
                key={e.id}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-gold/40 hover:shadow-premium"
              >
                <div className="relative flex h-40 items-center justify-center bg-gradient-wine">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(217,164,65,0.2),transparent_60%)]" />
                  <div className="relative text-center">
                    <p className="font-serif text-4xl font-semibold text-foreground">
                      {format(new Date(e.data + "T00:00:00"), "dd", { locale: ptBR })}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">
                      {format(new Date(e.data + "T00:00:00"), "MMM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-lg font-semibold">{e.titulo}</h3>
                  <div className="mt-2 flex items-center gap-1.5 text-[13px] text-foreground/70">
                    <MapPin className="h-3.5 w-3.5" />
                    {[e.cidade, e.local].filter(Boolean).join(" · ")}
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
                      {e.vagas > 0 ? `${e.vagas} vagas` : "Vagas limitadas"}
                    </span>
                    <Button asChild size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90">
                      <Link to="/auth" search={{ mode: "signup" }}>
                        Participar
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ———————————————— EVENTOS ESPECIAIS ———————————————— */

function EventosEspeciais() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-gold/20 gradient-wine p-8 shadow-premium md:p-14">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-black/40 blur-3xl" />

          <div className="relative grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold backdrop-blur">
                <Sparkles className="h-3 w-3" /> Encontros especiais
              </span>
              <h2 className="mt-4 font-serif text-3xl font-semibold text-foreground md:text-4xl">
                Momentos abertos para todos
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-foreground/80">
                Além das trilhas dos livros, promovemos retiros, conferências e
                celebrações abertos ao público — um convite para viver a
                cultura de amor e honra.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild className="bg-gold text-primary-foreground hover:bg-gold/90">
                  <a href="#contato">Reservar um evento</a>
                </Button>
                <Button asChild variant="outline" className="border-foreground/30 bg-transparent text-foreground hover:bg-white/10">
                  <a href="#eventos">Ver agenda</a>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Retiros", icon: Heart },
                { label: "Conferências", icon: Users },
                { label: "Celebrações", icon: Sparkles },
                { label: "Temáticos", icon: Calendar },
              ].map((tag) => (
                <div
                  key={tag.label}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-black/25 backdrop-blur transition-all hover:border-gold/60"
                >
                  <tag.icon className="h-6 w-6 text-gold" />
                  <p className="font-serif text-sm font-semibold text-foreground">{tag.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ———————————————— DEPOIMENTOS ———————————————— */

function Testimonials() {
  const items = [
    { q: "Voltei a ler no ritmo que sempre quis, com gente que topa conversar de verdade.", a: "Marina R.", cidade: "Curitiba - PR", nota: 5 },
    { q: "Os encontros presenciais são o diferencial. Saio de cada um com ideias novas.", a: "Bruno L.", cidade: "São Paulo - SP", nota: 5 },
    { q: "A cultura de honra mudou como eu conduzo meu casamento e meu trabalho.", a: "Camila F.", cidade: "Curitiba - PR", nota: 5 },
  ];
  return (
    <section className="relative border-t border-border/40 bg-gradient-to-b from-card/40 to-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            Depoimentos
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">
            Quem vive, conta
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((i) => (
            <blockquote
              key={i.a}
              className="group relative rounded-3xl border border-border/60 bg-card p-8 transition-all hover:border-gold/30 hover:shadow-premium"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: i.nota }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="mt-5 font-serif text-[17px] italic leading-relaxed text-foreground/90">
                "{i.q}"
              </p>
              <footer className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-wine font-serif text-sm font-semibold text-foreground">
                  {i.a.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{i.a}</p>
                  <p className="text-[11px] text-foreground/60">{i.cidade}</p>
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ———————————————— CONTATO ———————————————— */

function ContatoEventos() {
  const phone = "41 3082-5553";
  const whatsappHref = `https://wa.me/554130825553`;
  return (
    <section id="contato" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
          Contato para eventos
        </span>
        <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">
          Vamos organizar um encontro?
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] text-foreground/70">
          Para agendar um evento, tirar dúvidas sobre próximas datas ou levar
          o Book Team para a sua cidade, fale com a nossa equipe.
        </p>

        <div className="mt-10 inline-flex flex-col items-center gap-5 rounded-3xl border border-gold/20 bg-card px-8 py-7 shadow-premium sm:flex-row sm:gap-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground">
            <Phone className="h-6 w-6" />
          </div>
          <div className="sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/60">
              Eventos
            </p>
            <a
              href="tel:+554130825553"
              className="mt-1 block font-serif text-2xl font-semibold text-foreground md:text-3xl"
            >
              {phone}
            </a>
          </div>
          <Button asChild className="bg-gold text-primary-foreground hover:bg-gold/90 sm:ml-4">
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ———————————————— FAQ ———————————————— */

function FaqSection() {
  const items = [
    { q: "Preciso pagar mensalidade?", a: "Não. Você paga apenas pelos encontros em que se inscrever, via PIX." },
    { q: "Os encontros são online?", a: "Não. Todos os encontros são presenciais. A cidade é indicada em cada evento." },
    { q: "Como recebo o certificado?", a: "Ao concluir uma trilha (todos os encontros com presença registrada), o certificado é emitido pela administração e fica disponível na sua área." },
    { q: "Posso escolher qualquer livro?", a: "As leituras seguem a ordem da trilha escolhida — assim a comunidade caminha junta." },
  ];
  return (
    <section id="faq" className="border-t border-border/40 py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <div className="text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            Perguntas frequentes
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">
            Dúvidas comuns
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-12">
          {items.map((i, idx) => (
            <AccordionItem
              key={idx}
              value={`item-${idx}`}
              className="border-border/60"
            >
              <AccordionTrigger className="text-left text-[15px] font-medium hover:text-gold hover:no-underline">
                {i.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] leading-relaxed text-foreground/70">
                {i.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ———————————————— FOOTER ———————————————— */

function Footer() {
  return (
    <footer className="relative border-t border-border/60 bg-gradient-to-b from-background to-black/50 pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src={logoAsset.url} alt="Book Team" className="h-10 w-10 rounded-full ring-1 ring-gold/40" />
              <div>
                <p className="font-serif text-base font-semibold">BOOK TEAM</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold">amor & honra</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-foreground/70">
              Um ministério cristão que transforma páginas em conversas — e
              conversas em jornada.
            </p>
            <blockquote className="mt-6 border-l-2 border-gold/40 pl-4 font-serif text-sm italic text-foreground/80">
              "Amai-vos cordialmente uns aos outros com amor fraternal,
              preferindo-vos em honra uns aos outros."
              <footer className="mt-1 text-[11px] not-italic text-foreground/50">Romanos 12:10</footer>
            </blockquote>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Navegação</p>
            <ul className="mt-4 space-y-2.5 text-sm text-foreground/70">
              <li><a href="#quem-somos" className="hover:text-foreground">Quem somos</a></li>
              <li><a href="#trilhas" className="hover:text-foreground">Trilhas</a></li>
              <li><a href="#livros" className="hover:text-foreground">Livros</a></li>
              <li><a href="#eventos" className="hover:text-foreground">Encontros</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Contato</p>
            <ul className="mt-4 space-y-2.5 text-sm text-foreground/70">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-gold" /> 41 3082-5553
              </li>
              <li>
                <a href="https://wa.me/554130825553" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground">
                  <MessageCircle className="h-3.5 w-3.5 text-gold" /> WhatsApp
                </a>
              </li>
              <li>
                <a href="https://instagram.com/bookteamamor" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground">
                  <Instagram className="h-3.5 w-3.5 text-gold" /> @bookteamamor
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Comece agora</p>
            <p className="mt-4 text-sm text-foreground/70">
              Crie sua conta e participe do próximo encontro.
            </p>
            <Button asChild className="mt-4 w-full bg-gold text-primary-foreground hover:bg-gold/90">
              <Link to="/auth" search={{ mode: "signup" }}>
                Criar minha conta
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-[11px] text-foreground/50 md:flex-row">
          <p>© {new Date().getFullYear()} Ministério Book Team. Todos os direitos reservados.</p>
          <p>Feito com <Heart className="inline h-3 w-3 fill-gold text-gold" /> em Curitiba - PR</p>
        </div>
      </div>
    </footer>
  );
}
