import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Clock, DollarSign, Calendar, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", variant: "secondary" },
  accepted: { label: "مقبول", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

export default function FreelancerProposals() {
  const { user } = useAuth();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["freelancer-proposals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("marketplace_proposals")
        .select("*")
        .eq("freelancer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const requestIds = [...new Set(proposals.map((p: any) => p.request_id))];
  const { data: requests = [] } = useQuery({
    queryKey: ["freelancer-proposal-requests", requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return [];
      const { data } = await supabase
        .from("requests")
        .select("id, title")
        .in("id", requestIds);
      return data || [];
    },
    enabled: requestIds.length > 0,
  });

  const getRequestTitle = (id: string) =>
    requests.find((r: any) => r.id === id)?.title || "مشروع";

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="عروضي"
      subtitle="العروض التي قدمتها على مشاريع الماركت بلايس"
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">لم تقدم أي عروض بعد</p>
          <Button asChild>
            <Link to="/marketplace">تصفح المشاريع المتاحة</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal: any) => {
            const st = statusMap[proposal.status] || statusMap.pending;
            return (
              <Card key={proposal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">
                      {getRequestTitle(proposal.request_id)}
                    </CardTitle>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {proposal.cover_letter && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {proposal.cover_letter}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
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
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(proposal.created_at).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                    {proposal.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-3 bg-muted/50 p-2 rounded">
                        ملاحظات: {proposal.admin_notes}
                      </p>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <Link to={`/freelancer/proposals/${proposal.id}`}>
                          <Eye className="w-4 h-4" />
                          قراءة المزيد
                        </Link>
                      </Button>
                    </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
