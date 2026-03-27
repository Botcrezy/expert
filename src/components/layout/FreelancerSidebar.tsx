import { NavLink, useLocation } from "react-router-dom";
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
  ClipboardList,
  Clock,
  Wallet,
  User,
  MessageSquare,
  Package,
  Folder,
  Bell,
  Settings,
  GraduationCap,
  Shield,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const menuItems = [
  {
    group: "الرئيسية",
    items: [
      { title: "لوحة التحكم", url: "/freelancer/dashboard", icon: LayoutDashboard },
      { title: "المهام المعلقة", url: "/freelancer/pending", icon: Clock },
      { title: "مهامي", url: "/freelancer/tasks", icon: ClipboardList },
      { title: "طلبات خدماتي", url: "/freelancer/service-orders", icon: Briefcase },
      { title: "التسليمات", url: "/freelancer/deliveries", icon: Package },
    ]
  },
  {
    group: "التعليم والتدريب",
    items: [
      { title: "Expert Studio", url: "/freelancer/studio", icon: GraduationCap },
      { title: "المهام التدريبية", url: "/freelancer/training", icon: ClipboardList },
    ]
  },
  {
    group: "التواصل",
    items: [
      { title: "المحادثات", url: "/freelancer/messages", icon: MessageSquare },
      { title: "الملفات", url: "/freelancer/files", icon: Folder },
      { title: "الإشعارات", url: "/freelancer/notifications", icon: Bell },
    ]
  },
  {
    group: "الحساب",
    items: [
      { title: "المحفظة", url: "/freelancer/wallet", icon: Wallet },
      { title: "ادفعلي", url: "/freelancer/adfaly", icon: DollarSign },
      { title: "وظفني", url: "/freelancer/portfolio", icon: Briefcase },
      { title: "الإحالات", url: "/freelancer/referrals", icon: User },
      { title: "الملف الشخصي", url: "/freelancer/profile", icon: User },
      { title: "التحقق من الهوية", url: "/freelancer/identity-verification", icon: Shield },
      { title: "الإعدادات", url: "/freelancer/settings", icon: Settings },
    ]
  },
];

export function FreelancerSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const { user } = useAuth();
  const { data: platform } = usePlatformSettings();
  const siteName = platform?.siteName || "Sity Experts";
  const logoUrl = platform?.logoUrl || "";

  // Fetch wallet balance
  const { data: walletBalance } = useQuery({
    queryKey: ["freelancer-wallet-sidebar", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("wallet_ledger")
        .select("balance_after")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.balance_after || 0;
    },
    enabled: !!user,
  });

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <NavLink to="/freelancer/dashboard" className="flex items-center gap-3">
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
              <p className="text-xs text-sidebar-foreground/70">منطقة الفريلانسر</p>
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
                    (item.url !== "/freelancer/dashboard" && location.pathname.startsWith(item.url));
                  
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
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">الرصيد المتاح</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {Number(walletBalance || 0).toLocaleString()} ج.م
            </p>
            <NavLink 
              to="/freelancer/wallet"
              className="text-xs text-green-600 dark:text-green-400 hover:underline mt-2 block"
            >
              سحب الرصيد ←
            </NavLink>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
