import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  Search,
  User,
  LogOut,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";


interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

function DashboardContent({
  children,
  sidebar,
  title,
  subtitle,
  actions,
}: DashboardLayoutProps) {
  const { user, signOut, userRole } = useAuth();
  const navigate = useNavigate();
  const { data: platformSettings } = usePlatformSettings();

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "admin": return "مدير";
      case "team_leader": return "قائد فريق";
      case "freelancer": return "فريلانسر";
      case "client": return "عميل";
      default: return "مستخدم";
    }
  };

  return (

    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      {sidebar}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              
              {/* Logo - Dynamic */}
              <Link to="/" className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity">
                {platformSettings?.logoUrl ? (
                  <img 
                    src={platformSettings.logoUrl} 
                    alt={platformSettings.siteName} 
                    className="w-8 h-8 rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">
                      {platformSettings?.siteName?.charAt(0) || "S"}
                    </span>
                  </div>
                )}
                <span className="font-semibold text-foreground">
                  {platformSettings?.siteName || "Sity Experts"}
                </span>
              </Link>
              
              {/* Search */}
              <div className="relative hidden lg:block">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="بحث..."
                  className="w-64 pr-10 bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Notifications */}
              <NotificationBell />
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pr-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {profile?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-medium">{profile?.full_name || "مستخدم"}</p>
                      <p className="text-xs text-muted-foreground">{getRoleLabel(userRole)}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => {
                    if (userRole === "admin") {
                      navigate("/admin/settings");
                    } else if (userRole === "freelancer") {
                      navigate("/freelancer/profile");
                    } else {
                      navigate("/client/settings");
                    }
                  }}>
                    <User className="w-4 h-4 ml-2" />
                    الملف الشخصي
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (userRole === "admin") {
                      navigate("/admin/settings");
                    } else if (userRole === "freelancer") {
                      navigate("/freelancer/settings");
                    } else {
                      navigate("/client/settings");
                    }
                  }}>
                    <Settings className="w-4 h-4 ml-2" />
                    الإعدادات
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      void handleLogout();
                    }}
                  >
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          {(title || subtitle || actions) && (
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                {title && <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{title}</h1>}
                {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="shrink-0">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardContent {...props} />
    </SidebarProvider>
  );
}
