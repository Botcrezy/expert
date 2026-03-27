import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  ClipboardList, 
  Calendar,
  Clock,
  CheckCircle2,
  Upload
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function FreelancerTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["freelancer-assignments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select(
          `
          *,
          requests(
            id,
            title,
            description,
            status,
            deadline,
            category_id,
            request_number,
            size,
            source,
            agreed_price_egp
          )
        `
        )
        .eq("freelancer_id", user?.id)
        .order("assigned_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const activeTasks =
    assignments?.filter((a) => {
      const status = (a.requests as any)?.status;
      return a.is_active === true && !["completed", "cancelled"].includes(status);
    }) || [];

  const completedTasks =
    assignments?.filter((a) => {
      const status = (a.requests as any)?.status;
      return status === "completed" || Boolean(a.completed_at);
    }) || [];

  const salesTasks =
    assignments?.filter((a) => (a.requests as any)?.source === "portfolio_purchase") || [];

  const TaskCard = ({ assignment }: { assignment: any }) => {
    const request = assignment.requests;

    return (
      <div className="card-elevated p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-sm text-muted-foreground font-mono">{request?.request_number}</span>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <h4 className="font-semibold text-foreground">{request?.title}</h4>
              {request?.source === "portfolio_purchase" && (
                <Badge variant="secondary">اتفاق ثابت</Badge>
              )}
            </div>
          </div>
          <StatusBadge status={request?.status} />
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {request?.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {request?.deadline 
              ? format(new Date(request.deadline), "dd MMM", { locale: ar })
              : "لا يوجد موعد"
            }
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {request?.size === "micro" ? "صغيرة جداً" :
             request?.size === "small" ? "صغيرة" :
             request?.size === "medium" ? "متوسطة" : "كبيرة"}
          </span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="font-semibold text-success">{assignment.payment_amount} ج.م</span>

          {(() => {
            const canStart = !["submitted", "needs_info"].includes(request?.status);

            if (!assignment.started_at) {
              if (!canStart) {
                return (
                  <span className="text-sm text-muted-foreground">
                    بانتظار موافقة الإدارة
                  </span>
                );
              }

              return (
                <Button
                  size="sm"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("assignments")
                      .update({ started_at: new Date().toISOString() })
                      .eq("id", assignment.id);

                    if (error) {
                      toast({
                        title: "تعذر بدء العمل",
                        description: error.message,
                        variant: "destructive",
                      });
                      return;
                    }

                    navigate(`/freelancer/tasks/${assignment.id}`);
                  }}
                >
                  <Clock className="w-4 h-4" />
                  بدء العمل
                </Button>
              );
            }

            if (request?.status === "completed" || assignment.completed_at) {
              return (
                <span className="flex items-center gap-1 text-success text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  مكتمل
                </span>
              );
            }

            return (
              <Button size="sm" onClick={() => navigate(`/freelancer/tasks/${assignment.id}`)}>
                <Upload className="w-4 h-4" />
                تسليم العمل
              </Button>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="المهام"
      subtitle="إدارة مهامك وتسليماتك"
    >
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Clock className="w-4 h-4" />
            نشطة ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            مبيعات الخدمات ({salesTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            مكتملة ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="card-elevated p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : activeTasks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTasks.map((assignment) => (
                <TaskCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <ClipboardList className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد مهام نشطة</h3>
              <p className="text-muted-foreground">ستظهر هنا المهام المسندة إليك</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sales">
          {salesTasks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {salesTasks.map((assignment) => (
                <TaskCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <ClipboardList className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد مبيعات خدمات</h3>
              <p className="text-muted-foreground">ستظهر هنا مشتريات الخدمات من البورتفوليو</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedTasks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedTasks.map((assignment) => (
                <TaskCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <CheckCircle2 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد مهام مكتملة</h3>
              <p className="text-muted-foreground">ستظهر هنا المهام التي أكملتها</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
