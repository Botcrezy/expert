import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Shield,
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Loader2,
  RefreshCw,
  Lock,
  Eye,
  UserX,
  Key,
} from "lucide-react";

const severityIcons: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: Shield,
};

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-800",
};

const eventIcons: Record<string, any> = {
  login_failed: UserX,
  login_success: CheckCircle,
  password_change: Key,
  permission_denied: Lock,
  suspicious_activity: AlertTriangle,
};

export default function AdminSecurityLogs() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["security-logs", severityFilter, eventFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("security_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }
      if (eventFilter !== "all") {
        query = query.eq("event_type", eventFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-security-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email");
      return data || [];
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "غير معروف";
    const profile = profiles?.find(p => p.user_id === userId);
    return profile?.full_name || profile?.email || userId.slice(0, 8);
  };

  const filteredLogs = logs?.filter((log: any) => {
    const matchesSearch =
      log.event_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.description?.toLowerCase().includes(search.toLowerCase()) ||
      getUserName(log.user_id).toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const eventTypes = [...new Set(logs?.map((l: any) => l.event_type) || [])];

  const criticalCount = logs?.filter((l: any) => l.severity === 'critical' || l.severity === 'error').length || 0;
  const warningCount = logs?.filter((l: any) => l.severity === 'warning').length || 0;

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="سجل المراقبة الأمني"
      subtitle="تتبع جميع العمليات والتغييرات الأمنية في النظام"
    >
      {/* Alert Banner */}
      {criticalCount > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">تنبيه أمني!</p>
            <p className="text-sm text-red-600">
              يوجد {criticalCount} حدث أمني يتطلب المراجعة
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث في السجلات الأمنية..."
            className="pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الخطورة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="info">معلومات</SelectItem>
            <SelectItem value="warning">تحذير</SelectItem>
            <SelectItem value="error">خطأ</SelectItem>
            <SelectItem value="critical">حرج</SelectItem>
          </SelectContent>
        </Select>

        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="نوع الحدث" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {eventTypes.map(event => (
              <SelectItem key={event} value={event}>{event}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{logs?.length || 0}</p>
            <p className="text-sm text-muted-foreground">إجمالي الأحداث</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{criticalCount}</p>
            <p className="text-sm text-muted-foreground">أحداث حرجة</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{warningCount}</p>
            <p className="text-sm text-muted-foreground">تحذيرات</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {logs?.filter(l => l.event_type === 'login_success').length || 0}
            </p>
            <p className="text-sm text-muted-foreground">تسجيلات ناجحة</p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الخطورة</th>
                <th>نوع الحدث</th>
                <th>المستخدم</th>
                <th>الوصف</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const SeverityIcon = severityIcons[log.severity] || Info;
                  const EventIcon = eventIcons[log.event_type] || Shield;
                  const colorClass = severityColors[log.severity] || severityColors.info;

                  return (
                    <tr key={log.id}>
                      <td>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss", { locale: ar })}
                        </span>
                      </td>
                      <td>
                        <Badge className={colorClass}>
                          <SeverityIcon className="w-3 h-3 ml-1" />
                          {log.severity}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <EventIcon className="w-4 h-4 text-muted-foreground" />
                          <span>{log.event_type}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-medium">{getUserName(log.user_id)}</span>
                      </td>
                      <td>
                        <span className="text-sm text-muted-foreground max-w-xs truncate block">
                          {log.description || "-"}
                        </span>
                      </td>
                      <td>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.ip_address || "-"}
                        </code>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Shield className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد سجلات أمنية</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
