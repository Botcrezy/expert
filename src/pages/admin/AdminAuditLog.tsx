import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle2,
  User,
  Clock,
  RefreshCw,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AdminAuditLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", actionFilter, entityFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredLogs = logs.filter((log: any) => {
    const search = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(search) ||
      log.entity_type?.toLowerCase().includes(search) ||
      log.entity_id?.toLowerCase().includes(search) ||
      log.user_id?.toLowerCase().includes(search)
    );
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
      case "insert":
        return "bg-emerald-500/10 text-emerald-600";
      case "update":
        return "bg-blue-500/10 text-blue-600";
      case "delete":
        return "bg-red-500/10 text-red-600";
      case "login":
        return "bg-purple-500/10 text-purple-600";
      case "logout":
        return "bg-gray-500/10 text-gray-600";
      default:
        return "bg-yellow-500/10 text-yellow-600";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
      case "insert":
        return CheckCircle2;
      case "delete":
        return AlertTriangle;
      default:
        return Eye;
    }
  };

  const uniqueActions = [...new Set(logs.map((l: any) => l.action))];
  const uniqueEntities = [...new Set(logs.map((l: any) => l.entity_type))];

  const exportLogs = () => {
    const csv = [
      ["التاريخ", "الإجراء", "الكيان", "معرف الكيان", "المستخدم", "IP"],
      ...filteredLogs.map((log: any) => [
        format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
        log.action,
        log.entity_type,
        log.entity_id || "",
        log.user_id || "",
        log.ip_address || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="سجل المراقبة الأمني"
      subtitle="تتبع جميع العمليات والتغييرات في النظام"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {logs.filter((l: any) => l.action === "create" || l.action === "insert").length}
              </p>
              <p className="text-sm text-muted-foreground">إنشاء</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {logs.filter((l: any) => l.action === "update").length}
              </p>
              <p className="text-sm text-muted-foreground">تحديث</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {logs.filter((l: any) => l.action === "delete").length}
              </p>
              <p className="text-sm text-muted-foreground">حذف</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="الإجراء" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الإجراءات</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="الكيان" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الكيانات</SelectItem>
              {uniqueEntities.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {entity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>الإجراء</TableHead>
              <TableHead>الكيان</TableHead>
              <TableHead>المستخدم</TableHead>
              <TableHead>IP</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  لا توجد سجلات
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.slice(0, 100).map((log: any) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: ar })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        <ActionIcon className="w-3 h-3 ml-1" />
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{log.entity_type}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-xs truncate max-w-[100px]">
                          {log.user_id?.slice(0, 8) || "نظام"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{log.ip_address || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل السجل</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">الإجراء</label>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">الكيان</label>
                  <p className="font-medium">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">معرف الكيان</label>
                  <p className="font-mono text-sm">{selectedLog.entity_id || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">التاريخ</label>
                  <p>{format(new Date(selectedLog.created_at), "PPpp", { locale: ar })}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">المستخدم</label>
                  <p className="font-mono text-sm">{selectedLog.user_id || "نظام"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">IP Address</label>
                  <p className="font-mono text-sm">{selectedLog.ip_address || "-"}</p>
                </div>
              </div>
              
              {selectedLog.old_values && (
                <div>
                  <label className="text-sm text-muted-foreground">القيم القديمة</label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40" dir="ltr">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedLog.new_values && (
                <div>
                  <label className="text-sm text-muted-foreground">القيم الجديدة</label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40" dir="ltr">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <label className="text-sm text-muted-foreground">User Agent</label>
                  <p className="text-xs text-muted-foreground mt-1">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
