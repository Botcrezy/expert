import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, 
  Filter,
  UserPlus,
  Eye,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type RequestStatus = "submitted" | "needs_info" | "approved" | "assigned" | "in_progress" | "ready_for_qc" | "qc_rejected" | "delivered_to_client" | "revision_requested" | "completed" | "cancelled";

export default function AdminRequestsQueue() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: requests = [], isLoading, error: requestsError } = useQuery({
    queryKey: ["admin-all-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("requests")
        .select("*, categories(name_ar)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Admin requests fetch error:", error);
        throw new Error(error.message);
      }
      
      // Fetch client profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        
        return data.map(req => ({
          ...req,
          client: profiles?.find(p => p.user_id === req.user_id)
        }));
      }
      
      return data || [];
    },
  });

  // Log error for debugging
  if (requestsError) {
    console.error("Admin requests query error:", requestsError);
  }

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, request }: { id: string; status: RequestStatus; request: any }) => {
      const previousStatus = request?.status;

      const { error } = await supabase
        .from("requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;

      // Audit log (admin only)
      if (user?.id) {
        const isFixedAgreementApproval =
          request?.source === "portfolio_purchase" && previousStatus === "submitted" && status === "assigned";

        await supabase.from("audit_logs").insert({
          action: isFixedAgreementApproval ? "approve_fixed_agreement" : "request_status_change",
          entity_type: "request",
          entity_id: id,
          old_values: { status: previousStatus, request_number: request?.request_number },
          new_values: { status, request_number: request?.request_number, source: request?.source },
          user_id: user.id,
        });
      }

      // Create in-app notification and Telegram message for the client
      if (request?.user_id) {
        const statusTitles: Partial<Record<RequestStatus, string>> = {
          approved: "تم اعتماد طلبك",
          assigned: "تم تعيين فريلانسر لطلبك",
          in_progress: "طلبك قيد التنفيذ",
          delivered_to_client: "تم تسليم طلبك",
          completed: "تم اكتمال طلبك",
          cancelled: "تم إلغاء طلبك",
        };

        const title = statusTitles[status];
        if (title) {
          await supabase.from("notifications").insert({
            user_id: request.user_id,
            type: "status_change",
            title,
            body: request.title,
            reference_type: "request",
            reference_id: id,
          });
        }

        const statusToTelegram: Partial<Record<RequestStatus, string>> = {
          approved: "request_approved",
          assigned: "request_assigned",
          in_progress: "request_in_progress",
          delivered_to_client: "request_delivered",
          completed: "request_completed",
          cancelled: "request_cancelled",
        };

        const messageType = statusToTelegram[status];
        if (messageType) {
          await supabase.functions.invoke("telegram-send", {
            body: {
              user_id: request.user_id,
              message_type: messageType,
              data: {
                request_number: request.request_number,
                title: request.title,
                size: request.size,
              },
              reference_type: "request",
              reference_id: id,
            },
          });
        }
      }

      // Notify freelancer when admin approves fixed-agreement purchase
      if (request?.source === "portfolio_purchase" && status === "assigned" && request?.preferred_freelancer_id) {
        await supabase.from("notifications").insert({
          user_id: request.preferred_freelancer_id,
          type: "admin_approved",
          title: "تم اعتماد الاتفاق الثابت من الإدارة",
          body: request.title,
          reference_type: "request",
          reference_id: id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-requests"] });
      toast({ title: "تم تحديث الحالة بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="text-xs">عاجل</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-xs">عادي</Badge>;
      case "low":
        return <Badge variant="outline" className="text-xs">منخفض</Badge>;
      default:
        return null;
    }
  };

  const getSizeBadge = (size: string) => {
    switch (size) {
      case "micro":
        return "صغيرة جداً";
      case "small":
        return "صغيرة";
      case "medium":
        return "متوسطة";
      case "large":
        return "كبيرة";
      default:
        return size;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns = [
    {
      key: "id",
      header: "الطلب",
      render: (item: typeof requests[0]) => {
        const category = item.categories as { name_ar: string } | null;
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{item.request_number}</span>
                  {getPriorityBadge(item.priority)}
                  {item.source === "portfolio_purchase" && (
                    <Badge variant="secondary" className="text-xs">اتفاق ثابت</Badge>
                  )}
                </div>
                <p className="font-medium text-foreground">{item.title}</p>
              </div>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "التصنيف",
      render: (item: typeof requests[0]) => {
        const category = item.categories as { name_ar: string } | null;
        return (
          <div>
            <p className="text-foreground">{category?.name_ar || "غير مصنف"}</p>
            <p className="text-xs text-muted-foreground">{getSizeBadge(item.size)}</p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "الحالة",
      render: (item: typeof requests[0]) => <StatusBadge status={item.status as any} />,
    },
    {
      key: "credits",
      header: "الكريديت",
      render: (item: typeof requests[0]) => (
        <span className="font-medium text-primary">{item.credits_cost}</span>
      ),
    },
    {
      key: "createdAt",
      header: "تاريخ الإنشاء",
      render: (item: typeof requests[0]) => (
        <span className="text-sm text-muted-foreground">{formatDate(item.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "الإجراءات",
      render: (item: typeof requests[0]) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" title="عرض" onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/requests/${item.id}`);
          }}>
            <Eye className="w-4 h-4" />
          </Button>
          {item.status === "submitted" && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-success"
                title="موافقة"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextStatus = item.source === "portfolio_purchase" ? "assigned" : "approved";
                  updateStatusMutation.mutate({ id: item.id, status: nextStatus, request: item });
                }}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                title="طلب معلومات"
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatusMutation.mutate({ id: item.id, status: "needs_info", request: item });
                }}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          {item.status === "approved" && (
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="text-primary" 
              title="تعيين"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Open assignment modal
                updateStatusMutation.mutate({ id: item.id, status: "assigned", request: item });
              }}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const statusCounts = {
    all: requests.length,
    submitted: requests.filter(r => r.status === "submitted").length,
    needs_info: requests.filter(r => r.status === "needs_info").length,
    approved: requests.filter(r => r.status === "approved").length,
    assigned: requests.filter(r => r.status === "assigned").length,
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="قائمة الطلبات">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="قائمة الطلبات"
      subtitle="إدارة ومراجعة جميع طلبات العملاء"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant={statusFilter === "all" ? "subtle" : "ghost"} 
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            الكل ({statusCounts.all})
          </Button>
          <Button 
            variant={statusFilter === "submitted" ? "subtle" : "ghost"} 
            size="sm"
            onClick={() => setStatusFilter("submitted")}
          >
            جديدة ({statusCounts.submitted})
          </Button>
          <Button 
            variant={statusFilter === "needs_info" ? "subtle" : "ghost"} 
            size="sm"
            onClick={() => setStatusFilter("needs_info")}
          >
            تحتاج معلومات ({statusCounts.needs_info})
          </Button>
          <Button 
            variant={statusFilter === "approved" ? "subtle" : "ghost"} 
            size="sm"
            onClick={() => setStatusFilter("approved")}
          >
            معتمدة ({statusCounts.approved})
          </Button>
          <Button 
            variant={statusFilter === "assigned" ? "subtle" : "ghost"} 
            size="sm"
            onClick={() => setStatusFilter("assigned")}
          >
            معينة ({statusCounts.assigned})
          </Button>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 ml-2" />
          فلترة
        </Button>
      </div>

      <div className="card-elevated">
        <DataTable
          columns={columns}
          data={requests}
          searchPlaceholder="ابحث بالعنوان أو رقم الطلب أو اسم العميل..."
          onRowClick={(item) => navigate(`/admin/requests/${item.id}`)}
          emptyTitle="لا توجد طلبات"
          emptyDescription="لم يتم العثور على أي طلبات"
        />
      </div>
    </DashboardLayout>
  );
}
