import { Link } from "react-router-dom";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Heart, ArrowUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { forwardRef, useEffect, useState } from "react";
import { toast } from "sonner";

interface FooterSettings {
  design_variant: string;
  showSocial: boolean;
  showNewsletter: boolean;
  showContactInfo: boolean;
  columns: number;
}

const socialIcons: Record<string, any> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

export const DynamicFooter = forwardRef<HTMLElement, Record<string, never>>(function DynamicFooter(_props, ref) {
  const { data: settings } = usePlatformSettings();
  const { user } = useAuth();
  const [email, setEmail] = useState("");

  // Fetch social links from site_settings
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-footer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .in("key", ["social_links", "contact_info"]);
      const result: Record<string, any> = {};
      data?.forEach((s: any) => {
        result[s.key] = s.value;
      });
      return result;
    },
  });

  const socialLinks = siteSettings?.social_links || {};
  const contactInfo = siteSettings?.contact_info || {};

  // Fetch footer design settings
  const { data: footerDesign } = useQuery({
    queryKey: ["dynamic-footer-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("header_footer_settings")
        .select("*")
        .eq("setting_type", "footer")
        .eq("is_active", true)
        .maybeSingle();
      return (data?.settings as unknown as FooterSettings) || null;
    },
  });

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("footer-settings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "header_footer_settings" }, () => window.location.reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => window.location.reload())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const showSocial = footerDesign?.showSocial ?? true;
  const showNewsletter = footerDesign?.showNewsletter ?? true;
  const showContactInfo = footerDesign?.showContactInfo ?? true;
  const designVariant = footerDesign?.design_variant ?? "default";

  // Fetch footer navigation items
  const { data: footerItems = [] } = useQuery({
    queryKey: ["nav-items-footer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("navigation_items")
        .select("*")
        .eq("location", "footer")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  // Fetch dynamic pages
  const { data: pages = [] } = useQuery({
    queryKey: ["footer-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("slug, title_ar").eq("is_published", true).limit(6);
      return data || [];
    },
  });

  // Newsletter subscription mutation
  const subscribeMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.from("newsletter_subscribers").insert({ email, source: "footer" });
      if (error) {
        if (error.code === "23505") {
          throw new Error("already_subscribed");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم الاشتراك بنجاح!");
      setEmail("");
    },
    onError: (error: any) => {
      if (error.message === "already_subscribed") {
        toast.info("أنت مشترك بالفعل في النشرة البريدية");
      } else {
        toast.error("حدث خطأ، يرجى المحاولة مرة أخرى");
      }
    },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    subscribeMutation.mutate(email);
  };

  const defaultQuickLinks = [
    { label_ar: "الخدمات", url: "/services", visibility: "all" },
    { label_ar: "الأسعار", url: "/pricing", visibility: "all" },
    { label_ar: "كيف نعمل", url: "/how-it-works", visibility: "all" },
    { label_ar: "الأسئلة الشائعة", url: "/faq", visibility: "all" },
  ];

  // Filter items based on visibility
  const filterByVisibility = (items: any[]) => {
    return items.filter((item: any) => {
      const visibility = item.visibility || "all";
      if (visibility === "all") return true;
      if (visibility === "guest" && !user) return true;
      if (visibility === "authenticated" && user) return true;
      return false;
    });
  };

  const quickLinks = filterByVisibility(footerItems.length > 0 ? footerItems : defaultQuickLinks);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      ref={ref}
      className={cn(
        "relative border-t",
        designVariant === "dark" ? "bg-gray-900 text-gray-100" : designVariant === "minimal" ? "bg-background" : "bg-gradient-to-b from-muted/30 to-muted/50"
      )}
    >
      {/* Decorative Top Border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  className="w-12 h-12 rounded-2xl object-contain transition-transform group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                  <span className="text-primary-foreground font-bold text-xl">{settings?.siteName?.charAt(0) || "S"}</span>
                </div>
              )}
              <span className="font-bold text-xl">{settings?.siteName || "Sity Experts"}</span>
            </Link>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {settings?.siteDescription || "منصة خدمات مُدارة باحترافية عالية، نوفر لك أفضل الخبراء لإنجاز مشاريعك."}
            </p>

            {/* Social Links - Dynamic from Admin Settings */}
            {showSocial && (
              <div className="flex gap-2">
                {Object.entries(socialLinks)
                  .filter(([_, url]) => url)
                  .map(([social, url]) => {
                    const Icon = socialIcons[social] || Facebook;
                    return (
                      <a
                        key={social}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          designVariant === "dark"
                            ? "bg-white/10 hover:bg-primary hover:text-primary-foreground"
                            : "bg-muted hover:bg-primary hover:text-primary-foreground hover:scale-110 hover:shadow-lg"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              روابط سريعة
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((item: any, index: number) => (
                <li key={index}>
                  <Link to={item.url} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                    {item.label_ar || item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pages */}
          <div>
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              صفحات
            </h3>
            <ul className="space-y-3">
              {pages.map((page: any) => (
                <li key={page.slug}>
                  <Link
                    to={`/${page.slug}`}
                    className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                    {page.title_ar}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter & Contact */}
          <div>
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              تواصل معنا
            </h3>

            {showContactInfo && settings?.supportEmail && (
              <a
                href={`mailto:${settings.supportEmail}`}
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors mb-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm">{settings.supportEmail}</span>
              </a>
            )}

            {/* Newsletter */}
            {showNewsletter && (
              <form onSubmit={handleSubscribe} className="mt-6">
                <p className="text-sm text-muted-foreground mb-3">اشترك في النشرة البريدية</p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="بريدك الإلكتروني"
                    className="rounded-xl h-11"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    type="submit"
                    className="rounded-xl h-11 px-4 shadow-lg shadow-primary/20"
                    disabled={subscribeMutation.isPending}
                  >
                    {subscribeMutation.isPending ? <span className="animate-spin">⏳</span> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              © {new Date().getFullYear()} {settings?.siteName || "Sity Experts"}.
              <span className="hidden sm:inline">جميع الحقوق محفوظة.</span>
              <Heart className="w-4 h-4 text-primary mx-1 inline" />
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-primary transition-colors">
                سياسة الخصوصية
              </Link>
              <Link to="/terms" className="hover:text-primary transition-colors">
                الشروط والأحكام
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl w-10 h-10 hover:bg-primary hover:text-primary-foreground"
                onClick={scrollToTop}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});
