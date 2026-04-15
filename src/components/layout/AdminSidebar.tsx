import { NavLink, useLocation } from "react-router-dom";
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
  Users,
  UserCheck,
  ClipboardCheck,
  CreditCard,
  Ticket,
  RotateCcw,
  AlertTriangle,
  Headphones,
  FileEdit,
  Settings,
  ScrollText,
  Wallet,
  Package,
  Crown,
  ShoppingCart,
  BarChart3,
  Bell,
  FolderOpen,
  Shield,
  Menu,
  Share2,
  LayoutTemplate,
  Activity,
  ShieldCheck,
  Gift,
  Palette,
  UserX,
  GraduationCap,
  MessageCircle,
  Mail,
  Database,
  ListChecks,
  DollarSign,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const menuItems = [
  {
    group: "الرئيسية",
    items: [
      { title: "لوحة التحكم", url: "/admin", icon: LayoutDashboard },
    ]
  },
  {
    group: "إدارة الطلبات",
    items: [
      { title: "قائمة الطلبات", url: "/admin/requests/queue", icon: FileText },
      { title: "عروض الماركت بلايس", url: "/admin/proposals", icon: Briefcase },
      { title: "الاتفاقات الثابتة", url: "/admin/fixed-agreements", icon: Briefcase },
      { title: "التعيينات", url: "/admin/assignments", icon: UserCheck },
      { title: "مراجعة الجودة", url: "/admin/qc", icon: ClipboardCheck },
      { title: "قوالب الطلبات", url: "/admin/request-templates", icon: LayoutTemplate },
    ]
  },
  {
    group: "المستخدمين",
    items: [
      { title: "جميع المستخدمين", url: "/admin/users", icon: Users },
      { title: "التحقق من الهوية", url: "/admin/users/identity", icon: Shield },
      { title: "طلبات التحقق", url: "/admin/users/verifications", icon: UserCheck },
      { title: "فريلانسرز معلقين", url: "/admin/freelancers/pending", icon: Users },
      { title: "البراندات", url: "/admin/brands", icon: Crown },
    ],
  },
  {
    group: "الاستوديو التعليمي",
    items: [
      { title: "المسارات التعليمية", url: "/admin/studio", icon: GraduationCap },
      { title: "مراجعة المهام", url: "/admin/studio/qc", icon: ClipboardCheck },
      { title: "المهام التدريبية", url: "/admin/training", icon: ClipboardCheck },
    ]
  },
  {
    group: "المالية",
    items: [
      { title: "الباقات", url: "/admin/plans", icon: Crown },
      { title: "أحجام المهام", url: "/admin/task-sizes", icon: ListChecks },
      { title: "الإضافات", url: "/admin/addons", icon: Package },
      { title: "الطلبات", url: "/admin/orders", icon: ShoppingCart },
      { title: "الكوبونات", url: "/admin/coupons", icon: Ticket },
      { title: "بوابات الدفع", url: "/admin/payment-gateways", icon: CreditCard },
      { title: "فواتير التحصيل", url: "/admin/payment-collections", icon: DollarSign },
      { title: "البورتفوليوهات", url: "/admin/portfolios", icon: Briefcase },
      { title: "الاستردادات", url: "/admin/refunds", icon: RotateCcw },
      { title: "السحوبات", url: "/admin/finance/withdrawals", icon: Wallet },
    ]
  },
  {
    group: "الدعم",
    items: [
      { title: "النزاعات", url: "/admin/disputes", icon: AlertTriangle },
      { title: "تذاكر الدعم", url: "/admin/support", icon: Headphones },
      { title: "الدعم الفني", url: "/admin/technical-support", icon: MessageCircle },
    ]
  },
  {
    group: "النظام",
    items: [
      { title: "التقارير", url: "/admin/reports", icon: BarChart3 },
      { title: "مركز الأكشنز", url: "/admin/action-center", icon: Activity },
      { title: "الإشعارات", url: "/admin/notifications", icon: Bell },
      { title: "قواعد الإشعارات", url: "/admin/notification-rules", icon: Shield },
      { title: "إدارة الملفات", url: "/admin/files", icon: FolderOpen },
      { title: "المحتوى", url: "/admin/cms", icon: FileEdit },
      { title: "قوالب الصفحات", url: "/admin/page-templates", icon: LayoutTemplate },
      { title: "إدارة القوائم", url: "/admin/navigation", icon: Menu },
      { title: "Header & Footer", url: "/admin/header-footer", icon: Palette },
      { title: "إعدادات الموقع", url: "/admin/site-settings", icon: Settings },
      { title: "تليجرام", url: "/admin/telegram", icon: MessageCircle },
      { title: "النشرة البريدية", url: "/admin/newsletter", icon: Mail },
      { title: "الإحالات", url: "/admin/referrals", icon: Share2 },
      { title: "إعدادات الإحالات", url: "/admin/referral-settings", icon: Gift },
      { title: "الإعدادات", url: "/admin/settings", icon: Settings },
      { title: "سجلات النظام", url: "/admin/system-logs", icon: Activity },
      { title: "السجل الأمني", url: "/admin/security-logs", icon: ShieldCheck },
      { title: "سجل المراقبة", url: "/admin/audit", icon: Shield },
      { title: "مزامنة Supabase", url: "/admin/supabase-sync", icon: Database },
      { title: "مولد العروض (AI)", url: "/admin/ai-requests", icon: Sparkles },
      { title: "📚 التوثيق", url: "/admin/documentation", icon: ScrollText },
    ]
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const { data: settings } = usePlatformSettings();
  
  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <NavLink to="/admin" className="flex items-center gap-3">
          {settings?.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt={settings.siteName} 
              className="w-10 h-10 rounded-xl object-contain shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-lg">
                {settings?.siteName?.charAt(0) || "S"}
              </span>
            </div>
          )}
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg">{settings?.siteName || "Sity Experts"}</h1>
              <p className="text-xs text-sidebar-foreground/70">لوحة الإدارة</p>
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
                    (item.url !== "/admin" && location.pathname.startsWith(item.url));
                  
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
          <div className="text-xs text-sidebar-foreground/70 text-center">
            {settings?.siteName || "Sity Experts"} © {new Date().getFullYear()}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
