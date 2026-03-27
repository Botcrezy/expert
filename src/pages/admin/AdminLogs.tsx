import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ScrollText,
  Search,
  User,
  FileText,
  CreditCard,
  Settings,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const actionColors: Record<string, string> = {
  create: "bg-success/10 text-success",
  update: "bg-info/10 text-info",
  delete: "bg-destructive/10 text-destructive",
  login: "bg-primary/10 text-primary",
  logout: "bg-muted text-muted-foreground",
};

const entityIcons: Record<string, any> = {
  user: User,
  request: FileText,
  order: CreditCard,
  settings: Settings,
  default: AlertTriangle,
};

export default function AdminLogs() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", search, entityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const getProfile = (userId: string) => profiles?.find(p => p.user_id === userId);

  const filteredLogs = logs?.filter(log => {
    if (!search) return true;
    const profile = getProfile(log.user_id || "");
    return (
      profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="سجلات النظام"
      subtitle="متابعة جميع الأنشطة والعمليات في النظام"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="نوع الكيان" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="user">المستخدمين</SelectItem>
              <SelectItem value="request">الطلبات</SelectItem>
              <SelectItem value="order">الأوردرات</SelectItem>
              <SelectItem value="settings">الإعدادات</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="الإجراء" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="create">إنشاء</SelectItem>
              <SelectItem value="update">تحديث</SelectItem>
              <SelectItem value="delete">حذف</SelectItem>
              <SelectItem value="login">تسجيل دخول</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ScrollText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs?.filter(l => l.action === "create").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">عمليات إنشاء</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs?.filter(l => l.action === "update").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">عمليات تحديث</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs?.filter(l => l.action === "delete").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">عمليات حذف</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>المستخدم</TableHead>
                <TableHead>الكيان</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>التفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد سجلات</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs?.map((log) => {
                  const profile = getProfile(log.user_id || "");
                  const EntityIcon = entityIcons[log.entity_type] || entityIcons.default;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {profile?.full_name || "النظام"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EntityIcon className="w-4 h-4" />
                          {log.entity_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColors[log.action] || "bg-muted"}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.entity_id?.slice(0, 8) || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
