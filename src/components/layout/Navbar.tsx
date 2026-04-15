import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import platformLogo from "@/assets/logo.jpg";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: settings } = usePlatformSettings();

  // Fetch dynamic menu pages
  const { data: menuPages = [] } = useQuery({
    queryKey: ["menu-pages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("slug, title_ar")
        .eq("is_published", true)
        .eq("is_in_menu", true)
        .order("menu_order");
      return data || [];
    },
  });

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={settings?.logoUrl || platformLogo} 
              alt={settings?.siteName || "Sity Experts"} 
              className="w-11 h-11 rounded-2xl object-contain"
            />
            <span className="font-bold text-xl text-foreground">
              {settings?.siteName || "Sity Experts"}
            </span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-8">
            <Link to="/services" className="text-gray-600 hover:text-primary font-medium transition-colors">
              الخدمات
            </Link>
            <Link to="/pricing" className="text-gray-600 hover:text-primary font-medium transition-colors">
              الأسعار
            </Link>
            <Link to="/how-it-works" className="text-gray-600 hover:text-primary font-medium transition-colors">
              كيف نعمل
            </Link>
            <Link to="/faq" className="text-gray-600 hover:text-primary font-medium transition-colors">
              الأسئلة الشائعة
            </Link>
            <Link to="/freelancers" className="text-gray-600 hover:text-primary font-medium transition-colors">
              الخبراء
            </Link>
            {/* Dynamic menu pages */}
            {menuPages.map((page: any) => (
              <Link
                key={page.slug}
                to={`/page/${page.slug}`}
                className="text-gray-600 hover:text-primary font-medium transition-colors"
              >
                {page.title_ar}
              </Link>
            ))}
          </div>
          
          <div className="hidden lg:flex items-center gap-4">
            <Button variant="ghost" className="font-medium" asChild>
              <Link to="/login">تسجيل الدخول</Link>
            </Button>
            <Button className="font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" asChild>
              <Link to="/register">ابدأ الآن</Link>
            </Button>
          </div>
          
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white p-4 space-y-4 shadow-lg">
          <Link to="/services" className="block py-2 text-gray-600 hover:text-primary font-medium">
            الخدمات
          </Link>
          <Link to="/pricing" className="block py-2 text-gray-600 hover:text-primary font-medium">
            الأسعار
          </Link>
          <Link to="/how-it-works" className="block py-2 text-gray-600 hover:text-primary font-medium">
            كيف نعمل
          </Link>
          <Link to="/faq" className="block py-2 text-gray-600 hover:text-primary font-medium">
            الأسئلة الشائعة
          </Link>
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <Button variant="outline" className="w-full font-medium" asChild>
              <Link to="/login">تسجيل الدخول</Link>
            </Button>
            <Button className="w-full font-medium" asChild>
              <Link to="/register">ابدأ الآن</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}