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
  Activity,
  Search,
  Filter,
  Loader2,
  User,
  FileText,
  Settings,
  Shield,
  CreditCard,
  MessageSquare,
  RefreshCw,
} from "lucide-react";

const actionIcons: Record<string, any> = {
  login: User,
  logout: User,
  create: FileText,
  update: Settings,
  delete: Shield,
  payment: CreditCard,
  message: MessageSquare,
};

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  success: "bg-green-100 text-green-700",
};

export default function AdminSystemLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["system-logs", actionFilter, entityFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }
      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email");
      return data || [];
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "النظام";
    const profile = profiles?.find(p => p.user_id === userId);
    return profile?.full_name || profile?.email || userId.slice(0, 8);
  };

  const filteredLogs = logs?.filter((log: any) => {
    const matchesSearch =
      log.action_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      getUserName(log.user_id).toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const actionTypes = [...new Set(logs?.map((l: any) => l.action_type) || [])] as string[];
  const entityTypes = [...new Set(logs?.map((l: any) => l.entity_type) || [])] as string[];

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="سجلات النظام"
      subtitle="متابعة جميع الأنشطة والعمليات في النظام"
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث في السجلات..."
            className="pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="نوع العملية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {actionTypes.map(action => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="نوع الكيان" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {entityTypes.map(entity => (
              <SelectItem key={entity} value={entity}>{entity}</SelectItem>
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
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{logs?.length || 0}</p>
            <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {logs?.filter(l => l.action_type === 'login').length || 0}
            </p>
            <p className="text-sm text-muted-foreground">تسجيلات دخول</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {logs?.filter(l => l.action_type === 'create').length || 0}
            </p>
            <p className="text-sm text-muted-foreground">عمليات إنشاء</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {logs?.filter(l => l.action_type === 'update').length || 0}
            </p>
            <p className="text-sm text-muted-foreground">عمليات تحديث</p>
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
                <th>المستخدم</th>
                <th>العملية</th>
                <th>الكيان</th>
                <th>التفاصيل</th>
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
                  const IconComponent = actionIcons[log.action_type] || Activity;
                  return (
                    <tr key={log.id}>
                      <td>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: ar })}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium">{getUserName(log.user_id)}</span>
                      </td>
                      <td>
                        <Badge variant="secondary" className="gap-1">
                          <IconComponent className="w-3 h-3" />
                          {log.action_type}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-muted-foreground">{log.entity_type}</span>
                      </td>
                      <td>
                        <span className="text-sm text-muted-foreground max-w-xs truncate block">
                          {log.details ? JSON.stringify(log.details).slice(0, 50) + "..." : "-"}
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
                    <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد سجلات</p>
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
