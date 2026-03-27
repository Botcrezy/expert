import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle, 
  XCircle,
  UserCheck,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AdminVerifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingVerifications, isLoading } = useQuery({
    queryKey: ["pending-verifications"],
    queryFn: async () => {
      const { data: freelancers } = await supabase
        .from("freelancer_profiles")
        .select("id, user_id, verification_status, created_at, is_verified")
        .eq("verification_status", "pending")
        .order("created_at", { ascending: true });
      return freelancers || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-verifications"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, full_name, email");
      return data || [];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("freelancer_profiles")
        .update({
          verification_status: status,
          is_verified: status === "approved",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-verifications"] });
      toast({ title: "تم تحديث حالة التحقق ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getProfile = (userId: string) => profiles?.find(p => p.user_id === userId);

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="طلبات التحقق"
      subtitle="مراجعة طلبات التحقق من الهوية"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingVerifications?.length || 0}</p>
                <p className="text-sm text-muted-foreground">في انتظار التحقق</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">طلبات التحقق</p>
                <p className="text-sm text-muted-foreground">مراجعة بيانات المستخدمين</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verifications Table */}
        <div className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>تاريخ الطلب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : pendingVerifications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد طلبات تحقق معلقة</p>
                  </TableCell>
                </TableRow>
              ) : (
                pendingVerifications?.map((verification) => {
                  const profile = getProfile(verification.user_id);
                  return (
                    <TableRow key={verification.id}>
                      <TableCell className="font-medium">
                        {profile?.full_name || "غير معروف"}
                      </TableCell>
                      <TableCell>{profile?.email || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(verification.created_at), "dd MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-warning/10 text-warning">في الانتظار</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90"
                            onClick={() => verifyMutation.mutate({ id: verification.id, status: "approved" })}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => verifyMutation.mutate({ id: verification.id, status: "rejected" })}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                        </div>
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
