import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Calendar,
  CheckCircle2,
  Loader2,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilePreview } from "@/components/files/FilePreview";
export default function FreelancerPending() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["freelancer-pending-assignments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select(`
          *,
          requests(
            id,
            title,
            description,
            status,
            deadline,
            request_number,
            size,
            credits_cost,
            files,
            admin_notes
          )
        `)
        .eq("freelancer_id", user?.id)
        .eq("is_active", true)
        .is("started_at", null)
        .order("assigned_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const startTaskMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("assignments")
        .update({
          started_at: now,
          freelancer_accepted: true,
          freelancer_accepted_at: now,
        })
        .eq("id", assignmentId);

      if (error) throw error;

      const assignment = assignments?.find((a) => a.id === assignmentId);
      if (assignment) {
        await supabase
          .from("requests")
          .update({ status: "in_progress" })
          .eq("id", assignment.request_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-pending-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["freelancer-assignments"] });
      setDetailsOpen(false);
      setSelectedAssignment(null);
      toast({ title: "تم بدء العمل على المهمة! ✅" });
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("assignments")
        .update({
          freelancer_accepted: false,
          freelancer_accepted_at: now,
          is_active: false,
        })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-pending-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["freelancer-assignments"] });
      setDetailsOpen(false);
      setSelectedAssignment(null);
      toast({ title: "تم رفض المهمة، سيتم إخطار الإدارة" });
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="المهام المعلقة"
      subtitle="المهام المسندة إليك في انتظار بدء العمل"
    >
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
      ) : assignments && assignments.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => {
            const request = assignment.requests as any;

            return (
              <div key={assignment.id} className="card-elevated p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-sm text-muted-foreground font-mono">
                      {request?.request_number}
                    </span>
                    <h4 className="font-semibold text-foreground mt-1">{request?.title}</h4>
                  </div>
                  <span className="bg-warning/10 text-warning text-xs px-2 py-1 rounded-full">
                    في الانتظار
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {request?.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {request?.deadline 
                      ? format(new Date(request.deadline), "dd MMM", { locale: ar })
                      : "بدون موعد"
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

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      setDetailsOpen(true);
                    }}
                  >
                    <ClipboardList className="w-4 h-4" />
                    عرض التفاصيل
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <ClipboardList className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد مهام معلقة</h3>
          <p className="text-muted-foreground">ستظهر هنا المهام الجديدة المسندة إليك</p>
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل المهمة</DialogTitle>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4">
              {(() => {
                const request = selectedAssignment.requests as any;
                return (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground font-mono">
                          {request?.request_number}
                        </span>
                        <h4 className="font-semibold text-foreground mt-1">{request?.title}</h4>
                      </div>
                      <span className="bg-warning/10 text-warning text-xs px-2 py-1 rounded-full">
                        في الانتظار
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {request?.description}
                    </p>

                    <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {request?.deadline
                            ? format(new Date(request.deadline), "dd MMM yyyy", { locale: ar })
                            : "بدون موعد"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {request?.size === "micro"
                            ? "صغيرة جداً"
                            : request?.size === "small"
                            ? "صغيرة"
                            : request?.size === "medium"
                            ? "متوسطة"
                            : "كبيرة"}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-success text-left">
                        {selectedAssignment.payment_amount} ج.م
                      </div>
                    </div>

                    {request?.admin_notes && (
                      <div className="p-3 rounded-md bg-muted">
                        <h5 className="text-sm font-semibold mb-1">ملاحظات الإدارة</h5>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {request.admin_notes}
                        </p>
                      </div>
                    )}

                    {request?.files && Array.isArray(request.files) && (request.files as any[]).length > 0 && (
                      <div className="card-elevated p-4">
                        <h5 className="text-sm font-semibold mb-3">ملفات المشروع</h5>
                        <FilePreview
                          files={(request.files as any[]).map((f: any) => ({
                            name: f.name,
                            size: f.size,
                            type: f.type,
                            path: f.url || f.path,
                          }))}
                          bucket="request-files"
                          title="ملفات الطلب"
                        />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border mt-4">
                      <Button
                        className="flex-1"
                        onClick={() =>
                          startTaskMutation.mutate(selectedAssignment.id)
                        }
                        disabled={startTaskMutation.isPending}
                      >
                        {startTaskMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            قبول وبدء العمل
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          rejectAssignmentMutation.mutate(selectedAssignment.id)
                        }
                        disabled={rejectAssignmentMutation.isPending}
                      >
                        {rejectAssignmentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "رفض المهمة"
                        )}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
