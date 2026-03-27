import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { BadgeCheck, ShieldCheck, Sparkles, Star, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// NOTE: This file is intentionally UI-only and uses semantic design tokens.

export type TrustBarItem = {
  src: string;
  alt: string;
  url?: string;
};

export function TrustBarBlockRenderer({
  title,
  logos,
  highlights,
}: {
  title?: string;
  logos: TrustBarItem[];
  highlights?: Array<{ icon?: "sparkles" | "shield" | "check"; label: string }>;
}) {
  const iconFor = (key?: string) => {
    if (key === "shield") return ShieldCheck;
    if (key === "check") return BadgeCheck;
    return Sparkles;
  };

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl">
        {title ? (
          <p className="text-center text-sm text-muted-foreground mb-8">{title}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {logos.map((logo, i) => {
            const img = (
              <img
                loading="lazy"
                src={logo.src}
                alt={logo.alt}
                className="h-8 sm:h-10 opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              />
            );

            return (
              <div key={i} className="px-2">
                {logo.url ? (
                  <a href={logo.url} target="_blank" rel="noreferrer" className="inline-flex">
                    {img}
                  </a>
                ) : (
                  img
                )}
              </div>
            );
          })}
        </div>

        {highlights?.length ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {highlights.map((h, i) => {
              const Icon = iconFor(h.icon);
              return (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur px-4 py-2 shadow-xs"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{h.label}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ServiceCategoriesGridRenderer({
  title,
  subtitle,
  showFromDatabase,
  customItems,
}: {
  title: string;
  subtitle?: string;
  showFromDatabase: boolean;
  customItems?: Array<{ name: string; name_ar?: string; description?: string; url?: string }>;
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ["public-categories-mini"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,name_ar,description")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: showFromDatabase,
  });

  const items = showFromDatabase ? categories : customItems || [];

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h2>
          {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it: any, idx: number) => {
            const label = it?.name_ar || it?.name || it?.label || "تصنيف";
            const desc = it?.description || "";

            const card = (
              <div className="card-elevated p-7 rounded-3xl group transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{label}</h3>
                    {desc ? <p className="text-muted-foreground mt-2 leading-relaxed">{desc}</p> : null}
                  </div>
                  <div className="shrink-0 h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
              </div>
            );

            const url = it?.url;
            return (
              <div key={it?.id ?? idx}>
                {url ? (
                  <Link to={url} className="block">{card}</Link>
                ) : (
                  card
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TestimonialsCarouselRenderer({
  title,
  subtitle,
  showFromDatabase,
  customTestimonials,
}: {
  title: string;
  subtitle?: string;
  showFromDatabase: boolean;
  customTestimonials?: Array<{ name: string; role?: string; content: string; rating?: number }>;
}) {
  const { data: dbTestimonials = [] } = useQuery({
    queryKey: ["public-testimonials-premium"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("name,role,content,rating")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: showFromDatabase,
  });

  const items = (showFromDatabase ? dbTestimonials : customTestimonials || []) as Array<any>;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    direction: "rtl",
  });

  const canScrollPrev = useMemo(() => !!emblaApi?.canScrollPrev(), [emblaApi]);
  const canScrollNext = useMemo(() => !!emblaApi?.canScrollNext(), [emblaApi]);

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h2>
          {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
        </div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-5">
              {items.map((t, idx) => {
                const rating = Math.max(1, Math.min(5, Number(t.rating ?? 5)));
                return (
                  <div
                    key={idx}
                    className="min-w-0 flex-[0_0_90%] sm:flex-[0_0_55%] lg:flex-[0_0_38%]"
                  >
                    <div className="card-glass p-8 rounded-3xl h-full">
                      <div className="flex items-center gap-1 mb-4">
                        {Array.from({ length: rating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                        ))}
                      </div>

                      <p className="text-foreground leading-relaxed mb-6">“{t.content}”</p>

                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold">{t.name}</p>
                          {t.role ? <p className="text-sm text-muted-foreground">{t.role}</p> : null}
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <Sparkles className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center gap-3 mt-8">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
              aria-label="السابق"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
              aria-label="التالي"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PricingCompareRenderer({
  title,
  subtitle,
  plans,
  highlightedIndex,
}: {
  title: string;
  subtitle?: string;
  plans: Array<{ name: string; price: string; period?: string; features: string[]; ctaText: string; ctaLink: string }>;
  highlightedIndex?: number;
}) {
  const hi = typeof highlightedIndex === "number" ? highlightedIndex : 1;

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h2>
          {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {plans.map((p, idx) => {
            const isHighlight = idx === hi;
            return (
              <div
                key={idx}
                className={cn(
                  "relative rounded-3xl border p-8",
                  isHighlight
                    ? "bg-card shadow-xl border-primary/30"
                    : "bg-card/60 backdrop-blur border-border/60"
                )}
              >
                {isHighlight ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold shadow-sm">
                    الأكثر اختياراً
                  </div>
                ) : null}

                <h3 className="text-xl font-bold">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{p.price}</span>
                  {p.period ? <span className="text-muted-foreground">/{p.period}</span> : null}
                </div>

                <ul className="mt-6 space-y-3">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full mt-8" variant={isHighlight ? "default" : "outline"} asChild>
                  <Link to={p.ctaLink}>{p.ctaText}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function FAQProRenderer({
  title,
  subtitle,
  faqs,
  enableSearch,
}: {
  title: string;
  subtitle?: string;
  faqs: Array<{ question: string; answer: string; category?: string }>;
  enableSearch?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(0);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!enableSearch || !qq) return faqs;
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(qq) ||
        f.answer.toLowerCase().includes(qq) ||
        (f.category || "").toLowerCase().includes(qq)
    );
  }, [faqs, q, enableSearch]);

  return (
    <div className="relative">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h2>
          {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
        </div>

        {enableSearch ? (
          <div className="max-w-xl mx-auto mb-8">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في الأسئلة الشائعة…"
            />
          </div>
        ) : null}

        <div className="space-y-3">
          {filtered.map((faq, idx) => {
            const isOpen = open === idx;
            return (
              <div key={idx} className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden">
                <button
                  type="button"
                  className="w-full text-right px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
                  onClick={() => setOpen(isOpen ? null : idx)}
                >
                  <div>
                    {faq.category ? (
                      <div className="text-xs text-muted-foreground mb-1">{faq.category}</div>
                    ) : null}
                    <div className="font-semibold">{faq.question}</div>
                  </div>
                  <ChevronLeft className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "-rotate-90")} />
                </button>

                {isOpen ? (
                  <div className="px-5 pb-5 text-muted-foreground leading-relaxed">{faq.answer}</div>
                ) : null}
              </div>
            );
          })}

          {!filtered.length ? (
            <div className="text-center text-muted-foreground py-10">لا توجد نتائج.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
