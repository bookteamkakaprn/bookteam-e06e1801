import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  Compass,
  Target,
  Eye,
  BookMarked,
  UserPlus,
  Receipt,
  Mail,
  CheckCircle2,
} from "lucide-react";

import logoAsset from "@/assets/book-team-logo.png.asset.json";
import capaMantenha from "@/assets/mantenha.jpg.asset.json";
import capaCultura from "@/assets/cultura.jpg.asset.json";
import capaSeuPerfeito from "@/assets/seu-perfeito.jpg.asset.json";
import capaAtive from "@/assets/ative.jpg.asset.json";



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
      <JornadaLivros />

      <EventosEspeciais />
      <Testimonials />
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
    { href: "#cronograma", label: "Livros" },
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

      {/* ———— HERO (split: logo à esquerda, texto à direita) ———— */}
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-12 pt-28 md:grid-cols-2 md:gap-14 md:px-8 md:pt-32 md:pb-16">
        <div className="animate-fade-in flex justify-center md:justify-start">
          <img
            src={logoAsset.url}
            alt="Book Team — Amor & Honra"
            className="h-56 w-56 rounded-full shadow-2xl ring-1 ring-gold/40 md:h-80 md:w-80 lg:h-[22rem] lg:w-[22rem]"
          />
        </div>

        <div className="animate-fade-in flex flex-col items-center text-center md:items-start md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-background/40 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gold backdrop-blur">
            <Sparkles className="h-3 w-3" /> Ministério Book Team
          </span>

          <h1 className="mt-5 font-serif text-2xl font-semibold leading-[1.15] text-foreground md:text-3xl lg:text-4xl">
            O Ministério Book Team estuda livros cristãos que ensinam Homens e Mulheres a viver uma cultura de{" "}
            <span className="text-gradient-gold italic">amor & honra</span>!
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/75 md:text-[17px]">
            Trilhas de leitura cristã, encontros presenciais e uma comunidade
            que transforma livros em conversas — e conversas em jornada.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
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
              <a href="#cronograma">
                <Play className="mr-2 h-4 w-4" /> Conheça os livros
              </a>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-white/10 pt-5 text-sm md:justify-start">
            <Stat n="4" label="Trilhas guiadas" />
            <Stat n="+200" label="Participantes" />
            <Stat n="+30" label="Encontros por ano" />
          </div>
        </div>
      </div>

      {/* ———— PILARES: Visão / Missão / Objetivo ———— */}
      <div id="quem-somos" className="relative mx-auto max-w-7xl px-4 pb-16 pt-4 md:px-8 md:pb-20">
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
    { id: "b1", titulo: "Mantenha Seu Amor Aceso", autor: "Danny Silk", trilha: "Book Team Básico", ordem: 1, total: 2, imagem_url: capaMantenha.url, cor: "from-[oklch(0.4_0.12_25)] to-[oklch(0.22_0.06_25)]" },
    { id: "b2", titulo: "Cultura da Honra", autor: "Danny Silk", trilha: "Book Team Básico", ordem: 2, total: 2, imagem_url: capaCultura.url, cor: "from-[oklch(0.38_0.11_20)] to-[oklch(0.2_0.05_20)]" },
    { id: "a1", titulo: "Seu Perfeito Você", autor: "Dra. Caroline Leaf", trilha: "Book Team Avançado", ordem: 1, total: 2, imagem_url: capaSeuPerfeito.url, cor: "from-[oklch(0.42_0.1_45)] to-[oklch(0.24_0.05_45)]" },
    { id: "a2", titulo: "Ative Seu Cérebro", autor: "Dra. Caroline Leaf", trilha: "Book Team Avançado", ordem: 2, total: 2, imagem_url: capaAtive.url, cor: "from-[oklch(0.36_0.09_40)] to-[oklch(0.2_0.04_40)]" },
  ];

  const { data: trilhaMap } = useQuery({
    queryKey: ["livros-trilha-map"],
    queryFn: async () => {
      const { data } = await supabase.from("livros").select("titulo, trilha_id");
      const m = new Map<string, string>();
      for (const l of data ?? []) m.set(l.titulo, l.trilha_id);
      return m;
    },
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section
      id="cronograma"
      className="relative border-t border-border/40 bg-gradient-to-b from-background via-card/30 to-background py-10 md:py-14"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl font-semibold md:text-3xl">
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
        {livros.map((l) => {
          const trilhaId = trilhaMap?.get(l.titulo);
          const card = <JornadaLivroCard l={l} />;
          return trilhaId ? (
            <Link
              key={l.id}
              to="/trilhas/$id"
              params={{ id: trilhaId }}
              className="shrink-0 snap-start"
            >
              {card}
            </Link>
          ) : (
            <div key={l.id} className="shrink-0 snap-start">{card}</div>
          );
        })}
        <div className="shrink-0 pr-2 md:pr-4" />
      </div>
    </section>
  );
}

function JornadaLivroCard({ l }: { l: JornadaLivroCardProps }) {
  return (
    <article
      className={`group poster-hover relative aspect-[2/3] w-[240px] shrink-0 snap-start overflow-hidden rounded-r-2xl rounded-l-md bg-gradient-to-br ${l.cor} shadow-book md:w-[280px]`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />

      {l.imagem_url && (
        <img
          src={l.imagem_url}
          alt={l.titulo}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {/* lombada do livro (efeito de encadernação à esquerda) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-3 w-px bg-white/10" />

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
    <section id="como-funciona" className="relative border-t border-border/40 py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            Como funciona
          </span>
        </div>

        {/* ——— Timeline horizontal (md+) / vertical (mobile) ——— */}
        <div className="relative mt-10">
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

        </div>

      </div>
    </section>
  );
}

/* ———————————————— LIVROS (POSTERS) ———————————————— */


/* ———————————————— ENCONTROS ———————————————— */

/* ———————————————— EVENTOS ESPECIAIS ———————————————— */

function EventosEspeciais() {
  return (
    <section className="relative py-10 md:py-14">
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
                  <a href="#contato">Falar com a gente</a>
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
    <section className="relative border-t border-border/40 bg-gradient-to-b from-card/40 to-background py-10 md:py-14">
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

/* ———————————————— FAQ ———————————————— */

function FaqSection() {
  const items = [
    { q: "Preciso pagar mensalidade?", a: "Não. Você paga apenas pelos encontros em que se inscrever, via PIX." },
    { q: "Os encontros são online?", a: "Não. Todos os encontros são presenciais. A cidade é indicada em cada evento." },
    { q: "Como recebo o certificado?", a: "Ao concluir uma trilha (todos os encontros com presença registrada), o certificado é emitido pela administração e fica disponível na sua área." },
    { q: "Posso escolher qualquer livro?", a: "As leituras seguem a ordem da trilha escolhida — assim a comunidade caminha junta." },
  ];
  return (
    <section id="faq" className="border-t border-border/40 py-10 md:py-14">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <div className="text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            Perguntas frequentes
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">
            Dúvidas comuns
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-8">
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
              <li><a href="#cronograma" className="hover:text-foreground">Livros</a></li>
              <li><a href="#contato" className="hover:text-foreground">Contato</a></li>
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

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-[11px] text-foreground/50 md:flex-row">
          <p>© {new Date().getFullYear()} Ministério Book Team. Todos os direitos reservados.</p>
          <p>Feito com <Heart className="inline h-3 w-3 fill-gold text-gold" /> em Curitiba - PR</p>
        </div>
      </div>
    </footer>
  );
}
