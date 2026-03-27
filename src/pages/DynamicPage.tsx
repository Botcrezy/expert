import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { BlockRenderer } from "@/components/pagebuilder/BlockRenderer";
import { PageBlock } from "@/components/pagebuilder/BlockTypes";
import { Loader2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";

// Reserved routes that should not be treated as dynamic pages
const RESERVED_ROUTES = ["services", "pricing", "how-it-works", "faq", "freelancers", "login", "register", "forgot-password", "reset-password", "admin", "client", "freelancer", "freelancer-register", "404"];

export default function DynamicPage() {
  const { slug } = useParams();

  // Check if this is a reserved route
  if (slug && RESERVED_ROUTES.some(r => slug.startsWith(r))) {
    return <Navigate to="/404" replace />;
  }

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["cms-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-background">
        <DynamicNavbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-muted-foreground">الصفحة غير موجودة</p>
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
          blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} isPreview={false} />
          ))
        ) : (
          <div className="container mx-auto px-4 py-32 text-center">
            <p className="text-muted-foreground">هذه الصفحة لا تحتوي على محتوى بعد</p>
          </div>
        )}
      </main>

      <DynamicFooter />
    </div>
  );
}
