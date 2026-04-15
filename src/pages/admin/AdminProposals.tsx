import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, User, DollarSign, Calendar } from "lucide-react";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", variant: "secondary" },
  accepted: { label: "مقبول", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

export default function AdminProposals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["admin-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_proposals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch request titles
  const requestIds = [...new Set(proposals.map((p: any) => p.request_id))];
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-proposal-requests", requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return [];
      const { data } = await supabase
        .from("requests")
        .select("id, title, request_number")
        .in("id", requestIds);
      return data || [];
    },
    enabled: requestIds.length > 0,
  });

  // Fetch freelancer names
  const freelancerIds = [...new Set(proposals.map((p: any) => p.freelancer_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-proposal-profiles", freelancerIds],
    queryFn: async () => {
      if (freelancerIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", freelancerIds);
      return data || [];
    },
    enabled: freelancerIds.length > 0,
  });

  const getRequestTitle = (id: string) =>
    requests.find((r: any) => r.id === id)?.title || "—";
  const getFreelancerName = (id: string) =>
    profiles.find((p: any) => p.user_id === id)?.full_name || "فريلانسر";

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("marketplace_proposals")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.status === "accepted" 
          ? "✅ تم قبول العرض وتعيين الفريلانسر تلقائياً" 
          : "تم تحديث حالة العرض" 
      });
      queryClient.invalidateQueries({ queryKey: ["admin-proposals"] });
    },
  });

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة العروض"
      subtitle="مراجعة عروض الفريلانسرز على مشاريع الماركت بلايس"
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">لا توجد عروض حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal: any) => {
            const st = statusMap[proposal.status] || statusMap.pending;
            return (
              <Card key={proposal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {getRequestTitle(proposal.request_id)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {getFreelancerName(proposal.freelancer_id)}
                      </p>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {proposal.cover_letter && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {proposal.cover_letter}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                    {proposal.proposed_price && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        {proposal.proposed_price} ج.م
                      </span>
                    )}
                    {proposal.proposed_days && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {proposal.proposed_days} يوم
                      </span>
                    )}
                  </div>
                  {proposal.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus.mutate({ id: proposal.id, status: "accepted" })
                        }
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                        قبول
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          updateStatus.mutate({ id: proposal.id, status: "rejected" })
                        }
                        disabled={updateStatus.isPending}
                      >
                        <XCircle className="w-3.5 h-3.5 ml-1" />
                        رفض
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
