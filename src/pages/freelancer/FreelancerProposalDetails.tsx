import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryLinksInput, DeliveryLinksDisplay, type DeliveryLink } from "@/components/delivery/DeliveryLinksInput";
import { ArrowRight, Calendar, DollarSign, Clock, Loader2, Upload, CheckCircle2, FileText, Tag } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", variant: "secondary" },
  accepted: { label: "مقبول", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

export default function FreelancerProposalDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryLinks, setDeliveryLinks] = useState<DeliveryLink[]>([]);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ["proposal-detail", id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from("marketplace_proposals")
        .select("*")
        .eq("id", id)
        .eq("freelancer_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: request } = useQuery({
    queryKey: ["proposal-request", proposal?.request_id],
    queryFn: async () => {
      if (!proposal?.request_id) return null;
      const { data, error } = await supabase
        .from("requests")
        .select("*, categories(name_ar)")
        .eq("id", proposal.request_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!proposal?.request_id,
  });

  const { data: assignment } = useQuery({
    queryKey: ["proposal-assignment", proposal?.request_id, user?.id],
    queryFn: async () => {
      if (!proposal?.request_id || !user) return null;
      const { data } = await supabase
        .from("assignments")
        .select("*")
        .eq("request_id", proposal.request_id)
        .eq("freelancer_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!proposal?.request_id && !!user,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["proposal-deliveries", assignment?.id],
    queryFn: async () => {
      if (!assignment?.id) return [];
      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .eq("assignment_id", assignment.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!assignment?.id,
  });

  const submitDelivery = useMutation({
    mutationFn: async () => {
      if (!user || !assignment || !request) throw new Error("بيانات ناقصة");

      const validLinks = deliveryLinks.filter((l) => l.url.trim());
      if (validLinks.length === 0) throw new Error("يجب إضافة رابط واحد على الأقل");

      const nextRevision = (deliveries[0]?.revision_number ?? 0) + 1;

      const { error } = await supabase.from("deliveries").insert({
        assignment_id: assignment.id,
        request_id: request.id,
        freelancer_id: user.id,
        notes: deliveryNotes.trim() || null,
        files: null,
        delivery_links: validLinks as unknown as Json,
        revision_number: nextRevision,
        status: "pending",
      });
      if (error) throw error;

      await supabase.from("requests").update({ status: "ready_for_qc" }).eq("id", request.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-deliveries"] });
      toast({ title: "تم إرسال التسليم ✅" });
      setDeliveryNotes("");
      setDeliveryLinks([]);
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="تفاصيل العرض">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!proposal) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="تفاصيل العرض">
        <div className="text-center py-16 text-muted-foreground">لم يتم العثور على هذا العرض</div>
      </DashboardLayout>
    );
  }

  const st = statusMap[proposal.status] || statusMap.pending;
  const isAccepted = proposal.status === "accepted";

  return (
    <DashboardLayout sidebar={<FreelancerSidebar />} title="تفاصيل العرض" subtitle="عرضك على المشروع">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/freelancer/proposals">
            <ArrowRight className="w-4 h-4" />
            العودة للعروض
          </Link>
        </Button>
      </div>

      {/* Freelancer Guidelines */}
      <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2 text-sm">
        <p className="font-semibold text-primary flex items-center gap-2">
          <FileText className="w-4 h-4" />
          ملاحظات مهمة
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>⚠️ يجب أن تكون جميع روابط Google Drive <strong>عامة</strong> (Anyone with the link)</li>
          <li>لو العميل مش مديك تفاصيل كافية، نفّذ رؤيتك المهنية وسلّم حاجة احترافية تعبّر عن الفكرة</li>
          <li>قدّم شغل بسيط وشيك يوصل الفكرة بطريقة كويسة ومحترفة</li>
          <li>لو التفاصيل قليلة، اشتغل بإبداعك مع الحفاظ على البساطة والاحترافية</li>
        </ul>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-2">
                <CardTitle className="text-xl">{request?.title || "مشروع"}</CardTitle>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {request?.description && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap text-muted-foreground">{request.description}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                {(request as any)?.categories?.name_ar && (
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-primary" />
                    {(request as any).categories.name_ar}
                  </span>
                )}
                {request?.size && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    {request.size === "micro" ? "صغيرة جداً" : request.size === "small" ? "صغيرة" : request.size === "medium" ? "متوسطة" : "كبيرة"}
                  </span>
                )}
                {request?.deadline && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary" />
                    {new Date(request.deadline).toLocaleDateString("ar-EG")}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {isAccepted && assignment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  تسليم المشروع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DeliveryLinksInput
                  links={deliveryLinks}
                  onChange={setDeliveryLinks}
                  disabled={submitDelivery.isPending}
                />
                <Textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="ملاحظات على التسليم (اختياري)"
                  className="min-h-[100px]"
                  disabled={submitDelivery.isPending}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => submitDelivery.mutate()}
                    disabled={submitDelivery.isPending || deliveryLinks.filter((l) => l.url.trim()).length === 0}
                    className="gap-2"
                  >
                    {submitDelivery.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    إرسال التسليم
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {deliveries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  التسليمات السابقة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deliveries.map((d: any) => (
                  <div key={d.id} className="p-4 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Revision {d.revision_number}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                    {d.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{d.notes}</p>}
                    {d.delivery_links && (
                      <DeliveryLinksDisplay links={d.delivery_links as DeliveryLink[]} />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">عرضك</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {proposal.proposed_price && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    السعر المقترح
                  </span>
                  <span className="font-semibold">{proposal.proposed_price} ج.م</span>
                </div>
              )}
              {proposal.proposed_days && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    مدة التنفيذ
                  </span>
                  <span className="font-semibold">{proposal.proposed_days} يوم</span>
                </div>
              )}
              {proposal.cover_letter && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">خطاب التقديم</p>
                  <p className="text-sm whitespace-pre-wrap">{proposal.cover_letter}</p>
                </div>
              )}
              {proposal.admin_notes && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">ملاحظات الإدارة</p>
                  <p className="text-sm bg-muted/50 p-2 rounded">{proposal.admin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {isAccepted && !assignment && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 text-sm text-center">
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">تم قبول عرضك!</p>
                <p className="text-muted-foreground mt-1">سيتم تعيينك قريباً من الإدارة</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
