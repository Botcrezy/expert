import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { ChatBox } from "@/components/chat/ChatBox";
import { FilePreview } from "@/components/files/FilePreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Json } from "@/integrations/supabase/types";
import { RequestBriefCard, type RequestBrief } from "@/components/requests/RequestBriefCard";
import { Calendar, Clock, Loader2, Upload, CheckCircle2, FolderOpen, MessageCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useRequestInfo } from "@/hooks/useRequestInfo";
import { DeliveryLinksInput, DeliveryLinksDisplay, type DeliveryLink } from "@/components/delivery/DeliveryLinksInput";


export default function FreelancerTaskDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryLinks, setDeliveryLinks] = useState<DeliveryLink[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: assignment, isLoading: assignmentLoading, refetch: refetchAssignment } = useQuery({
    queryKey: ["freelancer-assignment", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;

      // 1) Primary: route param is assignment.id
      const baseSelect = `*,
           requests(
             id,
             title,
             description,
             request_number,
             status,
             deadline,
             size,
             files,
             source,
             agreed_price_egp
           )`;

      const { data: byAssignmentId, error: err1 } = await supabase
        .from("assignments")
        .select(baseSelect)
        .eq("id", id)
        .eq("freelancer_id", user.id)
        .maybeSingle();

      if (err1) throw err1;
      if (byAssignmentId) return byAssignmentId;

      // 2) Fallback: sometimes links might pass request_id instead of assignment.id
      const { data: byRequestId, error: err2 } = await supabase
        .from("assignments")
        .select(baseSelect)
        .eq("request_id", id)
        .eq("freelancer_id", user.id)
        .maybeSingle();

      if (err2) throw err2;
      return byRequestId;
    },
    enabled: !!id && !!user,
  });


  const request = (assignment as any)?.requests as any | null;
  const requestId = assignment?.request_id ?? request?.id;

  const isTaskLocked =
    request?.status === "completed" ||
    Boolean(assignment?.completed_at) ||
    assignment?.is_active === false;

  const { data: requestBrief } = useQuery({
    queryKey: ["request-brief", requestId],
    queryFn: async () => {
      if (!requestId) return null;
      const { data, error } = await supabase
        .from("request_briefs")
        .select("*")
        .eq("request_id", requestId)
        .maybeSingle();
      if (error) throw error;
      return (data as RequestBrief) || null;
    },
    enabled: !!requestId,
  });

  const { infoRequests, isLoading: infoLoading } = useRequestInfo(requestId);


  const {
    data: deliveries = [],
    isLoading: deliveriesLoading,
    refetch: refetchDeliveries,
  } = useQuery({
    queryKey: ["deliveries", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .eq("assignment_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const nextRevisionNumber = useMemo(() => {
    const latest = deliveries?.[0]?.revision_number ?? 0;
    return latest + 1;
  }, [deliveries]);

  const startWork = async () => {
    if (!assignment?.id) return;

    if (isTaskLocked) {
      toast({
        title: "المهمة مكتملة",
        description: "لا يمكن بدء العمل أو تنفيذ أي إجراء بعد اكتمال المهمة.",
        variant: "destructive",
      });
      return;
    }

    if (["submitted", "needs_info"].includes(request?.status)) {
      toast({
        title: "بانتظار موافقة الإدارة",
        description: "لا يمكن بدء العمل قبل مراجعة الإدارة للطلب.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("assignments")
      .update({ started_at: new Date().toISOString() })
      .eq("id", assignment.id);

    if (error) {
      toast({ title: "تعذر بدء العمل", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "تم بدء العمل ✓", description: "يمكنك الآن إرسال أول تسليم." });
    refetchAssignment();
  };

  const submitDelivery = async () => {
    if (!user || !assignment || !requestId) return;

    if (isTaskLocked) {
      toast({
        title: "المهمة مكتملة",
        description: "لا يمكن إرسال تسليمات بعد اكتمال المهمة.",
        variant: "destructive",
      });
      return;
    }
    try {
      const validLinks = deliveryLinks.filter((l) => l.url.trim());
      if (validLinks.length === 0) {
        toast({ title: "يجب إضافة رابط واحد على الأقل", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from("deliveries").insert({
        assignment_id: assignment.id,
        request_id: requestId,
        freelancer_id: user.id,
        notes: deliveryNotes.trim() || null,
        files: null,
        delivery_links: validLinks as unknown as Json,
        revision_number: nextRevisionNumber,
        status: "pending",
      });

      if (error) throw error;

      // Move request to QC stage so client doesn't see it until approved
      await supabase.from("requests").update({ status: "ready_for_qc" }).eq("id", requestId);
      try {
        // Notify freelancer that delivery was submitted
        await supabase.functions.invoke("telegram-send", {
          body: {
            user_id: user.id,
            message_type: "delivery_submitted",
            data: {
              title: request.title,
              request_number: request.request_number,
            },
            reference_type: "request",
            reference_id: requestId,
          },
        });

        // Notify admin that a delivery is pending QC (important event)
        const { notifyTelegramAdmin } = await import("@/lib/telegramAdminNotify");
        await notifyTelegramAdmin({
          eventKey: "admin_delivery_pending_qc",
          reference: { type: "request", id: requestId },
          adminPath: `/admin/requests/${requestId}`,
          data: {
            request_number: request.request_number,
            title: request.title,
          },
        });
      } catch (telegramError) {
        console.error("Telegram delivery_submitted/admin_pending_qc error:", telegramError);
      }

      toast({
        title: "تم إرسال التسليم ✓",
        description: "سيتم مراجعته من الجودة ثم يصل للعميل.",
      });

      setDeliveryNotes("");
      setDeliveryLinks([]);
      await refetchDeliveries();
    } catch (e: any) {
      toast({ title: "تعذر إرسال التسليم", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDeadline = (deadline?: string | null) => {
    if (!deadline) return "لا يوجد موعد";
    return format(new Date(deadline), "dd MMM yyyy", { locale: ar });
  };

  if (assignmentLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="تفاصيل المهمة">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!assignment || !request) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="تفاصيل المهمة">
        <div className="card-elevated p-6">لا يمكن العثور على هذه المهمة.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title={request.title}
      subtitle={request.request_number}
    >
      {/* Freelancer Guidelines */}
      <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2 text-sm">
        <p className="font-semibold text-primary flex items-center gap-2">
          <FileText className="w-4 h-4" />
          ملاحظات مهمة
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>⚠️ يجب أن تكون جميع روابط Google Drive <strong>عامة</strong> (Anyone with the link)</li>
          <li>لو العميل مش مديك تفاصيل كافية، اشتغل بإبداعك وسلّم حاجة احترافية تعبّر عن الفكرة</li>
          <li>قدّم شغل بسيط وشيك يوصل الفكرة بطريقة كويسة ومحترفة</li>
        </ul>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Task Summary */}
          <div className="card-elevated p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">ملخص المهمة</h2>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{request.description || "—"}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDeadline(request.deadline)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {request.size === "micro"
                    ? "صغيرة جداً"
                    : request.size === "small"
                      ? "صغيرة"
                      : request.size === "medium"
                        ? "متوسطة"
                        : "كبيرة"}
                </span>
              </div>
              <div className="text-sm font-semibold text-success">
                {assignment.payment_amount} ج.م
              </div>
            </div>

            {!assignment.started_at && (
              <div className="mt-6">
                <Button onClick={startWork} className="gap-2">
                  <Clock className="w-4 h-4" />
                  بدء العمل
                </Button>
              </div>
            )}
           </div>

           {/* Fixed agreement brief */}
           {requestBrief && <RequestBriefCard brief={requestBrief} />}

           {/* Client Files */}
           {request.files && (request.files as any[]).length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                ملفات العميل
              </h3>
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

          {/* Read-only info requests between admin and client */}
          {requestId && !infoLoading && infoRequests.length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                طلبات معلومات بين الفريق والعميل
              </h3>
              <div className="space-y-4">
                {infoRequests.map((info) => (
                  <div
                    key={info.id}
                    className="rounded-xl border border-border bg-muted/40 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium text-foreground">
                          {info.title || "طلب معلومات من الفريق"}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {info.message}
                    </p>

                    {Array.isArray(info.attachments) &&
                      (info.attachments as any[]).length > 0 && (
                        <div className="space-y-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            مرفقات من الفريق
                          </p>
                          <FilePreview
                            files={(info.attachments as any[]).map((f: any) => ({
                              name: f.name,
                              size: f.size,
                              type: f.type,
                              path: f.url || f.path,
                            }))}
                            bucket="request-files"
                            title="مرفقات الفريق"
                          />
                        </div>
                      )}

                    {info.reply && (
                      <div className="mt-3 border-t border-border pt-3 space-y-2">
                        <p className="text-xs font-medium text-foreground">
                          ردّ العميل
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {info.reply.message}
                        </p>
                        {Array.isArray(info.reply.attachments) &&
                          (info.reply.attachments as any[]).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                مرفقات من العميل
                              </p>
                              <FilePreview
                                files={(info.reply.attachments as any[]).map((f: any) => ({
                                  name: f.name,
                                  size: f.size,
                                  type: f.type,
                                  path: f.url || f.path,
                                }))}
                                bucket="request-files"
                                title="مرفقات العميل"
                              />
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}


           {/* Tabs */}
           <Tabs defaultValue={isTaskLocked ? "history" : "delivery"} className="space-y-4">
             <TabsList>
               {!isTaskLocked && (
                 <TabsTrigger value="delivery" className="gap-2">
                   <Upload className="w-4 h-4" />
                   تسليم
                 </TabsTrigger>
               )}
               <TabsTrigger value="history" className="gap-2">
                 <CheckCircle2 className="w-4 h-4" />
                 تسليمات سابقة
               </TabsTrigger>
               {!isTaskLocked && (
                 <TabsTrigger value="chat" className="gap-2">
                   المحادثة
                 </TabsTrigger>
               )}
             </TabsList>

             {!isTaskLocked && (
               <TabsContent value="delivery" className="space-y-4">
                 <div className="card-elevated p-6 space-y-4">
                   <h3 className="font-semibold text-foreground">إرسال تسليم (Revision {nextRevisionNumber})</h3>

                   <Textarea
                     value={deliveryNotes}
                     onChange={(e) => setDeliveryNotes(e.target.value)}
                     placeholder="ملاحظات على التسليم (اختياري)"
                     className="min-h-[120px]"
                   />

                    <DeliveryLinksInput
                      links={deliveryLinks}
                      onChange={setDeliveryLinks}
                      disabled={submitting}
                    />

                   <div className="flex items-center justify-end">
                     <Button
                       onClick={submitDelivery}
                       disabled={submitting || !assignment.started_at || deliveryLinks.filter(l => l.url.trim()).length === 0}
                       className="gap-2"
                     >
                       {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                       إرسال التسليم
                     </Button>
                   </div>

                   {!assignment.started_at && (
                     <p className="text-sm text-muted-foreground">
                       يجب الضغط على "بدء العمل" أولاً قبل إرسال التسليم.
                     </p>
                   )}
                 </div>
               </TabsContent>
             )}

             <TabsContent value="history">
               <div className="card-elevated p-6">
                 {deliveriesLoading ? (
                   <div className="flex items-center justify-center py-10">
                     <Loader2 className="w-6 h-6 animate-spin text-primary" />
                   </div>
                 ) : deliveries.length === 0 ? (
                   <p className="text-muted-foreground">لا توجد تسليمات حتى الآن.</p>
                 ) : (
                   <div className="space-y-3">
                     {deliveries.map((d: any) => (
                       <div key={d.id} className="p-4 rounded-lg bg-muted/40 border border-border">
                         <div className="flex items-center justify-between">
                           <div className="text-sm font-medium text-foreground">
                             Revision {d.revision_number}
                           </div>
                           <div className="text-xs text-muted-foreground">{format(new Date(d.created_at), "d MMM, h:mm a", { locale: ar })}</div>
                         </div>
                         {d.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{d.notes}</p>}
                          {d.delivery_links && Array.isArray(d.delivery_links) && d.delivery_links.length > 0 && (
                            <DeliveryLinksDisplay links={d.delivery_links as DeliveryLink[]} />
                          )}
                          {Array.isArray(d.files) && d.files.length > 0 && (
                            <div className="mt-3">
                              <FilePreview 
                                files={(d.files as any[]).map((f: any) => ({
                                  name: f.name || 'ملف',
                                  size: f.size,
                                  type: f.type,
                                  path: f.path || f.url
                                }))} 
                                bucket="request-files"
                                title="ملفات التسليم"
                              />
                            </div>
                          )}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </TabsContent>

             {!isTaskLocked && (
               <TabsContent value="chat">
                 {requestId ? (
                   <ChatBox requestId={requestId} />
                 ) : (
                   <div className="card-elevated p-6">لا يمكن فتح المحادثة بدون رقم الطلب.</div>
                 )}
               </TabsContent>
             )}

             {isTaskLocked && (
               <div className="card-elevated p-6 text-sm text-muted-foreground">
                 هذه المهمة مكتملة—تم إغلاق التسليم والمحادثة.
               </div>
             )}
           </Tabs>
        </div>

        <div className="space-y-6">
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-3">حالة العمل</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>تم الإسناد</span>
                <span className="font-mono">{format(new Date(assignment.assigned_at), "dd/MM")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>بدأ العمل</span>
                <span className="font-mono">{assignment.started_at ? format(new Date(assignment.started_at), "dd/MM") : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>تم الإكمال</span>
                <span className="font-mono">{assignment.completed_at ? format(new Date(assignment.completed_at), "dd/MM") : "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
