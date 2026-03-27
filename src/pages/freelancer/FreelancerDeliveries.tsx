import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Package,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function FreelancerDeliveries() {
  const { user } = useAuth();

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["freelancer-all-deliveries", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries")
        .select(`
          *,
          requests(id, title, request_number, status),
          assignments(id, payment_amount)
        `)
        .eq("freelancer_id", user?.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />;
      case "approved":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "resubmitted":
        return <RefreshCw className="w-4 h-4 text-info" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "قيد المراجعة";
      case "approved":
        return "مقبول";
      case "rejected":
        return "مرفوض";
      case "resubmitted":
        return "معاد تقديمه";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/10 text-warning";
      case "approved":
        return "bg-success/10 text-success";
      case "rejected":
        return "bg-destructive/10 text-destructive";
      case "resubmitted":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const pendingDeliveries = deliveries?.filter(d => d.status === "pending") || [];
  const approvedDeliveries = deliveries?.filter(d => d.status === "approved") || [];
  const rejectedDeliveries = deliveries?.filter(d => ["rejected", "resubmitted"].includes(d.status)) || [];

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="التسليمات">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const DeliveryCard = ({ delivery }: { delivery: any }) => {
    const request = delivery.requests;
    const assignment = delivery.assignments;
    const files = (delivery.files || []) as any[];

    return (
      <div className="card-elevated p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-muted-foreground">
                {request?.request_number}
              </span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full flex items-center gap-1",
                getStatusColor(delivery.status)
              )}>
                {getStatusIcon(delivery.status)}
                {getStatusLabel(delivery.status)}
              </span>
            </div>
            <h4 className="font-semibold text-foreground">{request?.title}</h4>
          </div>
          <span className="text-sm font-medium text-primary">
            Revision {delivery.revision_number}
          </span>
        </div>

        {delivery.notes && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {delivery.notes}
          </p>
        )}

        {delivery.qc_notes && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">ملاحظات المراجعة:</p>
            <p className="text-sm text-foreground">{delivery.qc_notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {files.length} ملف
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(delivery.created_at), "dd MMM", { locale: ar })}
            </span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/freelancer/tasks/${assignment?.id}`}>
              <Eye className="w-4 h-4" />
              عرض التفاصيل
            </Link>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="التسليمات"
      subtitle="متابعة حالة تسليماتك ومراجعات الجودة"
    >
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            قيد المراجعة ({pendingDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            مقبولة ({approvedDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            تحتاج تعديل ({rejectedDeliveries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingDeliveries.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingDeliveries.map((delivery) => (
                <DeliveryCard key={delivery.id} delivery={delivery} />
              ))}
            </div>
          ) : (
            <div className="card-elevated p-12 text-center">
              <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد تسليمات قيد المراجعة</h3>
              <p className="text-muted-foreground">ستظهر هنا التسليمات في انتظار مراجعة الجودة</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedDeliveries.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedDeliveries.map((delivery) => (
                <DeliveryCard key={delivery.id} delivery={delivery} />
              ))}
            </div>
          ) : (
            <div className="card-elevated p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد تسليمات مقبولة</h3>
              <p className="text-muted-foreground">ستظهر هنا التسليمات التي تمت الموافقة عليها</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedDeliveries.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rejectedDeliveries.map((delivery) => (
                <DeliveryCard key={delivery.id} delivery={delivery} />
              ))}
            </div>
          ) : (
            <div className="card-elevated p-12 text-center">
              <XCircle className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد تسليمات مرفوضة</h3>
              <p className="text-muted-foreground">ممتاز! لا توجد تسليمات تحتاج تعديل</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
