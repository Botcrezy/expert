import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";

export default function AdminFixedAgreements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [onlyNeedsBrief, setOnlyNeedsBrief] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-fixed-agreements", onlyNeedsBrief],
    queryFn: async () => {
      let q = supabase
        .from("requests")
        .select(
          "id,title,request_number,status,created_at,user_id,preferred_freelancer_id,agreed_price_egp,payment_order_id,source"
        )
        .eq("source", "portfolio_purchase")
        .order("created_at", { ascending: false });

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const requestIds = useMemo(() => requests.map((r: any) => r.id), [requests]);

  const { data: briefs = [] } = useQuery({
    queryKey: ["admin-fixed-agreements-briefs", requestIds.join(",")],
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

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of requests as any[]) {
      if (r.user_id) ids.add(r.user_id);
      if (r.preferred_freelancer_id) ids.add(r.preferred_freelancer_id);
    }
    return Array.from(ids);
  }, [requests]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-fixed-agreements-profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,full_name")
        .in("user_id", userIds);
      if (error) throw error;
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const orderIds = useMemo(
    () => Array.from(new Set((requests as any[]).map((r) => r.payment_order_id).filter(Boolean))),
    [requests]
  );

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-fixed-agreements-orders", orderIds.join(",")],
    queryFn: async () => {
      if (orderIds.length === 0) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id,status,order_number,total")
        .in("id", orderIds);
      if (error) throw error;
      return data || [];
    },
    enabled: orderIds.length > 0,
  });

  const orderById = useMemo(() => {
    const m = new Map<string, any>();
    for (const o of orders as any[]) m.set(o.id, o);
    return m;
  }, [orders]);

  const nameOf = (uid?: string | null) => (profiles as any[]).find((p) => p.user_id === uid)?.full_name || "—";

  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      if (!user) throw new Error("غير مصرح");
      const hasBrief = briefsSet.has(request.id);
      if (!hasBrief) throw new Error("لا يمكن الاعتماد قبل استلام بيانات العميل (Brief)");

      // Create assignment (idempotent) if missing
      if (request?.preferred_freelancer_id) {
        const { data: existingAssignment, error: existingError } = await supabase
          .from("assignments")
          .select("id")
          .eq("request_id", request.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (existingError) throw existingError;

        if (!existingAssignment) {
          const { error: insertError } = await supabase.from("assignments").insert({
            request_id: request.id,
            freelancer_id: request.preferred_freelancer_id,
            payment_amount: Number(request.agreed_price_egp || 0),
            assigned_by: user.id,
            is_active: true,
          } as any);
          if (insertError) throw insertError;
        }
      }

      const { error } = await supabase.from("requests").update({ status: "assigned" }).eq("id", request.id);
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: "approve_fixed_agreement",
        entity_type: "request",
        entity_id: request.id,
        old_values: { status: request.status, request_number: request.request_number },
        new_values: { status: "assigned", request_number: request.request_number, source: request.source },
        user_id: user.id,
      });

      if (request?.preferred_freelancer_id) {
        await supabase.from("notifications").insert({
          user_id: request.preferred_freelancer_id,
          type: "admin_approved",
          title: "تم اعتماد الاتفاق الثابت من الإدارة",
          body: request.title,
          reference_type: "request",
          reference_id: request.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fixed-agreements"] });
      toast({ title: "تم اعتماد الاتفاق الثابت ✅" });
    },
    onError: (e: any) => toast({ title: "تعذر الاعتماد", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    if (!onlyNeedsBrief) return requests;
    return (requests as any[]).filter((r) => !briefsSet.has(r.id));
  }, [requests, onlyNeedsBrief, briefsSet]);

  return (
    <DashboardLayout sidebar={<AdminSidebar />} title="الاتفاقات الثابتة" subtitle="متابعة مشتريات الخدمات من البورتفوليو">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={onlyNeedsBrief ? "default" : "outline"}
            onClick={() => setOnlyNeedsBrief((v) => !v)}
            className="gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {onlyNeedsBrief ? "عرض الكل" : "فقط التي تحتاج Brief"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated p-10 text-center text-muted-foreground">لا توجد اتفاقات ثابتة حالياً.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r: any) => {
            const hasBrief = briefsSet.has(r.id);
            const order = r.payment_order_id ? orderById.get(r.payment_order_id) : null;

            return (
              <div key={r.id} className="card-elevated p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
                      {order && (
                        <Badge variant={order.status === "paid" ? "default" : "outline"}>
                          دفع: {order.status}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mt-1">{r.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      العميل: {nameOf(r.user_id)} — الفريلانسر: {nameOf(r.preferred_freelancer_id)} — السعر: {Number(r.agreed_price_egp || 0).toLocaleString()} ج.م
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={r.status} />
                    <Button variant="outline" onClick={() => navigate(`/admin/requests/${r.id}`)}>
                      فتح التفاصيل
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </Button>

                    {order && (
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/admin/orders?search=${encodeURIComponent(order.order_number)}`)}
                        className="gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        فتح الدفع
                      </Button>
                    )}

                    {r.status === "submitted" && (
                      <Button
                        onClick={() => approveMutation.mutate(r)}
                        disabled={approveMutation.isPending}
                        className="gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        اعتماد
                      </Button>
                    )}
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
