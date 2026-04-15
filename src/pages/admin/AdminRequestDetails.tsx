import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { calculateSmartPrice } from "@/lib/smartPricing";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Loader2, Clock, User, FileText, UserPlus, MessageSquare, AlertTriangle, CheckCircle2, XCircle, Star, Briefcase, Users } from "lucide-react";
import { format, isValid } from "date-fns";
import { ar } from "date-fns/locale";
import { FilePreview } from "@/components/files/FilePreview";
import { AdminChatBox } from "@/components/chat/AdminChatBox";
import { ProjectTasksManager } from "@/components/admin/ProjectTasksManager";
import { FileUploadAdvanced } from "@/components/ui/FileUploadAdvanced";
import { RequestBriefCard, type RequestBrief } from "@/components/requests/RequestBriefCard";
import { DeliveryLinksDisplay, type DeliveryLink } from "@/components/delivery/DeliveryLinksInput";

// Helper function to safely format dates
const safeFormatDate = (dateString: string | null | undefined, formatStr: string = "d MMMM yyyy") => {
  if (!dateString) return "غير محدد";
  try {
    const date = new Date(dateString);
    if (!isValid(date) || date.getFullYear() > 2100 || date.getFullYear() < 1900) {
      return "تاريخ غير صالح";
    }
    return format(date, formatStr, { locale: ar });
  } catch {
    return "تاريخ غير صالح";
  }
};

const statusLabels: Record<string, { label: string; color: string }> = {
  submitted: { label: "مُقدَّم", color: "bg-blue-100 text-blue-700" },
  needs_info: { label: "يحتاج معلومات", color: "bg-orange-100 text-orange-700" },
  approved: { label: "معتمد", color: "bg-green-100 text-green-700" },
  assigned: { label: "مُعيَّن", color: "bg-purple-100 text-purple-700" },
  in_progress: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-700" },
  ready_for_qc: { label: "جاهز للمراجعة", color: "bg-cyan-100 text-cyan-700" },
  qc_rejected: { label: "مرفوض من QC", color: "bg-red-100 text-red-700" },
  delivered_to_client: { label: "تم التسليم", color: "bg-teal-100 text-teal-700" },
  revision_requested: { label: "طلب تعديل", color: "bg-amber-100 text-amber-700" },
  completed: { label: "مكتمل", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ملغي", color: "bg-gray-100 text-gray-700" },
};

export default function AdminRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState("");
  const [showAllFreelancers, setShowAllFreelancers] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [customPaymentAmount, setCustomPaymentAmount] = useState<number | "">("");
  const [smartPricing, setSmartPricing] = useState<{
    suggested_price: number;
    min_price: number;
    max_price: number;
    reasoning: string;
    complexity_level?: string;
    estimated_hours?: number;
    source?: string;
  } | null>(null);
  const [isAiPricing, setIsAiPricing] = useState(false);
  const [suggestedFreelancers, setSuggestedFreelancers] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showNeedsInfoDialog, setShowNeedsInfoDialog] = useState(false);
  const [needsInfoText, setNeedsInfoText] = useState("");
  const [needsInfoFiles, setNeedsInfoFiles] = useState<any[]>([]);

  // Fetch request details with category
  const { data: request, isLoading } = useQuery({
    queryKey: ["admin-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(`*, categories (id, name, name_ar, icon)`)
        .eq("id", id)
        .single();
      if (error) throw error;
      
      // Fetch client profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", data.user_id)
        .single();
      
      // Fetch current assignment if exists
      const { data: assignment } = await supabase
        .from("assignments")
        .select("*")
        .eq("request_id", id)
        .eq("is_active", true)
        .maybeSingle();
      
      let assignedFreelancer = null;
      if (assignment) {
        const { data: freelancerProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", assignment.freelancer_id)
          .single();
        assignedFreelancer = freelancerProfile;
      }
      
      return { ...data, client: profile, assignment, assignedFreelancer };
    },
    enabled: !!id,
  });

  // Fetch ALL verified freelancers (admin can assign anyone)
  const { data: allFreelancers } = useQuery({
    queryKey: ["all-verified-freelancers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("is_verified", true);

      if (!data || data.length === 0) return [];

      const userIds = data.map((f) => f.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      return data.map((f) => ({
        ...f,
        name: profiles?.find((p) => p.user_id === f.user_id)?.full_name || "غير معروف",
        email: profiles?.find((p) => p.user_id === f.user_id)?.email,
      }));
    },
  });

  const { data: categoriesMap } = useQuery({
    queryKey: ["categories-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;

      return (data || []).reduce<Record<string, string>>((acc, c) => {
        acc[c.id] = c.name_ar;
        return acc;
      }, {});
    },
  });

  const { data: pricingSettings } = useQuery({
    queryKey: ["pricing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "credit_to_egp_rate")
        .maybeSingle();
      if (error) throw error;

      let creditToEgp = 50;
      const rawValue = (data as any)?.value;

      if (typeof rawValue === "number") {
        creditToEgp = rawValue;
      } else if (typeof rawValue === "string") {
        try {
          const parsed = JSON.parse(rawValue);
          if (typeof parsed === "number") {
            creditToEgp = parsed;
          } else {
            const num = parseFloat(rawValue);
            if (!isNaN(num)) creditToEgp = num;
          }
        } catch {
          const num = parseFloat(rawValue);
          if (!isNaN(num)) creditToEgp = num;
        }
      }

      return { creditToEgp };
    },
  });

  // Client financial summary for this request
  const { data: clientStats } = useQuery({
    queryKey: ["admin-client-stats", request?.user_id],
    queryFn: async () => {
      if (!request) return null;
      const userId = request.user_id;

      // Active subscription with plan details
      const { data: subscription } = await supabase
        .from("client_subscriptions")
        .select("*, plans(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      // Credits ledger to compute current balance and request usage
      const { data: creditsLedger } = await supabase
        .from("credits_ledger")
        .select("amount, balance_after, reference_type, reference_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const currentCredits = creditsLedger?.[0]?.balance_after || 0;
      const totalCreditsSpent =
        creditsLedger?.filter((t) => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0) || 0;

      const requestCreditsEntry = creditsLedger?.find(
        (t) => t.reference_type === "request" && t.reference_id === request.id
      );
      const requestCreditsUsed = requestCreditsEntry ? Math.abs(requestCreditsEntry.amount) : request.credits_cost || 0;

      // Orders to compute total money paid by client
      const { data: orders } = await supabase
        .from("orders")
        .select("total")
        .eq("user_id", userId);

      const totalPaidEgp = orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0;

      return {
        subscription,
        currentCredits,
        totalCreditsSpent,
        totalPaidEgp,
        requestCreditsUsed,
      };
    },
    enabled: !!request?.user_id,
  });

  const sortedAllFreelancers = useMemo(() => {
    const list = [...(allFreelancers || [])];
    list.sort((a: any, b: any) => {
      const starsDiff = (b.stars || 0) - (a.stars || 0);
      if (starsDiff !== 0) return starsDiff;

      const completedDiff = (b.completed_tasks || 0) - (a.completed_tasks || 0);
      if (completedDiff !== 0) return completedDiff;

      return (a.name || "").localeCompare(b.name || "", "ar");
    });
    return list;
  }, [allFreelancers]);

  const categoryFreelancers = useMemo(() => {
    if (!request?.category_id) return [];
    return sortedAllFreelancers.filter((f: any) => f.categories?.includes(request.category_id));
  }, [sortedAllFreelancers, request?.category_id]);

  const hasCategoryMatch = categoryFreelancers.length > 0;
  const visibleFreelancers = request?.category_id
    ? (showAllFreelancers ? sortedAllFreelancers : categoryFreelancers)
    : sortedAllFreelancers;

  // Fetch deliveries
  const { data: deliveries } = useQuery({
    queryKey: ["request-deliveries", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: requestBrief } = useQuery({
    queryKey: ["request-brief", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("request_briefs")
        .select("*")
        .eq("request_id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as RequestBrief) || null;
    },
    enabled: !!id,
  });


  // Fetch request info requests and replies
  const { data: infoRequests } = useQuery({
    queryKey: ["admin-info-requests", id],
    queryFn: async () => {
      const { data: requests } = await supabase
        .from("request_info_requests")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: false });
      
      if (!requests || requests.length === 0) return [];
      
      // Fetch replies for each request
      const requestsWithReplies = await Promise.all(
        requests.map(async (req) => {
          const { data: replies } = await supabase
            .from("request_info_replies")
            .select("*")
            .eq("info_request_id", req.id)
            .order("created_at", { ascending: true });
          
          // Fetch admin profile
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", req.admin_id)
            .single();
          
          return {
            ...req,
            replies: replies || [],
            admin_name: adminProfile?.full_name || "غير معروف",
          };
        })
      );
      
      return requestsWithReplies;
    },
    enabled: !!id,
  });

  const needsInfoMutation = useMutation({
    mutationFn: async () => {
      if (!id || !request || !user) throw new Error("الطلب أو المستخدم غير متاح");

      const attachments = (needsInfoFiles || []).map((f: any) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        url: f.url ?? undefined,
        path: f.path ?? undefined,
      }));

      // استخدم جداول request_info_* الجديدة بدلاً من messages
      await supabase.from("request_info_requests").insert({
        request_id: id,
        admin_id: user.id,
        title: null,
        message: needsInfoText.trim(),
        attachments: attachments.length ? attachments : null,
        status: "pending",
      });

      const { error: statusError } = await supabase
        .from("requests")
        .update({ status: "needs_info" })
        .eq("id", id);
      if (statusError) throw statusError;

      if (request.user_id) {
        await supabase.from("notifications").insert({
          user_id: request.user_id,
          type: "request_needs_info",
          title: "نحتاج معلومات إضافية لطلبك",
          body: `يرجى تزويدنا بالمعلومات المطلوبة لإكمال طلب رقم ${request.request_number}`,
          reference_type: "request",
          reference_id: id,
        });
      }
    },
    onSuccess: () => {
      setNeedsInfoText("");
      setNeedsInfoFiles([]);
      setShowNeedsInfoDialog(false);
      queryClient.invalidateQueries({ queryKey: ["admin-request", id] });
      toast({ title: "تم إرسال طلب المعلومات للعميل" });
    },
    onError: (error: any) => {
      console.error("needsInfoMutation error:", error);
      toast({
        title: "حدث خطأ أثناء إرسال الطلب",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes?: string }) => {
      if (status === "cancelled" && id) {
        const { error: deactivateErr } = await supabase
          .from("assignments")
          .update({ is_active: false })
          .eq("request_id", id);
        if (deactivateErr) throw deactivateErr;
      }

      const updateData: any = { status };
      if (notes) updateData.admin_notes = notes;
      const { error } = await supabase.from("requests").update(updateData).eq("id", id);
      if (error) throw error;

      // Audit: approve fixed agreement (purchase) + keep generic status change trace
      if (user?.id) {
        const isFixedAgreementApproval =
          request?.source === "portfolio_purchase" && request?.status === "submitted" && status === "assigned";

        await supabase.from("audit_logs").insert({
          action: isFixedAgreementApproval ? "approve_fixed_agreement" : "request_status_change",
          entity_type: "request",
          entity_id: id,
          old_values: { status: request?.status, request_number: request?.request_number, source: request?.source },
          new_values: { status, request_number: request?.request_number, source: request?.source },
          user_id: user.id,
        });
      }

      // When marking as completed, credit the assigned freelancer
      if (status === "completed" && id && request?.assignment?.freelancer_id) {
        const freelancerId = request.assignment.freelancer_id;

        // Avoid double payments for the same request
        const { data: existingPayment, error: existingError } = await supabase
          .from("wallet_ledger")
          .select("id")
          .eq("user_id", freelancerId)
          .eq("reference_type", "request")
          .eq("reference_id", id)
          .maybeSingle();

        if (existingError) {
          console.error("wallet_ledger check error:", existingError);
        }

        if (!existingPayment) {
          const creditToEgp = pricingSettings?.creditToEgp || 50;
          const baseAmount =
            request.assignment.payment_amount ||
            (request.credits_cost || 0) * creditToEgp;
          const amount = Math.max(baseAmount, 0);

          if (amount > 0) {
            const { data: lastEntry, error: walletError } = await supabase
              .from("wallet_ledger")
              .select("balance_after")
              .eq("user_id", freelancerId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (walletError) {
              console.error("wallet_ledger fetch error:", walletError);
              throw walletError;
            }

            const previousBalance = lastEntry?.balance_after || 0;
            const newBalance = previousBalance + amount;

            const { error: insertError } = await supabase.from("wallet_ledger").insert({
              user_id: freelancerId,
              amount,
              balance_after: newBalance,
              type: "credit",
              reason: `دفعة مقابل الطلب ${request.request_number}`,
              reference_type: "request",
              reference_id: id,
            });

            if (insertError) {
              console.error("wallet_ledger insert error:", insertError);
              throw insertError;
            }

            const { data: freelancerProfile, error: profileError } = await supabase
              .from("freelancer_profiles")
              .select("total_earnings, completed_tasks")
              .eq("user_id", freelancerId)
              .maybeSingle();

            if (!profileError && freelancerProfile) {
              const { error: updateFreelancerError } = await supabase
                .from("freelancer_profiles")
                .update({
                  total_earnings: (freelancerProfile.total_earnings || 0) + amount,
                  completed_tasks: (freelancerProfile.completed_tasks || 0) + 1,
                })
                .eq("user_id", freelancerId);

              if (updateFreelancerError) {
                console.error("freelancer_profiles update error:", updateFreelancerError);
              }
            }

            const { error: completeAssignmentError } = await supabase
              .from("assignments")
              .update({
                is_active: false,
                completed_at: new Date().toISOString(),
              })
              .eq("id", request.assignment.id);

            if (completeAssignmentError) {
              console.error("assignments complete error:", completeAssignmentError);
            }

            // Telegram: QC approved for freelancer + completed for client
            try {
              // Notify freelancer (QC approved / payment added)
              await supabase.functions.invoke("telegram-send", {
                body: {
                  user_id: freelancerId,
                  message_type: "qc_approved",
                  data: {
                    title: request.title,
                    payment_amount: amount,
                  },
                  reference_type: "request",
                  reference_id: id,
                },
              });

              // Notify client that request is completed
              if (request.user_id) {
                await supabase.functions.invoke("telegram-send", {
                  body: {
                    user_id: request.user_id,
                    message_type: "request_completed",
                    data: {
                      request_number: request.request_number,
                      title: request.title,
                    },
                    reference_type: "request",
                    reference_id: id,
                  },
                });
              }
            } catch (telegramError) {
              console.error("Telegram qc_approved/request_completed error:", telegramError);
            }
          }
        }
      }

      // When QC rejects and asks for revision
      if (status === "revision_requested" && id && request?.assignment?.freelancer_id) {
        try {
          await supabase.functions.invoke("telegram-send", {
            body: {
              user_id: request.assignment.freelancer_id,
              message_type: "qc_rejected",
              data: {
                title: request.title,
              },
              reference_type: "request",
              reference_id: id,
            },
          });
        } catch (telegramError) {
          console.error("Telegram qc_rejected error:", telegramError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-request", id] });
      toast({ title: "تم التحديث بنجاح" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (freelancerId: string) => {
      if (!id || !request) throw new Error("الطلب غير موجود");

      // Deactivate existing assignments
      await supabase
        .from("assignments")
        .update({ is_active: false })
        .eq("request_id", id);

      const creditToEgp = pricingSettings?.creditToEgp || 50;
      let paymentAmount = (request.credits_cost || 1) * creditToEgp;
      let suggestedPayment: number | null = null;
      let pricingFactors: any = null;

      // Apply local smart pricing if available or admin override
      if (smartPricing) {
        paymentAmount = smartPricing.suggested_price;
        suggestedPayment = smartPricing.suggested_price;
        pricingFactors = { ...smartPricing, source: "local_smart_pricing" };
      }

      if (typeof customPaymentAmount === "number" && customPaymentAmount > 0) {
        paymentAmount = customPaymentAmount;
      }

      const { error } = await supabase.from("assignments").insert({
        request_id: id,
        freelancer_id: freelancerId,
        payment_amount: paymentAmount,
        suggested_payment: suggestedPayment,
        pricing_factors: pricingFactors,
      });
      if (error) throw error;
      
      // Update request status
      await supabase.from("requests").update({ status: "assigned" }).eq("id", id);
      
      // Send in-app notification to freelancer
      await supabase.from("notifications").insert({
        user_id: freelancerId,
        type: "assignment",
        title: "تم تعيينك لمهمة جديدة",
        body: `تم تعيينك للعمل على الطلب: ${request?.title}`,
        reference_type: "request",
        reference_id: id,
      });

      // Send Telegram notification to freelancer (if linked)
      try {
        await supabase.functions.invoke("telegram-send", {
          body: {
            user_id: freelancerId,
            message_type: "task_assigned",
            data: {
              title: request?.title,
              request_number: request?.request_number,
              deadline: request?.deadline,
              payment_amount: paymentAmount,
            },
            reference_type: "request",
            reference_id: id,
          },
        });
      } catch (telegramError) {
        console.error("Telegram task_assigned error:", telegramError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-request", id] });
      toast({ title: "تم التعيين بنجاح" });
      setShowAssignDialog(false);
      setSelectedFreelancer("");
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <div className="text-center py-16">
          <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">الطلب غير موجود</p>
          <Button onClick={() => navigate("/admin/requests/queue")}>
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = statusLabels[request.status] || { label: request.status, color: "bg-gray-100" };
  const files = (request.files as Array<{ name: string; size: number; type: string; url?: string; path?: string }>) || [];

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowRight className="w-4 h-4 ml-2" />
            رجوع
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">طلب #{request.request_number}</h1>
            <p className="text-muted-foreground">{request.title}</p>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  تفاصيل الطلب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">العنوان</Label>
                  <p className="font-medium">{request.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الوصف</Label>
                  <p className="whitespace-pre-wrap">{request.description || "لا يوجد وصف"}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground">التصنيف</Label>
                    <p className="font-medium">{request.categories?.name_ar || "غير محدد"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الحجم</Label>
                    <p className="font-medium capitalize">{request.size}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الكريديت</Label>
                    <p className="font-semibold text-primary">{request.credits_cost}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      {request.source === "portfolio_purchase" ? "السعر المتفق عليه (ج.م)" : "السعر التقريبي (ج.م)"}
                    </Label>
                    <p className="font-semibold text-success">
                      {request.source === "portfolio_purchase"
                        ? `${(request.agreed_price_egp || 0).toLocaleString("ar-EG")} ج.م`
                        : `${((request.credits_cost || 0) * (pricingSettings?.creditToEgp || 50)).toLocaleString("ar-EG")} ج.م`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">تاريخ الإنشاء</Label>
                    <p>{safeFormatDate(request.created_at, "d MMMM yyyy - h:mm a")}</p>
                  </div>
                  {request.deadline && (
                    <div>
                      <Label className="text-muted-foreground">الموعد النهائي</Label>
                      <p>{safeFormatDate(request.deadline)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fixed agreement brief */}
            {requestBrief && <RequestBriefCard brief={requestBrief} />}

            {/* Files */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    الملفات المرفقة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FilePreview 
                    files={files.map((f) => ({
                      name: f.name,
                      size: f.size,
                      type: f.type,
                      path: f.path || f.url,
                    }))} 
                    bucket="request-files"
                    title="ملفات الطلب"
                  />
                </CardContent>
              </Card>
            )}

            {/* Deliveries */}
            {deliveries && deliveries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>التسليمات ({deliveries.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deliveries.map((delivery) => (
                      <div key={delivery.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">تسليم #{delivery.revision_number}</Badge>
                          <Badge className={
                            delivery.status === "approved" ? "bg-green-100 text-green-700" :
                            delivery.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }>
                            {delivery.status === "approved" ? "مقبول" :
                             delivery.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                          </Badge>
                        </div>
                        {delivery.notes && <p className="text-sm">{delivery.notes}</p>}
                        {delivery.delivery_links && (delivery.delivery_links as any[]).length > 0 && (
                          <div className="mt-2">
                            <DeliveryLinksDisplay links={delivery.delivery_links as DeliveryLink[]} />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {safeFormatDate(delivery.created_at, "d MMMM yyyy - h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Requests & Replies */}
            {infoRequests && infoRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    طلبات المعلومات الإضافية ({infoRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {infoRequests.map((infoReq: any) => (
                      <div key={infoReq.id} className="border rounded-lg overflow-hidden">
                        {/* Request Header */}
                        <div className="bg-amber-50 border-b p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={
                                  infoReq.status === "answered" ? "default" :
                                  infoReq.status === "pending" ? "secondary" : "outline"
                                }>
                                  {infoReq.status === "answered" ? "تم الرد" :
                                   infoReq.status === "pending" ? "في انتظار الرد" : "ملغي"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  بواسطة: {infoReq.admin_name}
                                </span>
                              </div>
                              {infoReq.title && (
                                <h4 className="font-medium text-sm mb-1">{infoReq.title}</h4>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {safeFormatDate(infoReq.created_at, "d MMM yyyy - h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{infoReq.message}</p>
                          {infoReq.attachments && Array.isArray(infoReq.attachments) && infoReq.attachments.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-2">المرفقات:</p>
                              <FilePreview
                                files={infoReq.attachments.map((att: any) => ({
                                  name: att.name,
                                  size: att.size,
                                  type: att.type,
                                  path: att.path || att.url,
                                }))}
                                bucket="request-files"
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Client Replies */}
                        {infoReq.replies && infoReq.replies.length > 0 && (
                          <div className="p-4 space-y-3 bg-white">
                            <h5 className="text-sm font-medium text-muted-foreground">ردود العميل:</h5>
                            {infoReq.replies.map((reply: any) => (
                              <div key={reply.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <Badge className="bg-green-600 text-white">رد العميل</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {safeFormatDate(reply.created_at, "d MMM yyyy - h:mm a")}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                                {reply.attachments && Array.isArray(reply.attachments) && reply.attachments.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs text-muted-foreground mb-2">مرفقات:</p>
                                    <FilePreview
                                      files={reply.attachments.map((att: any) => ({
                                        name: att.name,
                                        size: att.size,
                                        type: att.type,
                                        path: att.path || att.url,
                                      }))}
                                      bucket="request-files"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Tasks - Multi-Freelancer Assignment */}
            <ProjectTasksManager requestId={id!} requestTitle={request.title} />

            {/* Chat with Client */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  المحادثة مع العميل
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AdminChatBox requestId={id!} />
              </CardContent>
            </Card>

            {/* Admin Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  ملاحظات الإدارة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="أضف ملاحظات..."
                  value={adminNotes || request.admin_notes || ""}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={() => updateStatusMutation.mutate({ status: request.status, notes: adminNotes })}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  حفظ الملاحظات
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  العميل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{request.client?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{request.client?.email}</p>
                  {request.client?.phone && (
                    <p className="text-sm text-muted-foreground">{request.client.phone}</p>
                  )}
                </div>

                {clientStats && (
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">إجمالي المدفوعات</span>
                      <span className="font-semibold">
                        {clientStats.totalPaidEgp.toLocaleString("ar-EG")} ج.م
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الباقة الحالية</span>
                      <span className="font-semibold">
                        {(clientStats.subscription?.plans as any)?.name || "لا توجد باقة"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">رصيد الكريديت الحالي</span>
                      <span className="font-semibold">{clientStats.currentCredits} كريديت</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الكريديت المستخدم لهذا الطلب</span>
                      <span className="font-semibold">{clientStats.requestCreditsUsed} كريديت</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Assignment */}
            {request.assignment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    التعيين الحالي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{request.assignedFreelancer?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{request.assignedFreelancer?.email}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    تم التعيين: {safeFormatDate(request.assignment.assigned_at)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Assign Freelancer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  تعيين فريلانسر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    setSelectedFreelancer("");
                    setShowAllFreelancers(false);
                    const creditToEgp = pricingSettings?.creditToEgp || 50;
                    const basePrice = (request.credits_cost || 0) * creditToEgp;
                    setCustomPaymentAmount(basePrice || "");
                    setSmartPricing(null);
                    setShowAssignDialog(true);
                  }}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4 ml-2" />
                  {request.assignment ? "إعادة التعيين" : "تعيين فريلانسر"}
                </Button>
                {request.categories && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    سيظهر الفريلانسرز المتخصصين في: {request.categories.name_ar}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Update Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  تحديث الحالة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={newStatus || request.status} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={!newStatus || newStatus === request.status || updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ status: newStatus })}
                >
                  {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  تحديث
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>إجراءات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {request.status === "submitted" && (
                  <Button
                    className="w-full"
                    disabled={request.source === "portfolio_purchase" && !requestBrief}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        status: request.source === "portfolio_purchase" ? "assigned" : "approved",
                      })
                    }
                  >
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    اعتماد الطلب
                  </Button>
                )}

                {request.status === "submitted" && request.source === "portfolio_purchase" && !requestBrief && (
                  <p className="text-xs text-muted-foreground text-center">
                    لا يمكن اعتماد الاتفاق الثابت قبل وصول الـ Brief من العميل.
                  </p>
                )}
                {request.status === "submitted" && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setShowNeedsInfoDialog(true)}
                  >
                    <MessageSquare className="w-4 h-4 ml-2" />
                    طلب معلومات إضافية
                  </Button>
                )}
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => updateStatusMutation.mutate({ status: "cancelled" })}
                >
                  <XCircle className="w-4 h-4 ml-2" />
                  إلغاء الطلب
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعيين فريلانسر للطلب</DialogTitle>
          </DialogHeader>

          <div className="mb-4 space-y-3 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">تسعير المهمة</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>السعر التقريبي حسب الكريديت</span>
              <span className="font-semibold">
                {((request.credits_cost || 0) * (pricingSettings?.creditToEgp || 50)).toLocaleString("ar-EG")} ج.م
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] items-center">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">سعر الفريلانسر (ج.م)</Label>
                <Input
                  type="number"
                  min={0}
                  value={customPaymentAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomPaymentAmount(v === "" ? "" : Number(v));
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-6"
                onClick={() => {
                  const result = calculateSmartPrice({
                    requestSize: request.size,
                    requestCredits: request.credits_cost || 1,
                    categoryName: request.categories?.name_ar || "عام",
                    creditToEgp: pricingSettings?.creditToEgp || 50,
                    taskTitle: request.title,
                    taskDescription: request.description || "",
                  });
                  setSmartPricing({ ...result, source: "local" });
                  setCustomPaymentAmount(result.suggested_price);
                  toast({ title: "تم اقتراح سعر ذكي للمهمة" });
                }}
              >
                تسعير خوارزمي
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="mt-6"
                disabled={isAiPricing}
                onClick={async () => {
                  setIsAiPricing(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("ai-smart-pricing", {
                      body: { requestId: id },
                    });
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    setSmartPricing({ ...data, source: "ai" });
                    setCustomPaymentAmount(data.suggested_price);
                    toast({ title: "🤖 تم اقتراح سعر ذكي بالـ AI" });
                  } catch (err: any) {
                    console.error("AI pricing error:", err);
                    toast({ title: "خطأ في التسعير الذكي", description: err.message, variant: "destructive" });
                  } finally {
                    setIsAiPricing(false);
                  }
                }}
              >
                {isAiPricing ? <Loader2 className="w-4 h-4 animate-spin" /> : "🤖 تسعير AI"}
              </Button>
            </div>
            {smartPricing && (
              <div className="space-y-2 bg-background rounded-md p-3 border">
                <div className="flex items-center gap-2">
                  <Badge variant={smartPricing.source === "ai" ? "default" : "secondary"}>
                    {smartPricing.source === "ai" ? "🤖 AI" : "⚡ خوارزمي"}
                  </Badge>
                  <span className="text-lg font-bold text-primary">{smartPricing.suggested_price} ج.م</span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>الحد الأدنى: {smartPricing.min_price} ج.م</span>
                  <span>الحد الأقصى: {smartPricing.max_price} ج.م</span>
                </div>
                {smartPricing.complexity_level && (
                  <div className="flex gap-4 text-xs">
                    <span>التعقيد: <strong>{smartPricing.complexity_level}</strong></span>
                    {smartPricing.estimated_hours && (
                      <span>الوقت المتوقع: <strong>{smartPricing.estimated_hours} ساعة</strong></span>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {smartPricing.reasoning}
                </p>
              </div>
            )}
          </div>

          {/* Auto-suggest freelancers */}
          <div className="mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isLoadingSuggestions}
              onClick={async () => {
                setIsLoadingSuggestions(true);
                try {
                  const { data, error } = await supabase.functions.invoke("suggest-freelancer-assignment", {
                    body: { requestId: id },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  setSuggestedFreelancers(data.suggestions || []);
                  toast({ title: `🎯 تم اقتراح ${data.suggestions?.length || 0} فريلانسر` });
                } catch (err: any) {
                  console.error("Suggest assignment error:", err);
                  toast({ title: "خطأ في اقتراح التعيين", description: err.message, variant: "destructive" });
                } finally {
                  setIsLoadingSuggestions(false);
                }
              }}
            >
              {isLoadingSuggestions ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Users className="w-4 h-4 ml-2" />}
              🎯 اقتراح تعيين تلقائي
            </Button>
            {suggestedFreelancers.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">الاقتراحات الذكية:</p>
                {suggestedFreelancers.map((s: any, idx: number) => (
                  <div
                    key={s.user_id}
                    onClick={() => setSelectedFreelancer(s.user_id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all text-sm ${
                      selectedFreelancer === s.user_id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">#{idx + 1}</Badge>
                        <span className="font-medium">{s.name}</span>
                        {s.category_match && <Badge variant="secondary" className="text-xs">متخصص</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{s.stars}</span>
                        <span>•</span>
                        <span>{s.completed_tasks} مهمة</span>
                        <span>•</span>
                        <span>{s.active_tasks} نشطة</span>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.reasons.map((r: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {request.categories && (
            <div className="p-3 bg-primary/5 rounded-lg mb-4">
              <p className="text-sm">
                <strong>تصنيف الطلب:</strong> {request.categories.name_ar}
              </p>

              {hasCategoryMatch ? (
                <p className="text-xs text-muted-foreground mt-1">
                  يظهر {categoryFreelancers.length} فريلانسر متخصص (مرتبة حسب النجوم)
                </p>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-orange-600">
                    لا يوجد فريلانسرز متخصصين في هذا المجال.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAllFreelancers(true)}
                  >
                    عرض جميع الفريلانسرز
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {visibleFreelancers?.map((f: any) => {
              const cats = (f.categories || [])
                .map((cid: string) => categoriesMap?.[cid])
                .filter(Boolean) as string[];

              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFreelancer(f.user_id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedFreelancer === f.user_id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{f.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{f.email}</p>

                      {cats.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {cats.slice(0, 4).map((label) => (
                            <Badge key={label} variant="secondary">
                              {label}
                            </Badge>
                          ))}
                          {cats.length > 4 && (
                            <Badge variant="outline">+{cats.length - 4}</Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-left shrink-0">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>{f.stars || 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {f.completed_tasks || 0} مهمة مكتملة
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {f.is_available ? "متاح" : "غير متاح"}
                      </p>
                    </div>
                  </div>

                  {f.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {f.bio}
                    </p>
                  )}
                </div>
              );
            })}

            {(!visibleFreelancers || visibleFreelancers.length === 0) && (
              <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                {request.categories && !showAllFreelancers ? (
                  <p className="text-muted-foreground">
                    لا يوجد فريلانسرز متخصصين في "{request.categories.name_ar}"
                  </p>
                ) : (
                  <p className="text-muted-foreground">لا يوجد فريلانسرز معتمدين بعد</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              إلغاء
            </Button>
            <Button
              disabled={!selectedFreelancer || assignMutation.isPending}
              onClick={() => assignMutation.mutate(selectedFreelancer)}
            >
              {assignMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              تعيين الفريلانسر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Needs Info Dialog */}
      <Dialog open={showNeedsInfoDialog} onOpenChange={setShowNeedsInfoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>طلب معلومات إضافية من العميل</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">
                ما هي المعلومات أو الملفات المطلوبة من العميل؟
              </Label>
              <Textarea
                rows={4}
                value={needsInfoText}
                onChange={(e) => setNeedsInfoText(e.target.value)}
                placeholder="اكتب للعميل ما الذي تحتاجه لإكمال الطلب بالتفصيل..."
              />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                مرفقات (اختياري)
              </Label>
              <FileUploadAdvanced
                folder={`request-${id}-needs-info-admin`}
                bucket="request-files"
                maxFiles={5}
                onFilesChange={(files) => setNeedsInfoFiles(files as any[])}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNeedsInfoDialog(false)}>
              إلغاء
            </Button>
            <Button
              disabled={!needsInfoText.trim() || needsInfoMutation.isPending}
              onClick={() => needsInfoMutation.mutate()}
            >
              {needsInfoMutation.isPending && (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              )}
              إرسال الطلب للعميل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
