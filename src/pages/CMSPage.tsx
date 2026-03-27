import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { BlockRenderer } from "@/components/pagebuilder/BlockRenderer";
import { PageBlock } from "@/components/pagebuilder/BlockTypes";
import { Loader2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";

// Reserved routes that should not be treated as CMS pages
const RESERVED_ROUTES = ["login", "register", "forgot-password", "reset-password", "admin", "client", "freelancer", "freelancer-register", "404"];

interface CMSPageProps {
  slug: string;
  fallbackComponent?: React.ComponentType;
}

export default function CMSPage({ slug, fallbackComponent: FallbackComponent }: CMSPageProps) {
  const { data: page, isLoading, error } = useQuery({
    queryKey: ["cms-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      // NOTE: if the CMS page doesn't exist, return null so we can render fallback immediately
      if (error) throw error;
      return data ?? null;
    },
    retry: 0,
  });

  if (isLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),transparent_70%)]" />
          <div className="absolute -bottom-40 left-0 w-72 h-72 rounded-3xl bg-primary/10 blur-3xl" />
          <div className="absolute -top-32 right-0 w-64 h-64 rounded-3xl bg-accent/10 blur-3xl" />
        </div>

        <div className="relative z-10 text-center px-6">
          <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-8 shadow-2xl animate-scale-in">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-5" />
            <p className="text-xs uppercase tracking-[0.22em] text-primary/70 mb-2">
              Sity Experts
            </p>
            <p className="text-lg font-semibold bg-gradient-to-l from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-shift mb-2">
              بنجهّز الصفحة لك الآن
            </p>
            <p className="text-sm text-muted-foreground">
              جاري التحميل...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If page not found or not published, show fallback or 404
  if (error || !page) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return (
      <div className="min-h-screen bg-background">
        <DynamicNavbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
          <p className="text-xl text-muted-foreground mb-8">الصفحة غير موجودة أو غير منشورة</p>
        </div>
        <DynamicFooter />
      </div>
    );
  }

  const blocks = (page.page_blocks as unknown) as PageBlock[] | null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={page.meta_title || page.title_ar || page.title}
        description={page.meta_description || undefined}
        path={`/${page.slug}`}
        ogImage={page.og_image || undefined}
        schemaType={page.schema_type || "WebPage"}
        schema={{
          name: page.title_ar || page.title,
          ...(page.meta_description ? { description: page.meta_description } : {}),
        }}
      />

      <DynamicNavbar />
      
      <main>
        {blocks && blocks.length > 0 ? (
          blocks.map((block, index) => (
            <div 
              key={block.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <BlockRenderer block={block} isPreview={false} />
            </div>
          ))
        ) : (
          <div className="container mx-auto px-4 py-32 text-center">
            <p className="text-muted-foreground">هذه الصفحة لا تحتوي على محتوى بعد</p>
            <p className="text-sm text-muted-foreground mt-2">يمكن للأدمن إضافة محتوى من Page Builder</p>
          </div>
        )}
      </main>

      <DynamicFooter />
    </div>
  );
}

// Wrapper for dynamic slug pages
export function DynamicCMSPage() {
  const { slug } = useParams();

  // Check if this is a reserved route
  if (slug && RESERVED_ROUTES.some(r => slug.startsWith(r))) {
    return <Navigate to="/404" replace />;
  }

  return <CMSPage slug={slug || ""} />;
}
