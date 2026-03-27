import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loader2, Package, ArrowRight, AlertCircle } from "lucide-react";

export default function ClientPurchasedServices() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["client-purchased-services", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("requests")
        .select("id,title,request_number,status,created_at,agreed_price_egp,source")
        .eq("user_id", user.id)
        .eq("source", "portfolio_purchase")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const requestIds = useMemo(() => requests.map((r: any) => r.id), [requests]);

  const { data: briefs = [] } = useQuery({
    queryKey: ["client-purchased-services-briefs", requestIds.join(",")],
    queryFn: async () => {
      if (requestIds.length === 0) return [];
      const { data, error } = await supabase
        .from("request_briefs")
        .select("request_id")
        .in("request_id", requestIds);
      if (error) throw error;
      return data || [];
    },
    enabled: requestIds.length > 0,
  });

  const briefsSet = useMemo(() => new Set((briefs as any[]).map((b) => b.request_id)), [briefs]);

  return (
    <DashboardLayout sidebar={<ClientSidebar />} title="خدماتي المشتراة" subtitle="متابعة خدمات الاتفاق الثابت التي اشتريتها">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد خدمات مشتراة حتى الآن.</p>
          <Button className="mt-4" onClick={() => navigate("/freelancers")}>
            تصفح الفريلانسرز
            <ArrowRight className="w-4 h-4 mr-2" />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r: any) => {
            const hasBrief = briefsSet.has(r.id);
            return (
              <div key={r.id} className="card-elevated p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">{r.request_number}</span>
                      <Badge variant="secondary">اتفاق ثابت</Badge>
                      {!hasBrief && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="w-3 h-3" />
                          مطلوب بيانات
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mt-1">{r.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      السعر المتفق عليه: {Number(r.agreed_price_egp || 0).toLocaleString()} ج.م
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <Button onClick={() => navigate(`/client/requests/${r.id}`)}>
                      فتح التفاصيل
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
