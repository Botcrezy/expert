import { NavLink, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Crown,
  CreditCard,
  Receipt,
  Headphones,
  Settings,
  FileStack,
  Share2,
  Palette,
  AlertTriangle,
  Shield,
  GraduationCap,
  Package,
  Heart,
} from "lucide-react";

const menuItems = [
  {
    group: "الرئيسية",
    items: [
      { title: "لوحة التحكم", url: "/client/dashboard", icon: LayoutDashboard },
      { title: "طلب جديد", url: "/client/create-request", icon: PlusCircle },
      { title: "طلباتي", url: "/client/requests", icon: FileText },
      { title: "خدماتي المشتراة", url: "/client/purchased-services", icon: Package },
      { title: "ملفاتي", url: "/client/files", icon: FileStack },
      { title: "مفضلاتي", url: "/client/favorites", icon: Heart },
    ]
  },
  {
    group: "الاشتراك",
    items: [
      { title: "باقتي", url: "/client/plan", icon: Crown },
      { title: "الدفع", url: "/client/checkout", icon: CreditCard },
      { title: "الفواتير", url: "/client/billing", icon: Receipt },
    ]
  },
  {
    group: "التعلم",
    items: [
      { title: "Expert Studio", url: "/client/studio", icon: GraduationCap },
    ]
  },
  {
    group: "المزيد",
    items: [
      { title: "البراند", url: "/client/brand", icon: Palette },
      { title: "التحقق من الهوية", url: "/client/identity-verification", icon: Shield },
      { title: "الدعم", url: "/client/support", icon: Headphones },
    ]
  },
  {
    group: "الإعدادات",
    items: [
      { title: "الإعدادات", url: "/client/settings", icon: Settings },
      { title: "الإحالات", url: "/client/referrals", icon: Share2 },
    ]
  },
];

export function ClientSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const { user } = useAuth();
  const { data: platform } = usePlatformSettings();
  const siteName = platform?.siteName || "Sity Experts";
  const logoUrl = platform?.logoUrl || "";

  // Fetch subscription
  const { data: subscription } = useQuery({
    queryKey: ["client-sidebar-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("client_subscriptions")
        .select("*, plans(name_ar)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch credit balance from ledger
  const { data: creditBalance } = useQuery({
    queryKey: ["client-sidebar-credit", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("credits_ledger")
        .select("balance_after")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.balance_after || 0;
    },
    enabled: !!user,
  });

  // Calculate total credits (subscription + additional credits)
  const subscriptionCredits = subscription?.credits_remaining || 0;
  const additionalCredits = creditBalance || 0;
  const totalCredits = subscriptionCredits + additionalCredits;
  const planName = (subscription?.plans as any)?.name_ar;
  const hasSubscription = !!subscription;
  
  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <NavLink to="/client/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${siteName} logo`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-primary-foreground font-bold text-lg">{(siteName || "S")[0]}</span>
            )}
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg">{siteName}</h1>
              <p className="text-xs text-sidebar-foreground/70">منطقة العميل</p>
            </div>
          )}
        </NavLink>
      </SidebarHeader>
      
      <SidebarContent className="py-4">
        {menuItems.map((group) => (
          <SidebarGroup key={group.group}>
            {!collapsed && (
              <SidebarGroupLabel className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {group.group}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url || 
                    (item.url !== "/client/dashboard" && location.pathname.startsWith(item.url));
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                      >
                        <NavLink to={item.url}>
                          <item.icon className="w-5 h-5 shrink-0" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!collapsed && (
          <div className={`rounded-xl p-4 ${totalCredits > 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
            {hasSubscription ? (
              <>
                <p className="text-sm font-medium text-primary mb-1">{planName}</p>
                <p className="text-xs text-sidebar-foreground/70 mb-3">
                  {totalCredits} كريديت متبقي
                </p>
              </>
            ) : totalCredits > 0 ? (
              <>
                <p className="text-sm font-medium text-primary mb-1">رصيد الكريديت</p>
                <p className="text-xs text-sidebar-foreground/70 mb-3">
                  {totalCredits} كريديت متبقي
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-sm font-medium text-destructive">لا يوجد رصيد</p>
                </div>
                <p className="text-xs text-sidebar-foreground/70 mb-3">
                  اشترك في باقة أو اشتر كريديت
                </p>
              </>
            )}
            <NavLink 
              to="/client/plan"
              className="text-xs text-primary hover:underline"
            >
              {hasSubscription ? 'ترقية الباقة ←' : 'اشترك الآن ←'}
            </NavLink>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}