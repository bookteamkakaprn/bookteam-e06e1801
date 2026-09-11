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
import { Card, CardContent } from "@/components/ui/card";
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
  Clock,
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

// Logo agora está em public/book-team-logo.png (caminho público)
const logoUrl = "/book-team-logo.png";
import capaMantenha from "@/assets/mantenha.jpg.asset.json";
import capaCultura from "@/assets/cultura.jpg.asset.json";
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
      <LivrosComplementares />

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

  const navItems = [
    { type: "anchor" as const, href: "#quem-somos", label: "Quem somos" },
    { type: "anchor" as const, href: "#cronograma", label: "Livros" },
    { type: "anchor" as const, href: "#eventos", label: "Encontros" },
    { type: "route" as const, to: "/inicio", label: "Área do aluno" },
    { type: "route" as const, to: "/admin", label: "Área administrativa" },
  ] as const;

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "border-b border-border/60 bg-background/85 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 md:px-8 lg:flex lg:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src={logoUrl}
            alt="Book Team"
            className="h-9 w-9 shrink-0 rounded-full ring-1 ring-gold/40"
          />
          <div className="min-w-0 leading-none">
            <p className="truncate font-serif text-[15px] font-semibold tracking-wide">BOOK TEAM</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold">amor & honra</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) =>
            item.type === "anchor" ? (
              <a
                key={item.href}
                href={item.href}
                className="group relative text-[15px] font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gold transition-all duration-300 group-hover:w-full" />
              </a>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className="group relative text-[15px] font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gold transition-all duration-300 group-hover:w-full" />
              </Link>
            )
          )}
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
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground lg:hidden"
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
            {navItems.map((item) =>
              item.type === "anchor" ? (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-foreground/80 hover:bg-white/5 hover:text-foreground"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-foreground/80 hover:bg-white/5 hover:text-foreground"
                >
                  {item.label}
                </Link>
              )
            )}
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
            src={logoUrl}
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

          {/* Stats removed per user request */}
        </div>
      </div>

      {/* ———— PILARES: Visão / Missão / Objetivo ———— */}
      <div id="quem-somos" className="relative mx-auto max-w-7xl px-4 pb-8 pt-4 md:px-8 md:pb-10">
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
  nivel_nome?: string | null;
  cor: string;
};

function JornadaLivros() {
  const { data: livrosDb = [], isLoading, isError } = useQuery({
    queryKey: ["livros-jornada-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: niveis = [] } = useQuery({
    queryKey: ["niveis-jornada-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("niveis_trilha")
        .select("id, nome");

      if (error) throw error;
      return data || [];
    },
  });

  /*
   * A jornada precisa aparecer mesmo antes de todos os livros/capas
   * serem cadastrados no Supabase. Por isso usamos uma estrutura-base
   * de 10 posições e mesclamos os dados cadastrados no banco.
   *
   * Quando o ADM cadastrar o livro ou enviar a capa, o conteúdo do
   * Supabase passa a ocupar automaticamente a posição correspondente.
   */
  const jornadaBase = [
    { ordem: 1, titulo: "Mantenha Seu Amor Aceso", autor: "", categoria: "Jornada", imagem_url: null },
    { ordem: 2, titulo: "Cultura da Honra", autor: "", categoria: "Jornada", imagem_url: null },
    { ordem: 3, titulo: "Livro 3", autor: "", categoria: "Jornada", imagem_url: null },
    { ordem: 4, titulo: "Livro 4", autor: "", categoria: "Jornada", imagem_url: null },
    { ordem: 5, titulo: "Organize a Sua Desordem Mental", autor: "", categoria: "Jornada", imagem_url: null },
    { ordem: 6, titulo: "O Despertar da Leoa", autor: "", categoria: "Jornada", imagem_url: null },
    { ordem: 7, titulo: "Livro 7", autor: "", categoria: "Jornada", imagem_url: null },
    { ordem: 8, titulo: "Os Caminhos Sobrenaturais da Realeza", autor: "", categoria: "Jornada", imagem_url: null },
    { ordem: 9, titulo: "O Poder Sobrenatural de uma Mente Transformada", autor: "", categoria: "Jornada", imagem_url: null },
    { ordem: 10, titulo: "Impunível", autor: "Danny Silk", categoria: "Jornada", imagem_url: null },
  ];

  const livrosPorOrdem = new Map<number, any>();
  for (const livro of livrosDb) {
    const ordem = Number(livro.ordem);
    if (Number.isFinite(ordem) && ordem >= 1 && ordem <= 10) {
      livrosPorOrdem.set(ordem, livro);
    }
  }

  const livros: JornadaLivro[] = jornadaBase.map((base, idx) => {
    const livroDb = livrosPorOrdem.get(base.ordem);

    return {
      id: livroDb?.id ?? `placeholder-${base.ordem}`,
      titulo: livroDb?.titulo || base.titulo,
      autor: livroDb?.autor || base.autor,
      trilha: livroDb?.categoria || base.categoria,
      ordem: base.ordem,
      total: 10,
      imagem_url: livroDb?.imagem_url || livroDb?.capa_url || base.imagem_url,
      nivel_nome:
        niveis.find((nivel) => nivel.id === livroDb?.nivel_id)?.nome ??
        null,
      cor:
        idx % 2 === 0
          ? "from-[oklch(0.4_0.12_25)] to-[oklch(0.22_0.06_25)]"
          : "from-[oklch(0.38_0.11_20)] to-[oklch(0.2_0.05_20)]",
    };
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
      className="relative border-t border-border/40 bg-gradient-to-b from-background via-card/30 to-background py-16 md:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl font-semibold md:text-3xl">
              JORNADA BOOK TEAM
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/60 text-foreground/80 backdrop-blur transition-all hover:border-gold/40 hover:text-gold"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Próximo"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/60 text-foreground/80 backdrop-blur transition-all hover:border-gold/40 hover:text-gold"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-r-2xl rounded-l-md bg-gradient-to-br from-white/10 to-white/5"
              />
            ))}
          </div>
        )}

        {isError && (
          <p className="mt-6 text-sm text-muted-foreground">
            Não foi possível carregar os dados cadastrados. A estrutura da
            jornada continua disponível para inscrição.
          </p>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-hidden mt-8 flex touch-pan-x snap-x snap-proximity gap-4 scroll-pl-4 overflow-x-auto overscroll-x-contain px-4 pb-4 [-webkit-overflow-scrolling:touch] md:scroll-pl-8 md:gap-8 md:px-8"
      >
        {!isLoading &&
          livros.map((l) => {
            const cadastradoNoBanco = !l.id.startsWith("placeholder-");

            const card = <JornadaLivroCard l={l} />;

            if (cadastradoNoBanco) {
              return (
                <Link
                  key={l.id}
                  to="/livros/$id"
                  params={{ id: l.id }}
                  className="shrink-0 snap-start rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/70"
                  aria-label={`Abrir ${l.titulo}`}
                >
                  {card}
                </Link>
              );
            }

            return (
              <a
                key={l.id}
                href="/auth?mode=signup&area=aluno"
                className="shrink-0 snap-start rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/70"
                aria-label={`Iniciar inscrição para ${l.titulo}`}
              >
                {card}
              </a>
            );
          })}

        <div className="shrink-0 pr-4 md:pr-8" />
      </div>
    </section>
  );
}

function JornadaLivroCard({ l }: { l: JornadaLivroCardProps }) {
  const isPlaceholder = l.id.startsWith("placeholder-");

  return (
    <article
      className={`group poster-hover relative aspect-[2/3] w-[58vw] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-r-2xl rounded-l-md bg-gradient-to-br ${l.cor} shadow-book transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium sm:w-[200px] md:w-[240px] lg:w-[280px]`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />

      {l.imagem_url || l.capa_url ? (
        <img
          src={l.imagem_url || l.capa_url}
          alt={l.titulo}
          loading="lazy"
          onError={(e) => {
            console.error(`Erro ao carregar imagem: ${l.imagem_url || l.capa_url}`);
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black/10 via-white/[0.03] to-black/30 px-5 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-gold/30 bg-black/20 shadow-inner">
            <BookOpen className="h-9 w-9 text-gold/80" />
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">
            Capa em breve
          </p>
          <p className="mt-1 text-[11px] text-foreground/50">
            Clique para continuar
          </p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

      <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-3 w-px bg-white/10" />

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

      <div className="absolute left-3 top-3 rounded-full border border-gold/30 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-gold backdrop-blur">
        {l.nivel_nome || "Nível"}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/90">
          {l.trilha}
        </p>
        <p className="mt-1 flex h-[2.5em] items-end line-clamp-2 font-serif text-lg font-semibold italic leading-tight text-foreground drop-shadow-md md:text-xl">
          {l.titulo}
        </p>
        {l.autor && (
          <p className="mt-1 truncate text-[12px] text-foreground/75">{l.autor}</p>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="text-foreground/70">
            {isPlaceholder ? "Disponível para inscrição" : "Ver detalhes e inscrição"}
          </span>
          <ArrowRight className="h-4 w-4 text-gold transition-transform group-hover:translate-x-1" />
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
    <section id="como-funciona" className="relative border-t border-border/40 py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="max-w-2xl">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold/80">
            Como funciona
          </span>
        </div>

        {/* ——— Timeline horizontal (md+) / vertical (mobile) ——— */}
        <div className="relative mt-5">
          {/* Trilho horizontal */}
          <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0 md:block" />
          {/* Trilho vertical (mobile) */}
          <div className="pointer-events-none absolute left-7 top-2 bottom-2 w-px bg-gradient-to-b from-gold/10 via-gold/30 to-gold/10 md:hidden" />

          <ol className="grid gap-4 md:grid-cols-4 md:gap-3">
            {steps.map((s, i) => (
              <li key={s.title} className="group relative pl-16 md:pl-0">
                {/* Nó com logo do Book Team */}
                <span className="absolute left-0 top-0 z-10 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-background shadow-glow-gold md:relative md:mx-auto md:mb-3">
                  <img
                    src={logoUrl}
                    alt="Book Team"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-gold/40 bg-background text-[9px] font-bold text-gold">
                    {i + 1}
                  </span>
                </span>

                <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center shadow-book backdrop-blur transition-all group-hover:border-gold/30 animate-fade-in" style={{animationDelay: `${i * 200}ms`}}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-gold/70">
                    Passo {i + 1}
                  </p>
                  <p className="mt-0.5 font-serif text-sm font-semibold md:text-[15px]">
                    {s.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-foreground/60">
                    {s.desc}
                  </p>
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

/* ———————————————— LIVROS COMPLEMENTARES ———————————————— */

function LivrosComplementares() {
  const { data: livros = [], isLoading } = useQuery({
    queryKey: ["livros-complementares"],
    queryFn: async () => {
      // Primeiro buscar a trilha "Cursos Complementares"
      const { data: trilhas, error: trilhaError } = await supabase
        .from("trilhas")
        .select("id")
        .ilike("nome", "%Cursos Complementares%")
        .single();

      if (trilhaError || !trilhas) {
        console.log("Trilha não encontrada");
        return [];
      }

      // Depois buscar livros dessa trilha (order by ordem, depois by id para consistência)
      const { data, error } = await supabase
        .from("livros")
        .select("id, titulo, autor, imagem_url, capa_url, status, ordem")
        .eq("trilha_id", trilhas.id)
        .eq("status", "ativo")  // Apenas livros ativos
        .order("ordem", { ascending: true, nullsLast: true })
        .order("id", { ascending: true })
        .limit(50);  // Aumentado para 50 para garantir que pega todos

      if (error) {
        console.error("Erro buscando complementares:", error);
        throw error;
      }
      
      // Debug: Log de quantos livros foram encontrados
      console.log(`Livros complementares encontrados: ${data?.length || 0}`);
      
      return data || [];
    },
  });

  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="relative border-t border-border/40 bg-gradient-to-b from-background via-card/30 to-background py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl font-semibold md:text-3xl">
              LIVROS COMPLEMENTARES
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/60 text-foreground/80 backdrop-blur transition-all hover:border-gold/40 hover:text-gold"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Próximo"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/60 text-foreground/80 backdrop-blur transition-all hover:border-gold/40 hover:text-gold"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-r-2xl rounded-l-md bg-gradient-to-br from-white/10 to-white/5"
              />
            ))}
          </div>
        )}

        {!isLoading && livros.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            Livros complementares em breve.
          </p>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-hidden mt-8 flex touch-pan-x snap-x snap-proximity gap-4 scroll-pl-4 overflow-x-auto overscroll-x-contain px-4 pb-4 [-webkit-overflow-scrolling:touch] md:scroll-pl-8 md:gap-8 md:px-8"
      >
        {!isLoading &&
          livros.map((livro) => (
            <Link
              key={livro.id}
              to="/livros/$id"
              params={{ id: livro.id }}
              className="shrink-0 snap-start rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/70"
              aria-label={`Abrir ${livro.titulo}`}
            >
              <LivroComplementarCard livro={livro} />
            </Link>
          ))}
        <div className="shrink-0 pr-4 md:pr-8" />
      </div>
    </section>
  );
}

function LivroComplementarCard({
  livro,
}: {
  livro: { id: string; titulo: string; autor: string | null; imagem_url: string | null; capa_url: string | null };
}) {
  // Debug: Log se a capa não está preenchida
  if (!livro.imagem_url && !livro.capa_url) {
    console.warn(`⚠️ Livro SEM CAPA no banco: "${livro.titulo}" (ID: ${livro.id}) - Preencha imagem_url em Supabase`);
  } else {
    console.log(`✅ Livro com capa: "${livro.titulo}" → ${livro.imagem_url || livro.capa_url}`);
  }
  
  // Validar que a URL é válida (deve começar com http)
  const capaValida = (url: string | null): boolean => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
  };
  
  const capa = capaValida(livro.imagem_url) ? livro.imagem_url : capaValida(livro.capa_url) ? livro.capa_url : null;

  return (
    <article className="group poster-hover relative aspect-[2/3] w-[58vw] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-r-2xl rounded-l-md bg-gradient-to-br from-[oklch(0.4_0.12_25)] to-[oklch(0.22_0.06_25)] shadow-book transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium sm:w-[200px] md:w-[240px] lg:w-[280px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />

      {capa ? (
        <img
          src={capa}
          alt={livro.titulo}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black/10 via-white/[0.03] to-black/30 px-5 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-gold/30 bg-black/20 shadow-inner">
            <BookOpen className="h-9 w-9 text-gold/80" />
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">
            Capa em breve
          </p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

      <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
        <h3 className="text-sm font-semibold line-clamp-2">{livro.titulo}</h3>
        {livro.autor && (
          <p className="mt-1 text-[11px] text-white/70 line-clamp-1">{livro.autor}</p>
        )}
      </div>
    </article>
  );
}

/* ———————————————— DEPOIMENTOS ———————————————— */

function Testimonials() {
  const { data: depoimentos = [] } = useQuery({
    queryKey: ["depoimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depoimentos")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        nome: string;
        cargo: string;
        depoimento: string;
        imagem_url: string | null;
      }>;
    },
  });

  if (depoimentos.length === 0) return null;

  return (
    <section className="space-y-12 bg-muted/30 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-4xl font-bold">O que as pessoas falam</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Histórias reais de quem faz parte da comunidade Book Team
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2">
        {depoimentos.map((dep) => (
          <Card key={dep.id} className="border-none bg-background shadow-sm">
            <CardContent className="space-y-4 p-6">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-sm italic text-muted-foreground">"{dep.depoimento}"</p>
              <div className="border-t pt-4">
                <p className="font-bold">{dep.nome}</p>
                <p className="text-xs text-muted-foreground">{dep.cargo}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ———————————————— FAQ ———————————————— */

function FaqSection() {
  const { data: faqs = [] } = useQuery({
    queryKey: ["faq"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        pergunta: string;
        resposta: string;
      }>;
    },
  });

  if (faqs.length === 0) return null;

  return (
    <section className="space-y-12 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-4xl font-bold">Perguntas Frequentes</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Tire suas dúvidas sobre o Book Team
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                {f.pergunta}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {f.resposta}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ———————————————— EVENTOS ESPECIAIS ———————————————— */

function EventosEspeciais() {
  const [mesSelecionado, setMesSelecionado] = useState(new Date());
  
  // Calcular início e fim do mês
  const primeiroDia = new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth(), 1);
  const ultimoDia = new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth() + 1, 0);
  const dataInicio = primeiroDia.toISOString().slice(0, 10);
  const dataFim = ultimoDia.toISOString().slice(0, 10);
  const nomeMes = mesSelecionado.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  
  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos-home", mesSelecionado.toISOString().slice(0, 7)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("id, titulo, data, hora, local, categoria, vagas, valor")
        .is("livro_id", null)
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", { ascending: true })
        .limit(8);

      if (error) throw error;
      return data || [];
    },
  });

  const formatarData = (data: string) => {
    const d = new Date(data + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "Homens": "bg-blue-500/20 border-blue-500/40",
      "Mulheres": "bg-pink-500/20 border-pink-500/40",
      "Mulheres solteiras": "bg-rose-500/20 border-rose-500/40",
      "Misto": "bg-purple-500/20 border-purple-500/40",
      "Família": "bg-green-500/20 border-green-500/40",
      "Ministério (Staff)": "bg-amber-500/20 border-amber-500/40",
    };
    return colors[category] || "bg-gold/10 border-gold/20";
  };

  return (
    <section className="relative py-8 md:py-10">
      <div id="eventos" className="absolute -top-24" />
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        {/* Título */}
        <div className="mb-6 text-center md:text-left">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-1">
            Momentos para todos
          </h2>
          <p className="text-xs md:text-sm text-foreground/60">Próximos encontros</p>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center justify-between mb-6 rounded-lg border border-border/40 bg-card/30 p-3">
          <button 
            onClick={() => setMesSelecionado(new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth() - 1, 1))}
            className="flex items-center gap-1 text-sm hover:text-gold transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          <h3 className="font-serif text-sm md:text-base font-semibold capitalize">{nomeMes}</h3>
          <button 
            onClick={() => setMesSelecionado(new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth() + 1, 1))}
            className="flex items-center gap-1 text-sm hover:text-gold transition-colors"
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Grid POST-IT */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-32 rounded-lg bg-black/20 animate-pulse" />
            ))}
          </div>
        ) : eventos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {eventos.map((evento) => (
              <Link
                key={evento.id}
                to={`/eventos`}
                className={`group relative p-3 rounded-lg border transition-all hover:shadow-lg hover:scale-105 cursor-pointer ${getCategoryColor(evento.categoria || "")}`}
              >
                {/* Checkbox simulado */}
                <div className="absolute top-2 right-2 w-4 h-4 rounded border border-gold/40 group-hover:bg-gold/20" />

                <div className="space-y-2 pr-6">
                  {/* Data grande */}
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-lg font-bold text-gold">
                      {new Date(evento.data + "T00:00:00").getDate()}
                    </span>
                    <span className="text-xs text-foreground/70">
                      {formatarData(evento.data).split(" ")[1]}
                    </span>
                  </div>

                  {/* Título */}
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                    {evento.titulo}
                  </h3>

                  {/* Hora */}
                  {evento.hora && (
                    <p className="text-[10px] text-foreground/70 flex items-center gap-1">
                      🕐 {evento.hora}
                    </p>
                  )}

                  {/* Local */}
                  {evento.local && (
                    <p className="text-[10px] text-foreground/70 line-clamp-1">
                      📍 {evento.local}
                    </p>
                  )}

                  {/* Badge */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {evento.valor === 0 && (
                      <span className="text-[9px] font-semibold text-green-400 bg-green-500/30 px-1.5 py-0.5 rounded">
                        Grátis
                      </span>
                    )}
                    {evento.vagas && (
                      <span className="text-[9px] text-gold/70">
                        {evento.vagas} vagas
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-foreground/60">Nenhum evento disponível no momento</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ———————————————— CONTATO ———————————————— */

/* ———————————————— FOOTER ———————————————— */

function Footer() {
  const { data: config } = useQuery({
    queryKey: ["config-geral"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_geral")
        .select("instagram, whatsapp, email, endereco, telefone")
        .eq("id", "1")
        .single();
      if (error) return null;
      return data;
    },
  });

  const telefonePadrao = config?.telefone || "41 3082-5553";
  const whatsappPadrao = config?.whatsapp || "554130825553";
  const instagramPadrao = config?.instagram || "bookteamamor";
  const emailPadrao = config?.email || "contato@bookteam.com.br";

  return (
    <footer className="relative border-t border-border/60 bg-gradient-to-b from-background to-black/50 pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="Book Team" className="h-10 w-10 rounded-full ring-1 ring-gold/40" />
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
                <Phone className="h-3.5 w-3.5 text-gold" /> {telefonePadrao}
              </li>
              <li>
                <a href={`https://wa.me/${whatsappPadrao}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground">
                  <MessageCircle className="h-3.5 w-3.5 text-gold" /> WhatsApp
                </a>
              </li>
              <li>
                <a href={`https://instagram.com/${instagramPadrao}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground">
                  <Instagram className="h-3.5 w-3.5 text-gold" /> @{instagramPadrao}
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
