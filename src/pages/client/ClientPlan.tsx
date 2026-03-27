import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle2, 
  Crown, 
  Loader2,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function ClientPlan() {
  const { user } = useAuth();

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["client-subscription", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["all-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const currentPlan = subscription?.plans as any;

  if (subLoading || plansLoading) {
    return (
      <DashboardLayout
        sidebar={<ClientSidebar />}
        title="باقتي"
        subtitle="إدارة اشتراكك والترقية"
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="باقتي"
      subtitle="إدارة اشتراكك والترقية"
    >
      {/* Current Subscription */}
      {subscription && currentPlan && (
        <div className="card-elevated p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{currentPlan.name}</h3>
                <p className="text-sm text-muted-foreground">{currentPlan.name_ar}</p>
              </div>
            </div>
            {subscription.expires_at && (
              <p className="text-sm text-muted-foreground">
                تنتهي في: {format(new Date(subscription.expires_at), "dd MMM yyyy", { locale: ar })}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-4 gap-6 p-4 bg-muted/50 rounded-xl">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{subscription.credits_remaining}</p>
              <p className="text-sm text-muted-foreground">كريديت متبقي</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{currentPlan.credits_per_month}</p>
              <p className="text-sm text-muted-foreground">كريديت شهري</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {currentPlan.revisions_limit - subscription.revisions_used}
              </p>
              <p className="text-sm text-muted-foreground">تعديلات متبقية</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{currentPlan.sla_hours || "∞"}</p>
              <p className="text-sm text-muted-foreground">ساعة SLA</p>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <h3 className="text-lg font-semibold text-foreground mb-4">الباقات المتاحة</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans?.map((plan) => {
          const isCurrentPlan = currentPlan?.id === plan.id;
          const features = (plan.features as any[]) || [];

          return (
            <div
              key={plan.id}
              className={cn(
                "card-elevated p-6 relative",
                isCurrentPlan && "ring-2 ring-primary border-primary"
              )}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                  باقتك الحالية
                </div>
              )}

              {plan.is_free && (
                <span className="inline-block bg-success/10 text-success text-xs px-2 py-1 rounded-full mb-3">
                  مجاني
                </span>
              )}

              <h4 className="text-xl font-bold text-foreground">{plan.name}</h4>
              <p className="text-sm text-muted-foreground mb-4">{plan.name_ar}</p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">ج.م/شهر</span>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>{plan.credits_per_month} كريديت شهري</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>{plan.revisions_limit} تعديلات</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>حجم مهمة: {
                    plan.max_task_size === "micro" ? "صغيرة جداً" :
                    plan.max_task_size === "small" ? "صغيرة" :
                    plan.max_task_size === "medium" ? "متوسطة" : "كبيرة"
                  }</span>
                </li>
                {plan.sla_hours && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span>SLA: {plan.sla_hours} ساعة</span>
                  </li>
                )}
                {plan.priority_assignment && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span>أولوية في التعيين</span>
                  </li>
                )}
                {features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={isCurrentPlan ? "outline" : "default"}
                disabled={isCurrentPlan}
                asChild={!isCurrentPlan}
              >
                {isCurrentPlan ? (
                  <span>الباقة الحالية</span>
                ) : (
                  <Link to={`/client/checkout?plan=${plan.id}`}>
                    ترقية
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </Link>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
