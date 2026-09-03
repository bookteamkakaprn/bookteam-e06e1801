import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Heart, Instagram, MessageCircle, Phone, Menu, X, Star, Compass, Target, Eye, UserPlus, Users, Award } from "lucide-react";
import logoAsset from "@/assets/book-team-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Book Team — Amor & Honra | Trilhas de leitura cristã" }, { name: "description", content: "Ministério Book Team: trilhas de leitura, encontros presenciais e uma comunidade que vive amor e honra todos os dias." }] }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <HeroSection />
      <VisionSection />
      <HowItWorks />
      <Testimonials />
      <FaqSection />
      <Footer />
    </div>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-500 ${scrolled ? "border-b border-border/60 bg-background/85 backdrop-blur-xl" : "bg-transparent"}`}>
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 md:px-8 lg:flex lg:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img src={logoAsset} alt="Book Team" className="h-9 w-9 shrink-0 rounded-full ring-1 ring-gold/40" />
          <div className="min-w-0 leading-none">
            <p className="truncate font-serif text-[15px] font-semibold tracking-wide">BOOK TEAM</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold">amor & honra</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          <a href="#visao" className="group relative text-[15px] font-medium text-foreground/80 transition-colors hover:text-foreground">Quem somos<span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gold transition-all duration-300 group-hover:w-full" /></a>
          <a href="#como" className="group relative text-[15px] font-medium text-foreground/80 transition-colors hover:text-foreground">Como funciona<span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gold transition-all duration-300 group-hover:w-full" /></a>
          <a href="#faq" className="group relative text-[15px] font-medium text-foreground/80 transition-colors hover:text-foreground">FAQ<span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gold transition-all duration-300 group-hover:w-full" /></a>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden text-foreground/90 hover:bg-white/5 hover:text-foreground sm:inline-flex"><Link to="/auth">Entrar</Link></Button>
          <Button asChild size="sm" className="hidden bg-gold text-primary-foreground hover:bg-gold/90 sm:inline-flex"><Link to="/auth" search={{ mode: "signup" }}>Quero participar</Link></Button>
          <button className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            <a href="#visao" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base font-medium text-foreground/80 hover:bg-white/5 hover:text-foreground">Quem somos</a>
            <a href="#como" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base font-medium text-foreground/80 hover:bg-white/5 hover:text-foreground">Como funciona</a>
            <a href="#faq" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base font-medium text-foreground/80 hover:bg-white/5 hover:text-foreground">FAQ</a>
            <div className="mt-2 flex gap-2 border-t border-border/60 pt-3">
              <Button asChild variant="outline" className="flex-1"><Link to="/auth">Entrar</Link></Button>
              <Button asChild className="flex-1 bg-gold text-primary-foreground hover:bg-gold/90"><Link to="/auth" search={{ mode: "signup" }}>Participar</Link></Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Bem-vindo ao Book Team</span>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">Um ministério que transforma<br /><span className="text-gold">páginas em conversas</span></h1>
          <p className="mt-6 mx-auto max-w-2xl text-base leading-relaxed text-foreground/70 md:text-lg">Somos uma comunidade cristã que acredita que ler é um ato de amor — e que toda conversa nos aproxima mais de Deus e um do outro.</p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-gold text-primary-foreground hover:bg-gold/90"><Link to="/auth" search={{ mode: "signup" }}>Começar agora</Link></Button>
            <Button asChild variant="outline" size="lg"><a href="#como">Conhecer trilhas</a></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function VisionSection() {
  const pilares = [
    { icon: Eye, title: "Visão", text: "Todas as pessoas precisam conhecer o amor de Deus, independente da placa de igreja ou título pessoal." },
    { icon: Target, title: "Missão", text: "Mostrar a possibilidade de viver o amor de Deus na sua plenitude, sendo cada um seu Perfeito Eu." },
    { icon: Compass, title: "Objetivo", text: "Ajudar homens e mulheres a encontrar sua real identidade em Cristo." },
  ];

  return (
    <section id="visao" className="border-t border-border/40 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center mb-12">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Quem somos</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">Nossos pilares</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {pilares.map((p) => {
            const IconComponent = p.icon;
            return (
              <div key={p.title} className="rounded-xl border border-border/40 bg-white/5 p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <IconComponent className="h-8 w-8 text-gold" />
                <h3 className="mt-4 font-serif text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">{p.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: "01", title: "Crie sua conta", desc: "Cadastro simples e rápido em 2 minutos.", icon: UserPlus },
    { num: "02", title: "Escolha uma trilha", desc: "Selecionamos livros transformadores que caminham juntas.", icon: Compass },
    { num: "03", title: "Participe dos encontros", desc: "Discussões presenciais onde aprendemos e crescemos juntas.", icon: Users },
    { num: "04", title: "Receba seu certificado", desc: "Após completar a trilha, seu certificado estará pronto.", icon: Award },
  ];

  return (
    <section id="como" className="border-t border-border/40 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center mb-12">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Como funciona</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">Seu caminho começa aqui</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((step) => {
            const StepIcon = step.icon;
            return (
              <div key={step.num} className="rounded-xl border border-border/40 bg-white/5 p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="text-3xl font-bold text-gold/50">{step.num}</div>
                <StepIcon className="h-6 w-6 text-gold mt-3" />
                <h3 className="mt-4 font-serif text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-foreground/70">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonios = [
    { a: "Mariana Silva", cidade: "Curitiba, PR", nota: 5, q: "Book Team mudou minha forma de ver a comunidade. Cada encontro é uma oportunidade de crescimento espiritual genuíno." },
    { a: "Felipe Santos", cidade: "São Paulo, SP", nota: 5, q: "As trilhas são bem pensadas. Adorei como os livros dialogam com nossas vidas e nos desafiam a amar melhor." },
    { a: "Ana Costa", cidade: "Rio de Janeiro, RJ", nota: 5, q: "Encontrei aqui não apenas uma comunidade leitora, mas uma família que realmente se importa com meu crescimento." },
  ];

  return (
    <section className="border-t border-border/40 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center mb-12">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Depoimentos</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">O que falam sobre nós</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonios.map((i, idx) => (
            <blockquote key={idx} className="rounded-xl border border-border/40 bg-white/5 p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex gap-0.5">
                {Array.from({ length: i.nota }).map((_, idx) => <Star key={idx} className="h-4 w-4 fill-gold text-gold" />)}
              </div>
              <p className="mt-5 font-serif text-sm italic leading-relaxed text-foreground/90">"{i.q}"</p>
              <footer className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold/80 font-serif text-sm font-semibold text-foreground">{i.a.slice(0, 1)}</div>
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

function FaqSection() {
  const items = [
    { q: "Preciso pagar mensalidade?", a: "Não. Você paga apenas pelos encontros em que se inscrever, via PIX." },
    { q: "Os encontros são online?", a: "Não. Todos os encontros são presenciais. A cidade é indicada em cada evento." },
    { q: "Como recebo o certificado?", a: "Ao concluir uma trilha (todos os encontros com presença registrada), o certificado é emitido pela administração." },
    { q: "Posso escolher qualquer livro?", a: "As leituras seguem a ordem da trilha escolhida — assim a comunidade caminha junta." },
  ];

  return (
    <section id="faq" className="border-t border-border/40 py-20">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <div className="text-center mb-12">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Perguntas frequentes</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">Dúvidas comuns</h2>
        </div>
        <Accordion type="single" collapsible>
          {items.map((i, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="border-border/60">
              <AccordionTrigger className="text-left text-[15px] font-medium hover:text-gold hover:no-underline">{i.q}</AccordionTrigger>
              <AccordionContent className="text-[14px] leading-relaxed text-foreground/70">{i.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-border/60 bg-gradient-to-b from-background to-black/50 pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src={logoAsset} alt="Book Team" className="h-10 w-10 rounded-full ring-1 ring-gold/40" />
              <div>
                <p className="font-serif text-base font-semibold">BOOK TEAM</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold">amor & honra</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-foreground/70">Um ministério cristão que transforma páginas em conversas — e conversas em jornada.</p>
            <blockquote className="mt-6 border-l-2 border-gold/40 pl-4 font-serif text-sm italic text-foreground/80">"Amai-vos cordialmente uns aos outros com amor fraternal, preferindo-vos em honra uns aos outros."<footer className="mt-1 text-[11px] not-italic text-foreground/50">Romanos 12:10</footer></blockquote>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Navegação</p>
            <ul className="mt-4 space-y-2.5 text-sm text-foreground/70">
              <li><a href="#visao" className="hover:text-foreground">Quem somos</a></li>
              <li><a href="#como" className="hover:text-foreground">Como funciona</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Contato</p>
            <ul className="mt-4 space-y-2.5 text-sm text-foreground/70">
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gold" />41 3082-5553</li>
              <li><a href="https://wa.me/554130825553" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground"><MessageCircle className="h-3.5 w-3.5 text-gold" />WhatsApp</a></li>
              <li><a href="https://instagram.com/bookteamamor" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground"><Instagram className="h-3.5 w-3.5 text-gold" />@bookteamamor</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Comece agora</p>
            <p className="mt-4 text-sm text-foreground/70">Crie sua conta e participe do próximo encontro.</p>
            <Button asChild className="mt-4 w-full bg-gold text-primary-foreground hover:bg-gold/90"><Link to="/auth" search={{ mode: "signup" }}>Criar minha conta</Link></Button>
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
