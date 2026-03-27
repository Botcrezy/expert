import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Activity, Filter, Search, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

interface ProfileRecord {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const categoryLabels: Record<string, string> = {
  request: "الطلبات",
  withdrawal: "السحوبات",
  identity_verification: "توثيق الهوية",
  assignment: "مهام الفريلانسر",
  delivery: "التسليمات",
};

function getReferenceCategory(notification: NotificationRecord): string {
  switch (notification.reference_type) {
    case "request":
      return "request";
    case "withdrawal":
      return "withdrawal";
    case "identity_verification":
      return "identity_verification";
    case "assignment":
    case "task":
      return "assignment";
    case "delivery":
      return "delivery";
    default:
      return "other";
  }
}

function getAdminLink(notification: NotificationRecord): string | null {
  if (!notification.reference_id) return null;

  switch (notification.reference_type) {
    case "request":
      return `/admin/requests/${notification.reference_id}`;
    case "withdrawal":
      return "/admin/finance/withdrawals";
    case "identity_verification":
      return "/admin/users/identity";
    case "assignment":
      return "/admin/assignments";
    case "delivery":
      return "/admin/qc";
    default:
      return null;
  }
}

export default function AdminActionCenter() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("24h");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-action-center", categoryFilter, timeFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      // Apply simple time filter on the server side when possible
      const now = new Date();
      if (timeFilter !== "all") {
        const hours = timeFilter === "24h" ? 24 : timeFilter === "7d" ? 24 * 7 : 24 * 30;
        const from = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", from);
      }

      const [{ data: notifications, error }, { data: profiles }] = await Promise.all([
        query,
        (supabase as any)
          .from("profiles")
          .select("user_id, full_name, email"),
      ]);

      if (error) throw error;

      return {
        notifications: (notifications || []) as NotificationRecord[],
        profiles: (profiles || []) as ProfileRecord[],
      };
    },
  });

  const notifications = data?.notifications || [];
  const profiles = data?.profiles || [];

  const getUserName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.full_name || profile?.email || userId.slice(0, 8);
  };

  const filtered = notifications.filter((n) => {
    const category = getReferenceCategory(n);
    if (categoryFilter !== "all" && category !== categoryFilter) return false;

    if (!search.trim()) return true;

    const term = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(term) ||
      (n.body || "").toLowerCase().includes(term) ||
      getUserName(n.user_id).toLowerCase().includes(term) ||
      (n.reference_type || "").toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="مركز الأكشنز"
      subtitle="متابعة كل الأحداث المهمة في النظام من مكان واحد"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="بحث في العنوان، النص، المستخدم..."
              className="pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="نوع الحدث" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأحداث</SelectItem>
                <SelectItem value="request">الطلبات</SelectItem>
                <SelectItem value="withdrawal">السحوبات</SelectItem>
                <SelectItem value="identity_verification">توثيق الهوية</SelectItem>
                <SelectItem value="assignment">مهام الفريلانسر</SelectItem>
                <SelectItem value="delivery">التسليمات</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="المدة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">آخر 24 ساعة</SelectItem>
                <SelectItem value="7d">آخر 7 أيام</SelectItem>
                <SelectItem value="30d">آخر 30 يوم</SelectItem>
                <SelectItem value="all">كل الوقت</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-sm text-muted-foreground">إجمالي الإشعارات المعروضة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                خط زمني للأكشنز
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[520px]">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  لا توجد أحداث مطابقة للبحث أو الفلاتر الحالية
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((n) => {
                    const category = getReferenceCategory(n);
                    const categoryLabel = categoryLabels[category] || "أخرى";
                    const link = getAdminLink(n);

                    return (
                      <li key={n.id} className="p-4 flex items-start gap-4">
                        <div className="mt-1 w-2 h-2 rounded-full bg-primary" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{categoryLabel}</Badge>
                              <span className="font-medium text-foreground text-sm line-clamp-1">
                                {n.title}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(n.created_at), "dd MMM yyyy HH:mm", { locale: ar })}
                            </span>
                          </div>
                          {n.body && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {n.body}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              المستخدم: {getUserName(n.user_id)}
                            </Badge>
                            {n.reference_type && (
                              <Badge variant="outline" className="text-xs">
                                المرجع: {n.reference_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {link && (
                          <Button asChild variant="outline" size="sm" className="shrink-0 mt-1">
                            <Link to={link}>
                              متابعة من هنا
                              <ArrowRight className="w-3 h-3 mr-1" />
                            </Link>
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
