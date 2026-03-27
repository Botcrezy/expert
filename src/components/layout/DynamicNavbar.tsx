import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, LayoutDashboard, ChevronDown, Sun, Moon } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
interface HeaderSettings {
  design_variant: string;
  showLogo: boolean;
  showNavigation: boolean;
  sticky: boolean;
  transparent: boolean;
}

export const DynamicNavbar = forwardRef<HTMLElement, Record<string, never>>(function DynamicNavbar(_props, ref) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: settings } = usePlatformSettings();
  const { user, userRole, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Fetch header design settings
  const { data: headerSettings } = useQuery({
    queryKey: ["dynamic-header-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("header_footer_settings")
        .select("*")
        .eq("setting_type", "header")
        .eq("is_active", true)
        .maybeSingle();
      return (data?.settings as unknown as HeaderSettings) || null;
    },
  });

  // Handle scroll for transparent header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showLogo = headerSettings?.showLogo ?? true;
  const showNavigation = headerSettings?.showNavigation ?? true;
  const isSticky = headerSettings?.sticky ?? true;
  const isTransparent = headerSettings?.transparent ?? false;

  // Fetch navigation items from database
  const { data: navItems = [] } = useQuery({
    queryKey: ["nav-items-header"],
    queryFn: async () => {
      const { data } = await supabase
        .from("navigation_items")
        .select("*")
        .eq("location", "header")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");
      return data || [];
    },
  });

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

  // Default navigation items
  const defaultNavItems = [
    { label_ar: "الخدمات", url: "/services", visibility: "all" },
    { label_ar: "الأسعار", url: "/pricing", visibility: "all" },
    { label_ar: "كيف نعمل", url: "/how-it-works", visibility: "all" },
    { label_ar: "الأسئلة الشائعة", url: "/faq", visibility: "all" },
  ];

  const filterByVisibility = (items: any[]) => {
    return items.filter((item: any) => {
      const visibility = item.visibility || "all";
      if (visibility === "all") return true;
      if (visibility === "guest" && !user) return true;
      if (visibility === "authenticated" && user) return true;
      return false;
    });
  };

  // Get URLs from nav items to avoid duplicates from menuPages
  const navItemUrls = new Set(
    (navItems.length > 0 ? navItems : defaultNavItems).map((item: any) => 
      item.url.replace(/^\//, '').toLowerCase()
    )
  );

  // Filter out menuPages that are already in nav items
  const filteredMenuPages = menuPages.filter((page: any) => 
    !navItemUrls.has(page.slug.toLowerCase())
  );

  const displayNavItems = filterByVisibility(navItems.length > 0 ? navItems : defaultNavItems);

  const getDashboardUrl = () => {
    if (userRole === "admin" || userRole === "team_leader") return "/admin";
    if (userRole === "freelancer") return "/freelancer/dashboard";
    return "/client/dashboard";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const shouldShowSolid = isScrolled || !isTransparent;

  return (
    <nav
      ref={ref}
      className={cn(
        "z-50 transition-all duration-500",
        isSticky ? "sticky top-0" : "relative",
        shouldShowSolid
          ? "bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          {showLogo && (
            <Link to="/" className="flex items-center gap-3 group">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  className="w-10 h-10 rounded-xl object-contain transition-transform duration-300 group-hover:scale-110"
                  decoding="async"
                  loading="eager"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
                  <span className="text-primary-foreground font-bold text-lg">
                    {settings?.siteName?.charAt(0) || "S"}
                  </span>
                </div>
              )}
              <span className={cn(
                "font-bold text-lg transition-colors duration-300",
                shouldShowSolid ? "text-foreground" : "text-foreground"
              )}>
                {settings?.siteName || "Sity Experts"}
              </span>
            </Link>
          )}
          
          {/* Desktop Menu */}
          {showNavigation && (
            <div className="hidden lg:flex items-center gap-1 bg-muted/60 rounded-full p-1.5 px-2 border border-border/60 shadow-sm">
              {displayNavItems.map((item: any, index: number) => (
                <Link
                  key={index}
                  to={item.url}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 text-muted-foreground hover:text-foreground hover:bg-background/90 hover:shadow-sm story-link"
                >
                  {item.label_ar || item.label}
                </Link>
              ))}
              {filteredMenuPages.map((page: any) => (
                <Link
                  key={page.slug}
                  to={`/${page.slug}`}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 text-muted-foreground hover:text-foreground hover:bg-background/90 hover:shadow-sm story-link"
                >
                  {page.title_ar}
                </Link>
              ))}
            </div>
          )}
          
          {/* Right Side */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full w-10 h-10 hover:bg-muted border border-border/60"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 h-10 px-3 rounded-full hover:bg-muted border border-border/60"
                  >
                    <Avatar className="h-8 w-8 border-2 border-primary/40">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-sm">
                        {user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl">
                  <div className="px-3 py-2.5 border-b">
                    <p className="font-medium text-sm">المستخدم</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate(getDashboardUrl())} className="cursor-pointer py-2.5">
                    <LayoutDashboard className="w-4 h-4 ml-2" />
                    لوحة التحكم
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/client/settings")} className="cursor-pointer py-2.5">
                    <User className="w-4 h-4 ml-2" />
                    الملف الشخصي
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer py-2.5">
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="font-medium rounded-full h-10 px-5 story-link" 
                  asChild
                >
                  <Link to="/login">تسجيل الدخول</Link>
                </Button>
                <Button 
                  className="font-medium rounded-full h-10 px-6 shadow-glow bg-gradient-to-r from-primary via-accent to-primary" 
                  variant="hero"
                  asChild
                >
                  <Link to="/register">ابدأ مجاناً</Link>
                </Button>
              </>
            )}
          </div>
          
          {/* Mobile Controls */}
          <div className="flex lg:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-background/98 backdrop-blur-xl p-4 space-y-2 shadow-xl animate-fade-in">
          {displayNavItems.map((item: any, index: number) => (
            <Link
              key={index}
              to={item.url}
              className="block py-3 px-4 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label_ar || item.label}
            </Link>
          ))}
          {filteredMenuPages.map((page: any) => (
            <Link
              key={page.slug}
              to={`/${page.slug}`}
              className="block py-3 px-4 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {page.title_ar}
            </Link>
          ))}
          <div className="pt-4 border-t space-y-2">
            {user ? (
              <>
                <Button variant="outline" className="w-full font-medium rounded-xl h-12" onClick={() => { navigate(getDashboardUrl()); setMobileMenuOpen(false); }}>
                  <LayoutDashboard className="w-4 h-4 ml-2" />
                  لوحة التحكم
                </Button>
                <Button variant="ghost" className="w-full font-medium text-destructive rounded-xl h-12" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 ml-2" />
                  تسجيل الخروج
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full font-medium rounded-xl h-12" asChild>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>تسجيل الدخول</Link>
                </Button>
                <Button className="w-full font-medium rounded-xl h-12 shadow-lg shadow-primary/20" asChild>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>ابدأ الآن</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
});

DynamicNavbar.displayName = "DynamicNavbar";
