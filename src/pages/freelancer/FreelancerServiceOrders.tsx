import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loader2, Briefcase, ArrowRight, AlertCircle } from "lucide-react";

export default function FreelancerServiceOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["freelancer-service-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("assignments")
        .select(
          `id,request_id,assigned_at,started_at,is_active,
           requests(id,title,request_number,status,source,agreed_price_egp,user_id)`
        )
        .eq("freelancer_id", user.id)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data || []).filter((a: any) => (a.requests as any)?.source === "portfolio_purchase");
    },
    enabled: !!user,
  });

  const clientIds = useMemo(
    () => Array.from(new Set(assignments.map((a: any) => (a.requests as any)?.user_id).filter(Boolean))),
    [assignments]
  );

  const { data: clients = [] } = useQuery({
    queryKey: ["freelancer-service-orders-clients", clientIds.join(",")],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,full_name")
        .in("user_id", clientIds);
      if (error) throw error;
      return data || [];
    },
    enabled: clientIds.length > 0,
  });

  const requestIds = useMemo(
    () => assignments.map((a: any) => (a.requests as any)?.id).filter(Boolean),
    [assignments]
  );

  const { data: briefs = [] } = useQuery({
    queryKey: ["freelancer-service-orders-briefs", requestIds.join(",")],
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
  const clientName = (userId: string) => (clients as any[]).find((c) => c.user_id === userId)?.full_name || "عميل";

  return (
    <DashboardLayout sidebar={<FreelancerSidebar />} title="طلبات خدماتي" subtitle="طلبات الاتفاق الثابت القادمة من بورتفوليو خدماتك">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <Briefcase className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد طلبات خدمات حتى الآن.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a: any) => {
            const r = a.requests as any;
            const hasBrief = briefsSet.has(r.id);
            return (
              <div key={a.id} className="card-elevated p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">{r.request_number}</span>
                      <Badge variant="secondary">اتفاق ثابت</Badge>
                      {!hasBrief && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="w-3 h-3" />
                          بانتظار بيانات العميل
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mt-1">{r.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      العميل: {clientName(r.user_id)} — السعر: {Number(r.agreed_price_egp || 0).toLocaleString()} ج.م
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <Button onClick={() => navigate(`/freelancer/tasks/${a.id}`)}>
                      فتح الطلب
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
